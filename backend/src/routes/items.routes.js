import { Router } from "express";
import {
  createItem,
  deleteItem,
  listItems,
  updateItem,
} from "../controllers/items.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/authorize.js";
import {
  validateCreateItem,
  validateIdParam,
  validateItemsList,
  validateUpdateItem,
} from "../validators/requestValidators.js";

const router = Router();

router.use(requireAuth);

router.get("/", requireRole("Super Admin", "Branch"), validateItemsList, listItems);
router.post("/", requireRole("Super Admin", "Branch"), validateCreateItem, createItem);
router.patch("/:id", requireRole("Super Admin", "Branch"), validateUpdateItem, updateItem);
router.delete("/:id", requireRole("Super Admin", "Branch"), validateIdParam, deleteItem);

export default router;
