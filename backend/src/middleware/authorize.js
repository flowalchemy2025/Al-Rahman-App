import { ApiError } from "../utils/ApiError.js";
import { usersService } from "../services/users.service.js";

export const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.authUser?.id) throw new ApiError(401, "Unauthorized");
      const profile = await usersService.getByAuthUserId(req.authUser.id);
      if (!profile) throw new ApiError(403, "User profile not found");
      if (!allowedRoles.includes(profile.role)) {
        throw new ApiError(403, "Insufficient permissions");
      }

      req.currentUser = profile;
      next();
    } catch (error) {
      next(error);
    }
  };
};
