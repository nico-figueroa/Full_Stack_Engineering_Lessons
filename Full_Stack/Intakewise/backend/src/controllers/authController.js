import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import pool from "../config/db.js";
import { emailDeliveryIsConfigured, sendPasswordResetEmail } from "../services/emailService.js";
import { issueEmailMfaChallenge, verifyEmailMfaChallenge } from "../services/emailMfaService.js";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

async function createTokens(user, database = pool) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
  }

  const sessionId = randomUUID();
  await database.query(
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
     RETURNING id, email, timezone, name, role, email_mfa_enabled`,
    [input.email, passwordHash, input.timezone || null, input.name || null]
  );
  res.status(201).json({ user: result.rows[0], ...await createTokens(result.rows[0]) });
}

export async function login(req, res) {
  const { email, password } = credentialsSchema.parse(req.body);
  const result = await pool.query(
    `SELECT id, email, password_hash, timezone, name, role, email_mfa_enabled
     FROM users WHERE email = $1`,
    [email]
  );

  const user = result.rows[0];
  if (!user || !user.password_hash) return res.status(401).json({ error: "Invalid credentials" });
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: "Invalid credentials" });

  if (user.email_mfa_enabled) {
    const challenge = await issueEmailMfaChallenge(user, "login");
    return res.json({ mfaRequired: true, ...challenge });
  }

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
    `SELECT u.id, u.email, u.timezone, u.name, u.role, u.email_mfa_enabled
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

export const RESET_TOKEN_TTL_MINUTES = 60;
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
  if (process.env.NODE_ENV === "production" && !emailDeliveryIsConfigured()
    && process.env.PASSWORD_RESET_EXPOSE_LINK !== "true") {
    return res.status(503).json({ error: "Email delivery is temporarily unavailable. Please try again later." });
  }
  const { email } = z.object({ email: credentialsSchema.shape.email }).parse(req.body);
  const result = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  const user = result.rows[0];
  if (!user) return res.json({ message: genericResetMessage });

  const reset = await issuePasswordReset(user.id);
  try {
    if (emailDeliveryIsConfigured()) {
      await sendPasswordResetEmail({ email, resetUrl: reset.resetUrl, minutes: RESET_TOKEN_TTL_MINUTES });
    } else if (shouldExposeResetLink()) {
      console.info(`[password-reset] Development reset link for ${email}: ${reset.resetUrl}`);
    }
  } catch (error) {
    await pool.query(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
      [user.id],
    );
    throw error;
  }
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
    `SELECT id, email, timezone, name, role, email_mfa_enabled FROM users WHERE id = $1`,
    [req.user.id]
  );

  if (!result.rows[0]) return res.status(404).json({ error: "Account not found" });
  res.json({ user: result.rows[0] });
}

export async function updateProfile(req, res) {
  const input = z.object({
    name: z.string().trim().max(100).transform(value => value || null),
    email: credentialsSchema.shape.email,
  }).parse(req.body);
  const result = await pool.query(
    `UPDATE users SET name = $1, email = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING id, email, timezone, name, role, email_mfa_enabled`,
    [input.name, input.email, req.user.id],
  );
  if (!result.rows[0]) return res.status(404).json({ error: "Account not found" });
  res.json({ user: result.rows[0] });
}

export async function changePassword(req, res) {
  const input = z.object({
    currentPassword: credentialsSchema.shape.password,
    newPassword: credentialsSchema.shape.password,
  }).parse(req.body);
  const client = await pool.connect();
  let transactionOpen = false;

  try {
    await client.query("BEGIN");
    transactionOpen = true;
    const existing = await client.query(
      `SELECT id, email, timezone, name, role, email_mfa_enabled, password_hash
       FROM users WHERE id = $1`,
      [req.user.id],
    );
    const user = existing.rows[0];
    if (!user) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return res.status(404).json({ error: "Account not found" });
    }
    if (!user.password_hash || !await bcrypt.compare(input.currentPassword, user.password_hash)) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return res.status(400).json({ error: "The current password is incorrect." });
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    const updated = await client.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, timezone, name, role, email_mfa_enabled`,
      [passwordHash, req.user.id],
    );
    await client.query(
      "UPDATE auth_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
      [req.user.id],
    );
    const tokens = await createTokens(updated.rows[0], client);
    await client.query("COMMIT");
    transactionOpen = false;
    res.json({
      message: "Password updated. Other sessions have been signed out.",
      user: updated.rows[0],
      ...tokens,
    });
  } catch (error) {
    if (transactionOpen) await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function verifyLoginMfa(req, res) {
  const input = z.object({
    challengeId: z.string().uuid(),
    code: z.string().trim().regex(/^\d{6}$/),
  }).parse(req.body);
  const userId = await verifyEmailMfaChallenge({
    ...input,
    purpose: "login",
  });
  const result = await pool.query(
    `SELECT id, email, timezone, name, role, email_mfa_enabled
     FROM users WHERE id = $1 AND email_mfa_enabled = TRUE`,
    [userId],
  );
  if (!result.rows[0]) return res.status(401).json({ error: "Security challenge is no longer valid" });
  res.json({ user: result.rows[0], ...await createTokens(result.rows[0]) });
}

export async function beginMfaEnrollment(req, res) {
  const result = await pool.query(
    "SELECT id, email FROM users WHERE id = $1",
    [req.user.id],
  );
  if (!result.rows[0]) return res.status(404).json({ error: "Account not found" });
  res.json(await issueEmailMfaChallenge(result.rows[0], "enrollment"));
}

export async function completeMfaEnrollment(req, res) {
  const input = z.object({
    challengeId: z.string().uuid(),
    code: z.string().trim().regex(/^\d{6}$/),
  }).parse(req.body);
  await verifyEmailMfaChallenge({
    ...input,
    purpose: "enrollment",
    userId: req.user.id,
  });
  await pool.query(
    `UPDATE users SET email_mfa_enabled = TRUE, email_mfa_enabled_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [req.user.id],
  );
  res.json({ message: "Email security codes are enabled.", email_mfa_enabled: true });
}

export async function disableMfa(req, res) {
  const { password } = z.object({ password: credentialsSchema.shape.password }).parse(req.body);
  const result = await pool.query(
    "SELECT password_hash FROM users WHERE id = $1",
    [req.user.id],
  );
  if (!result.rows[0] || !await bcrypt.compare(password, result.rows[0].password_hash)) {
    return res.status(401).json({ error: "The password is incorrect." });
  }
  await pool.query(
    `UPDATE users SET email_mfa_enabled = FALSE, email_mfa_enabled_at = NULL, updated_at = NOW()
     WHERE id = $1`,
    [req.user.id],
  );
  await pool.query(
    "UPDATE email_mfa_challenges SET consumed_at = NOW() WHERE user_id = $1 AND consumed_at IS NULL",
    [req.user.id],
  );
  res.json({ message: "Email security codes are disabled.", email_mfa_enabled: false });
}
