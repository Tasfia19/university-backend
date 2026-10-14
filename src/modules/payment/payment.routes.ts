import { Router } from 'express';
import { protect, restrictTo } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validation.middleware';
import { initiatePaymentSchema } from './payment.validation';
import {
  initiatePayment,
  handlePaymentWebhook,
  getMyPayments,
  getAllPayments,
  updatePaymentStatus,
} from './payment.controller';
import { Role } from '@prisma/client';

const router = Router();

router.get(
  '/',
  protect,
  restrictTo(Role.ADMIN),
  getAllPayments
);

router.patch(
  '/:id/status',
  protect,
  restrictTo(Role.ADMIN),
  updatePaymentStatus
);

router.post(
  '/initiate',
  protect,
  restrictTo(Role.STUDENT),
  validateRequest(initiatePaymentSchema),
  initiatePayment
);

router.post(
  '/webhook',
  handlePaymentWebhook
);

router.get(
  '/my-payments',
  protect,
  restrictTo(Role.STUDENT),
  getMyPayments
);

export default router;
