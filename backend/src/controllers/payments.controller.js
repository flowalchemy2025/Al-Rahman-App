import { paymentsService } from "../services/payments.service.js";
import { auditService } from "../services/audit.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listPayments = asyncHandler(async (req, res) => {
  const data = await paymentsService.list(req.query);
  res.json({ success: true, data });
});

export const createVendorPayment = asyncHandler(async (req, res) => {
  const data = await paymentsService.addVendorPayment(req.body);
  await auditService.log(req, "payments.vendor_transaction.create", {
    targetType: "vendor_transactions",
    targetId: data.id,
    metadata: { vendor_id: data.vendor_id, branch_name: data.branch_name, amount: data.amount },
  });
  res.status(201).json({ success: true, data });
});

export const updateVendorTransactionComment = asyncHandler(async (req, res) => {
  const data = await paymentsService.updateVendorTransactionComment(
    Number(req.params.id),
    req.body.comment,
  );
  await auditService.log(req, "payments.vendor_transaction.comment.update", {
    targetType: "vendor_transactions",
    targetId: data.id,
    metadata: { commentLength: String(req.body.comment || "").length },
  });
  res.json({ success: true, data });
});
