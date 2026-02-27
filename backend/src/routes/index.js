import { Router } from "express";
import authRoutes from "./auth.routes.js";
import usersRoutes from "./users.routes.js";
import purchasesRoutes from "./purchases.routes.js";
import paymentsRoutes from "./payments.routes.js";
import ledgerRoutes from "./ledger.routes.js";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ success: true, status: "ok" });
});

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/purchases", purchasesRoutes);
router.use("/payments", paymentsRoutes);
router.use("/ledger", ledgerRoutes);

export default router;
