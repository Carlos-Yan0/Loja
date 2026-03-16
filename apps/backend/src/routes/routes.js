import {Router} from 'express';
const router = Router();

import { authMiddleware } from '../middlewares/auth.middleware.js';

import { router as userRoutes } from './user.routes.js';
import { router as productRoutes } from './product.routes.js';
import { router as orderRoutes } from './order.routes.js';
import { router as authRoutes } from './auth.routes.js';
import { router as addressRoutes } from './address.routes.js';

router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/orders', authMiddleware, orderRoutes);
router.use('/auth', authRoutes);
router.use('/addresses', addressRoutes);

export {router};