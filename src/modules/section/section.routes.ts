import { Router } from 'express';
import { protect, restrictTo } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validation.middleware';
import { createSectionSchema } from './section.validation';
import { createSection, getSections } from './section.controller';
import { Role } from '@prisma/client';

const router = Router();

router.post(
  '/',
  protect,
  restrictTo(Role.ADMIN),
  validateRequest(createSectionSchema),
  createSection
);

router.get('/', getSections);

export default router;
