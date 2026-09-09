import { Router } from 'express';
import { protect, restrictTo } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validation.middleware';
import { createCourseSchema } from './course.validation';
import {
  createCourse,
  getCourses,
  getCourseById,
  deleteCourse,
} from './course.controller';
import { Role } from '@prisma/client';

const router = Router();

router.post(
  '/',
  protect,
  restrictTo(Role.ADMIN),
  validateRequest(createCourseSchema),
  createCourse
);

router.get('/', getCourses);
router.get('/:id', getCourseById);

router.delete(
  '/:id',
  protect,
  restrictTo(Role.ADMIN),
  deleteCourse
);

export default router;
