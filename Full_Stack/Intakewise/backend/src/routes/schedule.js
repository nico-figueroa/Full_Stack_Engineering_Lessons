import express from "express";
import auth from "../middleware/auth.js";
import { generateSchedule } from "../controllers/scheduleController.js";

const router = express.Router();

router.get("/", auth, generateSchedule);

export default router;
