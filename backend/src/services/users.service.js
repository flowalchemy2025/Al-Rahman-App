import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/ApiError.js";

const buildEmail = (username) => `${username}@restaurant.app`;

export const usersService = {
  async getByAuthUserId(authUserId) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("user_id", authUserId)
      .single();
    if (error) return null;
    return data;
  },

  async list({ role, branchName, requester }) {
    let query = supabaseAdmin
      .from("users")
      .select("*")
      .neq("role", "Super Admin")
      .order("created_at", { ascending: false });

    if (role) query = query.eq("role", role);
    if (branchName) query = query.contains("branches", [branchName]);

    if (requester.role === "Branch") {
      query = query.eq("role", "Vendor").contains("branches", [requester.branches[0]]);
    }

    const { data, error } = await query;
    if (error) throw new ApiError(400, error.message);
    return data;
  },

  async create({ username, password, role, branches }) {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: buildEmail(username),
      password,
      email_confirm: true,
    });
    if (authError) throw new ApiError(400, authError.message);

    const { data, error } = await supabaseAdmin
      .from("users")
      .insert([
        {
          user_id: authData.user.id,
          username,
          full_name: "",
          mobile_number: "",
          role,
          branches,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw new ApiError(400, error.message);
    return data;
  },

  async update({ userId, updates }) {
    const { data: existing, error: exError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();
    if (exError || !existing) throw new ApiError(404, "User not found");

    const authUpdates = {};
    if (updates.username && updates.username !== existing.username) {
      authUpdates.email = buildEmail(updates.username);
    }
    if (updates.password) authUpdates.password = updates.password;

    if (Object.keys(authUpdates).length > 0) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        existing.user_id,
        authUpdates,
      );
      if (error) throw new ApiError(400, error.message);
    }

    const payload = { ...updates };
    delete payload.password;

    const { data, error } = await supabaseAdmin
      .from("users")
      .update(payload)
      .eq("id", userId)
      .select()
      .single();
    if (error) throw new ApiError(400, error.message);
    return data;
  },

  async remove({ userId }) {
    const { data: existing, error: exError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();
    if (exError || !existing) throw new ApiError(404, "User not found");

    const { error: tableError } = await supabaseAdmin.from("users").delete().eq("id", userId);
    if (tableError) throw new ApiError(400, tableError.message);

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(existing.user_id);
    if (authError) throw new ApiError(400, authError.message);

    return existing;
  },
};
