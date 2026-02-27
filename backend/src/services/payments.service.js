import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/ApiError.js";

export const paymentsService = {
  async list(filters = {}) {
    let query = supabaseAdmin
      .from("payments")
      .select("*, vendor:vendor_id(id, full_name), worker:worker_id(id, full_name)");

    if (filters.vendorId) query = query.eq("vendor_id", filters.vendorId);
    if (filters.startDate) query = query.gte("created_at", filters.startDate);
    if (filters.endDate) query = query.lte("created_at", filters.endDate);

    query = query.order("created_at", { ascending: false });
    const { data, error } = await query;
    if (error) throw new ApiError(400, error.message);
    return data;
  },

  async addVendorPayment(payload) {
    const { data, error } = await supabaseAdmin
      .from("vendor_transactions")
      .insert([payload])
      .select()
      .single();
    if (error) throw new ApiError(400, error.message);
    return data;
  },
};
