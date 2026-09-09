import { Router } from 'express';
import { protect, restrictTo } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validation.middleware';
import { submitGradeSchema } from './grade.validation';
import { submitStudentGrade, getStudentTranscript } from './grade.controller';
import { Role } from '@prisma/client';

const router = Router();

router.post(
  '/',
  protect,
  restrictTo(Role.INSTRUCTOR, Role.ADMIN),
  validateRequest(submitGradeSchema),
  submitStudentGrade
);

router.get(
  '/transcript',
  protect,
  getStudentTranscript
);

export default router;
