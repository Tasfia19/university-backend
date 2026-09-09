import { Router } from 'express';
import { protect, restrictTo } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validation.middleware';
import { createDepartmentSchema } from './department.validation';
import { createDepartment, getDepartments } from './department.controller';
import { Role } from '@prisma/client';

const router = Router();

router.post(
  '/',
  protect,
  restrictTo(Role.ADMIN),
  validateRequest(createDepartmentSchema),
  createDepartment
);

router.get('/', getDepartments);

export default router;
