import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/ApiError.js";

export const ledgerService = {
  async getVendorLedger(vendorId, branchName) {
    const { data: purchases, error: pError } = await supabaseAdmin
      .from("purchase_entries")
      .select("*")
      .eq("vendor_id", vendorId)
      .eq("branch_name", branchName);
    if (pError) throw new ApiError(400, pError.message);

    const { data: payments, error: tError } = await supabaseAdmin
      .from("vendor_transactions")
      .select("*")
      .eq("vendor_id", vendorId)
      .eq("branch_name", branchName);
    if (tError) throw new ApiError(400, tError.message);

    const totalPurchases = purchases.reduce(
      (sum, item) => sum + parseFloat(item.price || 0),
      0,
    );
    const totalPayments = payments.reduce(
      (sum, item) => sum + parseFloat(item.amount || 0),
      0,
    );

    const outstandingBalance = totalPurchases - totalPayments;

    const ledger = [
      ...purchases.map((p) => ({
        ...p,
        ledgerType: "Purchase",
        date: p.created_at,
        value: p.price,
      })),
      ...payments.map((p) => ({
        ...p,
        ledgerType: parseFloat(p.amount || 0) < 0 ? "Adjustment" : "Payment",
        date: p.created_at,
        value: Math.abs(parseFloat(p.amount || 0)),
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      balance: outstandingBalance,
      ledger,
    };
  },
};
