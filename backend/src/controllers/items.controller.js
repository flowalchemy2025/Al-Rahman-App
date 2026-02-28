import { itemsService } from "../services/items.service.js";
import { auditService } from "../services/audit.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listItems = asyncHandler(async (req, res) => {
  const data = await itemsService.list({ branchName: req.query.branchName });
  res.json({ success: true, data });
});

export const createItem = asyncHandler(async (req, res) => {
  const data = await itemsService.create(req.body);
  await auditService.log(req, "items.create", {
    targetType: "branch_items",
    targetId: data.id,
    metadata: { branch_name: data.branch_name, item_name: data.item_name },
  });
  res.status(201).json({ success: true, data });
});

export const deleteItem = asyncHandler(async (req, res) => {
  const deleted = await itemsService.remove(Number(req.params.id));
  await auditService.log(req, "items.delete", {
    targetType: "branch_items",
    targetId: Number(req.params.id),
    metadata: { deletedId: deleted?.id, branch_name: deleted?.branch_name },
  });
  res.json({ success: true });
});
