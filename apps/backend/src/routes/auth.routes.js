import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.post('/me', authMiddleware, authController.me);
router.post('/refresh', authController.refreshToken);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

export {router};