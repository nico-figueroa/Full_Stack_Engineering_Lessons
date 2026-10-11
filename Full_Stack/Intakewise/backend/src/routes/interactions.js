import express from "express";
import auth from "../middleware/auth.js";
import { getInteractions } from "../controllers/interactionsController.js";

const router = express.Router();

router.get("/", auth, getInteractions);

export default router;
