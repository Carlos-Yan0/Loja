import {Router} from 'express';
import {userController} from '../controllers/user.controller.js';
const router = Router();

router.post("/", userController.create);
router.get("/", userController.findAll);
router.put("/:id", userController.update);

export {router};