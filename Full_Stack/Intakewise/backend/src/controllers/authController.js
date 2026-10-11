import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import pool from "../config/db.js";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

async function createTokens(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
  }

  const sessionId = randomUUID();
  await pool.query(
    "INSERT INTO auth_sessions (id, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '7 days')",
    [sessionId, user.id]
  );
  const identity = { id: user.id, email: user.email, role: user.role || "user" };
  return {
    accessToken: jwt.sign({ ...identity, tokenType: "access" }, secret, { expiresIn: "15m" }),
    refreshToken: jwt.sign({ ...identity, tokenType: "refresh" }, secret, { expiresIn: "7d", jwtid: sessionId }),
  };
}

export async function register(req, res) {
  const input = credentialsSchema.extend({
    name: z.string().trim().max(100).optional(),
    timezone: z.string().trim().max(100).optional(),
  }).parse(req.body);
  const passwordHash = await bcrypt.hash(input.password, 12);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, timezone, name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, timezone, name, role`,
    [input.email, passwordHash, input.timezone || null, input.name || null]
  );
  res.status(201).json({ user: result.rows[0], ...await createTokens(result.rows[0]) });
}

export async function login(req, res) {
  const { email, password } = credentialsSchema.parse(req.body);
  const result = await pool.query(
    `SELECT id, email, password_hash, timezone, name, role FROM users WHERE email = $1`,
    [email]
  );

  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: "Invalid credentials" });

  const { password_hash: _passwordHash, ...publicUser } = user;
  res.json({ user: publicUser, ...await createTokens(user) });
}

export async function refresh(req, res) {
  const parsed = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
  let claims;
  try {
    claims = jwt.verify(parsed.refreshToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Refresh session expired. Please sign in again." });
  }
  if (claims.tokenType !== "refresh") {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  const result = await pool.query(
    `SELECT u.id, u.email, u.timezone, u.name, u.role
     FROM users u JOIN auth_sessions s ON s.user_id = u.id
     WHERE u.id = $1 AND s.id = $2 AND s.revoked_at IS NULL AND s.expires_at > NOW()`,
    [claims.id, claims.jti]
  );
  if (!result.rows[0]) return res.status(401).json({ error: "Account no longer exists" });
  const revoked = await pool.query(
    "UPDATE auth_sessions SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL",
    [claims.jti]
  );
  if (!revoked.rowCount) return res.status(401).json({ error: "Refresh session has already been used" });
  res.json({ user: result.rows[0], ...await createTokens(result.rows[0]) });
}

export async function logout(req, res) {
  const parsed = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
  try {
    const claims = jwt.verify(parsed.refreshToken, process.env.JWT_SECRET);
    if (claims.tokenType === "refresh" && claims.jti) {
      await pool.query(
        "UPDATE auth_sessions SET revoked_at = NOW() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL",
        [claims.jti, claims.id]
      );
    }
  } catch (error) {
    if (!(error instanceof jwt.JsonWebTokenError)) throw error;
    // Locally-held tokens are cleared regardless; no valid server session remains to revoke.
  }
  res.status(204).end();
}

const RESET_TOKEN_TTL_MINUTES = 60;
const genericResetMessage = "If an account exists for that email, a password reset link has been issued.";

const hashResetToken = token => createHash("sha256").update(token).digest("hex");

function resetLinkBase() {
  const configured = process.env.PASSWORD_RESET_URL_BASE
    || (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",")[0].trim();
  return configured.replace(/\/+$/, "");
}

export function shouldExposeResetLink() {
  if (process.env.PASSWORD_RESET_EXPOSE_LINK === "true") return true;
  if (process.env.PASSWORD_RESET_EXPOSE_LINK === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export async function issuePasswordReset(userId) {
  const token = randomBytes(32).toString("base64url");
  await pool.query(
    "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
    [userId]
  );
  const result = await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + make_interval(mins => $3))
     RETURNING expires_at`,
    [userId, hashResetToken(token), RESET_TOKEN_TTL_MINUTES]
  );
  return {
    resetUrl: `${resetLinkBase()}/reset-password?token=${encodeURIComponent(token)}`,
    expiresAt: result.rows[0]?.expires_at,
  };
}

export async function forgotPassword(req, res) {
  const { email } = z.object({ email: credentialsSchema.shape.email }).parse(req.body);
  const result = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  const user = result.rows[0];
  if (!user) return res.json({ message: genericResetMessage });

  const reset = await issuePasswordReset(user.id);
  console.info(`[password-reset] Reset link for ${email} (valid ${RESET_TOKEN_TTL_MINUTES} min): ${reset.resetUrl}`);
  res.json(shouldExposeResetLink()
    ? { message: genericResetMessage, resetUrl: reset.resetUrl, expiresAt: reset.expiresAt }
    : { message: genericResetMessage });
}

export async function resetPassword(req, res) {
  const input = z.object({
    token: z.string().trim().min(20).max(200),
    password: credentialsSchema.shape.password,
  }).parse(req.body);
  const passwordHash = await bcrypt.hash(input.password, 12);

  const result = await pool.query(
    `WITH consumed AS (
       UPDATE password_reset_tokens SET used_at = NOW()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       RETURNING user_id
     ), updated AS (
       UPDATE users u SET password_hash = $2, updated_at = NOW()
       FROM consumed c WHERE u.id = c.user_id
       RETURNING u.id
     ), revoked AS (
       UPDATE auth_sessions s SET revoked_at = NOW()
       FROM updated WHERE s.user_id = updated.id AND s.revoked_at IS NULL
     )
     SELECT id FROM updated`,
    [hashResetToken(input.token), passwordHash]
  );
  if (!result.rows[0]) {
    return res.status(400).json({ error: "This reset link is invalid or has expired. Request a new one." });
  }
  res.json({ message: "Password updated. You can now sign in with your new password." });
}

export async function me(req, res) {
  const result = await pool.query(
    `SELECT id, email, timezone, name, role FROM users WHERE id = $1`,
    [req.user.id]
  );

  if (!result.rows[0]) return res.status(404).json({ error: "Account not found" });
  res.json({ user: result.rows[0] });
}
