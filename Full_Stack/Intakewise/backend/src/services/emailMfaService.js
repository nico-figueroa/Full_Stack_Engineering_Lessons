import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import pool from "../config/db.js";
import { sendMfaCodeEmail } from "./emailService.js";

const MFA_CODE_TTL_MINUTES = 10;
const MAX_CODE_ATTEMPTS = 5;

function challengeError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function hashCode(challengeId, code) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters");
  return createHmac("sha256", secret)
    .update(`${challengeId}:${code}`)
    .digest("hex");
}

export function maskEmail(email) {
  const [local, domain = ""] = String(email).split("@");
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

export async function issueEmailMfaChallenge(user, purpose) {
  const challengeId = randomUUID();
  const code = String(randomInt(100000, 1000000));
  await pool.query(
    `UPDATE email_mfa_challenges SET consumed_at = NOW()
     WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`,
    [user.id, purpose],
  );
  const result = await pool.query(
    `INSERT INTO email_mfa_challenges (id, user_id, purpose, code_hash, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + make_interval(mins => $5))
     RETURNING expires_at`,
    [challengeId, user.id, purpose, hashCode(challengeId, code), MFA_CODE_TTL_MINUTES],
  );
  try {
    await sendMfaCodeEmail({ email: user.email, code, purpose });
  } catch (error) {
    await pool.query(
      "UPDATE email_mfa_challenges SET consumed_at = NOW() WHERE id = $1",
      [challengeId],
    );
    throw error;
  }
  return {
    challengeId,
    maskedEmail: maskEmail(user.email),
    expiresAt: result.rows[0]?.expires_at,
  };
}

export async function verifyEmailMfaChallenge({ challengeId, code, purpose, userId }) {
  const result = await pool.query(
    `SELECT id, user_id, code_hash, attempts, expires_at, consumed_at
     FROM email_mfa_challenges
     WHERE id = $1 AND purpose = $2`,
    [challengeId, purpose],
  );
  const challenge = result.rows[0];
  if (!challenge || (userId && String(challenge.user_id) !== String(userId))
    || challenge.consumed_at || new Date(challenge.expires_at) <= new Date()) {
    throw challengeError("This security code is invalid or has expired.");
  }
  if (challenge.attempts >= MAX_CODE_ATTEMPTS) {
    throw challengeError("Too many incorrect security codes. Request a new code.", 429);
  }

  const expected = Buffer.from(challenge.code_hash, "hex");
  const actual = Buffer.from(hashCode(challengeId, code), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    await pool.query(
      "UPDATE email_mfa_challenges SET attempts = attempts + 1 WHERE id = $1",
      [challengeId],
    );
    throw challengeError("The security code is incorrect.");
  }

  const consumed = await pool.query(
    `UPDATE email_mfa_challenges
     SET consumed_at = NOW()
     WHERE id = $1 AND consumed_at IS NULL AND attempts < $2 AND expires_at > NOW()
     RETURNING user_id`,
    [challengeId, MAX_CODE_ATTEMPTS],
  );
  if (!consumed.rows[0]) throw challengeError("This security code is invalid or has expired.");
  return consumed.rows[0].user_id;
}

