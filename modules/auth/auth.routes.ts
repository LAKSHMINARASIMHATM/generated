
import { Router } from 'express';
import * as AuthController from './auth.controller';
import { protect } from '../../middleware/auth.middleware';

const router = Router();

router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);
router.get('/me', protect, AuthController.getMe);

export default router;
