import { supabaseAdmin, supabasePublic } from "../config/supabase.js";
import { ApiError } from "../utils/ApiError.js";

const buildEmail = (username) => `${username}@restaurant.app`;

export const authService = {
  async login(usernameOrMobile, password) {
    const identifier = String(usernameOrMobile || "").trim();

    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .or(`username.eq.${identifier},mobile_number.eq.${identifier}`)
      .single();

    if (userError && userError.code !== "PGRST116") {
      throw new ApiError(500, `User lookup failed: ${userError.message}`);
    }

    if (!userData) {
      throw new ApiError(401, "Invalid credentials");
    }

    const { data: authData, error: authError } =
      await supabasePublic.auth.signInWithPassword({
        email: buildEmail(userData.username),
        password,
      });

    if (authError || !authData.session) {
      throw new ApiError(401, authError?.message || "Invalid credentials");
    }

    return {
      user: userData,
      session: authData.session,
    };
  },

  async me(authUserId) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("user_id", authUserId)
      .single();

    if (error) throw new ApiError(404, "User profile not found");
    return data;
  },
};
