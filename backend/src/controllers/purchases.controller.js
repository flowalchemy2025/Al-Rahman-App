import { purchasesService } from "../services/purchases.service.js";
import { auditService } from "../services/audit.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listPurchases = asyncHandler(async (req, res) => {
  const data = await purchasesService.list(req.query);
  res.json({ success: true, data });
});

export const createPurchase = asyncHandler(async (req, res) => {
  const data = await purchasesService.create(req.body);
  res.status(201).json({ success: true, data });
});

export const updatePurchase = asyncHandler(async (req, res) => {
  const data = await purchasesService.update(Number(req.params.id), req.body);
  await auditService.log(req, "purchases.update", {
    targetType: "purchase_entries",
    targetId: data.id,
    metadata: { changedKeys: Object.keys(req.body || {}) },
  });
  res.json({ success: true, data });
});

export const deletePurchase = asyncHandler(async (req, res) => {
  const deleted = await purchasesService.remove(Number(req.params.id));
  await auditService.log(req, "purchases.delete", {
    targetType: "purchase_entries",
    targetId: Number(req.params.id),
    metadata: { deletedId: deleted?.id, branch: deleted?.branch_name },
  });
  res.json({ success: true });
});

export const updateVendorComment = asyncHandler(async (req, res) => {
  const data = await purchasesService.updateVendorComment(
    Number(req.params.id),
    req.body.comment,
  );
  await auditService.log(req, "purchases.vendor_comment.update", {
    targetType: "purchase_entries",
    targetId: data.id,
    metadata: { commentLength: String(req.body.comment || "").length },
  });
  res.json({ success: true, data });
});
