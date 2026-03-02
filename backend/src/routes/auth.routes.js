import { Router } from "express";
import { login, me, refresh } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validateLogin, validateRefresh } from "../validators/requestValidators.js";

const router = Router();

router.post("/login", validateLogin, login);
router.post("/refresh", validateRefresh, refresh);
router.get("/me", requireAuth, me);

export default router;
