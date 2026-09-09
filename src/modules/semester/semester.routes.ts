import { Router } from 'express';
import { protect, restrictTo } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validation.middleware';
import { createSemesterSchema } from './semester.validation';
import { createSemester, getSemesters } from './semester.controller';
import { Role } from '@prisma/client';

const router = Router();

router.post(
  '/',
  protect,
  restrictTo(Role.ADMIN),
  validateRequest(createSemesterSchema),
  createSemester
);

router.get('/', getSemesters);

export default router;
