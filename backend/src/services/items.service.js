import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/ApiError.js";

export const itemsService = {
  async list({ branchName }) {
    let query = supabaseAdmin.from("branch_items").select("*");
    if (branchName) query = query.eq("branch_name", branchName);
    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw new ApiError(400, error.message);
    return data;
  },

  async create(payload) {
    const { data, error } = await supabaseAdmin
      .from("branch_items")
      .insert([payload])
      .select()
      .single();
    if (error) throw new ApiError(400, error.message);
    return data;
  },

  async remove(id) {
    const { data: existing } = await supabaseAdmin
      .from("branch_items")
      .select("*")
      .eq("id", id)
      .single();

    const { error } = await supabaseAdmin.from("branch_items").delete().eq("id", id);
    if (error) throw new ApiError(400, error.message);
    return existing || { id };
  },
};
