import { usersService } from "../services/users.service.js";
import { auditService } from "../services/audit.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listUsers = asyncHandler(async (req, res) => {
  const data = await usersService.list({
    role: req.query.role,
    branchName: req.query.branchName,
    requester: req.currentUser,
  });
  res.json({ success: true, data });
});

export const createUser = asyncHandler(async (req, res) => {
  const data = await usersService.create(req.body);
  await auditService.log(req, "users.create", {
    targetType: "users",
    targetId: data.id,
    metadata: { role: data.role, branches: data.branches },
  });
  res.status(201).json({ success: true, data });
});

export const updateUser = asyncHandler(async (req, res) => {
  const data = await usersService.update({
    userId: Number(req.params.id),
    updates: req.body,
  });
  await auditService.log(req, "users.update", {
    targetType: "users",
    targetId: data.id,
    metadata: { changedKeys: Object.keys(req.body || {}) },
  });
  res.json({ success: true, data });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const deleted = await usersService.remove({ userId: Number(req.params.id) });
  await auditService.log(req, "users.delete", {
    targetType: "users",
    targetId: Number(req.params.id),
    metadata: { deletedUserId: deleted?.id, deletedAuthUserId: deleted?.user_id },
  });
  res.json({ success: true });
});
