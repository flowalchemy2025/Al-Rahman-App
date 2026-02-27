import { Router } from "express";
import {
  createPurchase,
  deletePurchase,
  listPurchases,
  updatePurchase,
} from "../controllers/purchases.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/authorize.js";
import {
  validateCreatePurchase,
  validateIdParam,
  validatePurchaseList,
  validateUpdatePurchase,
} from "../validators/requestValidators.js";

const router = Router();

router.use(requireAuth);

router.get("/", requireRole("Super Admin", "Branch", "Vendor"), validatePurchaseList, listPurchases);
router.post("/", requireRole("Super Admin", "Branch"), validateCreatePurchase, createPurchase);
router.patch("/:id", requireRole("Super Admin", "Branch"), validateUpdatePurchase, updatePurchase);
router.delete("/:id", requireRole("Super Admin", "Branch"), validateIdParam, deletePurchase);

export default router;
