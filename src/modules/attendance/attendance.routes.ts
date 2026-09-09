import { Router } from 'express';
import { protect, restrictTo } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validation.middleware';
import { recordAttendanceSchema } from './attendance.validation';
import { recordAttendance, getSectionAttendance } from './attendance.controller';
import { Role } from '@prisma/client';

const router = Router();

router.post(
  '/',
  protect,
  restrictTo(Role.INSTRUCTOR, Role.ADMIN),
  validateRequest(recordAttendanceSchema),
  recordAttendance
);

router.get(
  '/section/:sectionId',
  protect,
  getSectionAttendance
);

export default router;
