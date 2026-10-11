import express from "express";
import auth from "../middleware/auth.js";
import { getCandidates, getReference, setMatch } from "../controllers/referenceController.js";

const router = express.Router();

router.get("/:itemId", auth, getReference);
router.get("/:itemId/candidates", auth, getCandidates);
router.put("/:itemId/match", auth, setMatch);

export default router;
