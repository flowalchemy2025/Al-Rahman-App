import { Router } from "express";
import {
  createUser,
  deleteUser,
  listUsers,
  updateMyProfile,
  updateUser,
} from "../controllers/users.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/authorize.js";
import {
  validateCreateUser,
  validateIdParam,
  validateMyProfileUpdate,
  validateUpdateUser,
  validateUserList,
} from "../validators/requestValidators.js";

const router = Router();

router.use(requireAuth);

router.get("/", requireRole("Super Admin", "Branch"), validateUserList, listUsers);
router.post("/", requireRole("Super Admin", "Branch"), validateCreateUser, createUser);
router.patch(
  "/me/profile",
  requireRole("Super Admin", "Branch", "Vendor"),
  validateMyProfileUpdate,
  updateMyProfile,
);
router.patch("/:id", requireRole("Super Admin", "Branch"), validateUpdateUser, updateUser);
router.delete("/:id", requireRole("Super Admin", "Branch"), validateIdParam, deleteUser);

export default router;
