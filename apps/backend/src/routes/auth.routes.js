import { Router } from "express";
import { authController } from "../controllers/auth.controller";

const router = Router();

router.post('/refresh', authController.refreshToken);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

export {router};