import express from "express";
import {
  beginMfaEnrollment,
  completeMfaEnrollment,
  disableMfa,
  forgotPassword,
  login,
  logout,
  me,
  refresh,
  register,
  resetPassword,
  verifyLoginMfa,
} from "../controllers/authController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/mfa/verify", verifyLoginMfa);
router.post("/mfa/enroll", auth, beginMfaEnrollment);
router.post("/mfa/enroll/verify", auth, completeMfaEnrollment);
router.post("/mfa/disable", auth, disableMfa);
router.get("/me", auth, me);

export default router;
