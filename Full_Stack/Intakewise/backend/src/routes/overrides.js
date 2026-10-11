import express from "express";
import auth from "../middleware/auth.js";
import { createOverride, deleteOverride, listOverrides, updateOverride } from "../controllers/overridesController.js";

const router = express.Router();
router.use(auth);
router.get("/", listOverrides);
router.post("/", createOverride);
router.put("/:id", updateOverride);
router.delete("/:id", deleteOverride);

export default router;
