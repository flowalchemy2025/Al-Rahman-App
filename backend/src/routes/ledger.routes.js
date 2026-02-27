import { Router } from "express";
import { getVendorLedger } from "../controllers/ledger.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/authorize.js";
import { validateLedgerQuery } from "../validators/requestValidators.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/vendor/:vendorId",
  requireRole("Super Admin", "Branch", "Vendor"),
  validateLedgerQuery,
  getVendorLedger,
);

export default router;
