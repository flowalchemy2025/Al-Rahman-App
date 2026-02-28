import { Router } from "express";
import {
  createVendorPayment,
  listPayments,
  updateVendorTransactionComment,
} from "../controllers/payments.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/authorize.js";
import {
  validateCreateVendorTransaction,
  validatePaymentsList,
  validateVendorCommentUpdate,
} from "../validators/requestValidators.js";

const router = Router();

router.use(requireAuth);

router.get("/", requireRole("Super Admin", "Branch", "Vendor"), validatePaymentsList, listPayments);
router.post(
  "/vendor-transactions",
  requireRole("Super Admin", "Branch"),
  validateCreateVendorTransaction,
  createVendorPayment,
);
router.patch(
  "/vendor-transactions/:id/vendor-comment",
  requireRole("Super Admin", "Branch", "Vendor"),
  validateVendorCommentUpdate,
  updateVendorTransactionComment,
);

export default router;
