import { Router } from 'express';
import { protect, restrictTo } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validation.middleware';
import { registerCourseSchema } from './registration.validation';
import {
  registerCourseSection,
  getMySchedule,
  dropCourseRegistration,
} from './registration.controller';
import { Role } from '@prisma/client';

const router = Router();

router.post(
  '/',
  protect,
  restrictTo(Role.STUDENT),
  validateRequest(registerCourseSchema),
  registerCourseSection
);

router.get(
  '/my-schedule',
  protect,
  restrictTo(Role.STUDENT, Role.ADMIN),
  getMySchedule
);

router.patch(
  '/:id/drop',
  protect,
  restrictTo(Role.STUDENT, Role.ADMIN),
  dropCourseRegistration
);

export default router;
