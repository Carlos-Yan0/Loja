import {Router} from 'express';
const router = Router();

import {router as userRoutes} from './user.routes.js';
import {router as productRoutes} from './product.routes.js';

router.use('/users', userRoutes);
router.use('/products', productRoutes);

export {router};