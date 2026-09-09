import { Router } from 'express';
import { protect, restrictTo } from '../../middlewares/auth.middleware';
import { getDashboardStats, getAuditLogs } from './admin.controller';
import { Role } from '@prisma/client';

const router = Router();

router.get(
  '/dashboard-stats',
  protect,
  restrictTo(Role.ADMIN),
  getDashboardStats
);

router.get(
  '/audit-logs',
  protect,
  restrictTo(Role.ADMIN),
  getAuditLogs
);

export default router;
