import express from "express";
import auth from "../middleware/auth.js";
import { getStock } from "../controllers/stockController.js";

const router = express.Router();

router.get("/", auth, getStock);

export default router;
