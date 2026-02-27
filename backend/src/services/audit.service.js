import { supabaseAdmin } from "../config/supabase.js";

export const auditService = {
  async log(req, action, meta = {}) {
    try {
      const payload = {
        action,
        actor_user_id: req.currentUser?.id || null,
        actor_role: req.currentUser?.role || null,
        actor_auth_user_id: req.authUser?.id || null,
        target_type: meta.targetType || null,
        target_id: meta.targetId || null,
        metadata: meta.metadata || {},
        ip_address: req.ip || null,
        user_agent: req.headers["user-agent"] || null,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin.from("audit_logs").insert([payload]);
      if (error) {
        // eslint-disable-next-line no-console
        console.warn("Audit log insert failed:", error.message);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Audit log error:", error.message);
    }
  },
};
