import express from "express";
import { z } from "zod";
import pool from "../config/db.js";
import auth, { requireRole } from "../middleware/auth.js";
import {
  issuePasswordReset,
  RESET_TOKEN_TTL_MINUTES,
  shouldExposeResetLink,
} from "../controllers/authController.js";
import { emailDeliveryIsConfigured, sendPasswordResetEmail } from "../services/emailService.js";

const router = express.Router();
router.get("/users", auth, requireRole("admin"), async (req, res) => {
  const result = await pool.query(
    "SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC LIMIT 200"
  );
  res.json({ users: result.rows });
});

router.post("/users/:id/password-reset", auth, requireRole("admin"), async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const result = await pool.query("SELECT id, email FROM users WHERE id = $1", [id]);
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: "User not found" });
  const reset = await issuePasswordReset(user.id);
  if (emailDeliveryIsConfigured()) {
    await sendPasswordResetEmail({
      email: user.email,
      resetUrl: reset.resetUrl,
      minutes: RESET_TOKEN_TTL_MINUTES,
    });
  } else if (process.env.NODE_ENV === "production" && !shouldExposeResetLink()) {
    await pool.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL", [user.id]);
    return res.status(503).json({ error: "Email delivery is temporarily unavailable." });
  }
  res.status(201).json({
    email: user.email,
    ...(shouldExposeResetLink() ? { resetUrl: reset.resetUrl } : {}),
    expiresAt: reset.expiresAt,
  });
});

export default router;
