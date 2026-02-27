import { ledgerService } from "../services/ledger.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getVendorLedger = asyncHandler(async (req, res) => {
  const vendorId = Number(req.params.vendorId);
  const branchName = req.query.branchName;
  const data = await ledgerService.getVendorLedger(vendorId, branchName);
  res.json({ success: true, data });
});
