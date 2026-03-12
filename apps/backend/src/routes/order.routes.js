import {Router} from 'express';
import {orderController} from '../controllers/order.controller.js';
const router = Router();

router.post("/", orderController.create);
router.get("/", orderController.findAll);
router.put("/:id", orderController.update);

export {router};