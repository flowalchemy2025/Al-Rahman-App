import { authService } from "../services/auth.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const login = asyncHandler(async (req, res) => {
  const { usernameOrMobile, password } = req.body;
  const data = await authService.login(usernameOrMobile, password);
  res.json({ success: true, data });
});

export const me = asyncHandler(async (req, res) => {
  const data = await authService.me(req.authUser.id);
  res.json({ success: true, data });
});
