import { Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import prisma from '../../services/db';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

export const getDashboardStats = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const [
    totalStudents,
    totalInstructors,
    totalDepartments,
    totalCourses,
    totalActiveSections,
    totalRegistrations,
    revenueData,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT', deletedAt: null } }),
    prisma.user.count({ where: { role: 'INSTRUCTOR', deletedAt: null } }),
    prisma.department.count({ where: { deletedAt: null } }),
    prisma.course.count({ where: { deletedAt: null } }),
    prisma.section.count({ where: { status: 'OPEN', deletedAt: null } }),
    prisma.courseRegistration.count({ where: { status: 'ENROLLED', deletedAt: null } }),
    prisma.payment.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  sendResponse(res, {
    statusCode: 200,
    message: 'University dashboard statistics fetched successfully',
    data: {
      users: {
        totalStudents,
        totalInstructors,
      },
      academics: {
        totalDepartments,
        totalCourses,
        totalActiveSections,
        totalRegistrations,
      },
      financials: {
        totalCollectedRevenue: revenueData._sum.amount || 0,
        totalPaidTransactions: revenueData._count.id || 0,
      },
    },
  });
});

export const getAuditLogs = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const action = req.query.action as string;
  const entity = req.query.entity as string;
  const skip = (page - 1) * limit;

  const whereClause: any = {};
  if (action) whereClause.action = action;
  if (entity) whereClause.entity = entity;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: whereClause,
      skip,
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count({ where: whereClause }),
  ]);

  sendResponse(res, {
    statusCode: 200,
    message: 'System audit logs fetched successfully',
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: logs,
  });
});
