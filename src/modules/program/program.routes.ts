import { Router } from 'express';
import { protect, restrictTo } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validation.middleware';
import { createProgramSchema } from './program.validation';
import { createProgram, getPrograms } from './program.controller';
import { Role } from '@prisma/client';

const router = Router();

router.post(
  '/',
  protect,
  restrictTo(Role.ADMIN),
  validateRequest(createProgramSchema),
  createProgram
);

router.get('/', getPrograms);

export default router;
