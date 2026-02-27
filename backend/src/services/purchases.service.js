import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/ApiError.js";

export const purchasesService = {
  async list(filters = {}) {
    let query = supabaseAdmin.from("purchase_entries").select(`
      *,
      worker:worker_id(id, full_name, username),
      vendor:vendor_id(id, full_name, username)
    `);

    if (filters.workerId) query = query.eq("worker_id", filters.workerId);
    if (filters.vendorId) query = query.eq("vendor_id", filters.vendorId);
    if (filters.branchName) query = query.eq("branch_name", filters.branchName);
    if (filters.startDate) query = query.gte("created_at", filters.startDate);
    if (filters.endDate) query = query.lte("created_at", filters.endDate);
    if (filters.searchTerm) query = query.ilike("item_name", `%${filters.searchTerm}%`);

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw new ApiError(400, error.message);
    return data;
  },

  async create(payload) {
    const { data, error } = await supabaseAdmin
      .from("purchase_entries")
      .insert([payload])
      .select()
      .single();
    if (error) throw new ApiError(400, error.message);
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabaseAdmin
      .from("purchase_entries")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new ApiError(400, error.message);
    return data;
  },

  async remove(id) {
    const { data: existing } = await supabaseAdmin
      .from("purchase_entries")
      .select("*")
      .eq("id", id)
      .single();

    const { error } = await supabaseAdmin.from("purchase_entries").delete().eq("id", id);
    if (error) throw new ApiError(400, error.message);
    return existing || { id };
  },
};
