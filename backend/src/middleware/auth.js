import { supabasePublic } from "../config/supabase.js";
import { ApiError } from "../utils/ApiError.js";

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) throw new ApiError(401, "Missing bearer token");

    const {
      data: { user },
      error,
    } = await supabasePublic.auth.getUser(token);

    if (error || !user) throw new ApiError(401, "Invalid or expired token");

    req.authUser = user;
    req.accessToken = token;
    next();
  } catch (error) {
    next(error);
  }
};
