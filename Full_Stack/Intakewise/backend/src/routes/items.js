import express from "express";
import auth from "../middleware/auth.js";
import {
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem
} from "../controllers/itemsController.js";

const router = express.Router();

router.get("/", auth, getItems);
router.get("/:id", auth, getItem);
router.post("/", auth, createItem);
router.put("/:id", auth, updateItem);
router.delete("/:id", auth, deleteItem);

export default router;
