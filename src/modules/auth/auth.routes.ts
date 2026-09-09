import { Router } from 'express';
import { validateRequest } from '../../middlewares/validation.middleware';
import { protect } from '../../middlewares/auth.middleware';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from './auth.validation';
import {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  updateProfile,
  changePassword,
} from './auth.controller';

const router = Router();

router.post('/register', validateRequest(registerSchema), registerUser);
router.post('/login', validateRequest(loginSchema), loginUser);
router.post('/logout', protect, logoutUser);
router.get('/me', protect, getMe);
router.patch('/profile', protect, validateRequest(updateProfileSchema), updateProfile);
router.post('/change-password', protect, validateRequest(changePasswordSchema), changePassword);

export default router;
