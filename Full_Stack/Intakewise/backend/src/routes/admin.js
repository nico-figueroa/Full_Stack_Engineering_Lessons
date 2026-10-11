import express from "express";
import { z } from "zod";
import pool from "../config/db.js";
import auth, { requireRole } from "../middleware/auth.js";
import { issuePasswordReset } from "../controllers/authController.js";

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
  console.info(`[password-reset] Admin ${req.user.id} issued a reset link for ${user.email}: ${reset.resetUrl}`);
  res.status(201).json({ email: user.email, resetUrl: reset.resetUrl, expiresAt: reset.expiresAt });
});

export default router;
