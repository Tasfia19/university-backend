import { Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { AppError } from '../../utils/AppError';
import prisma from '../../services/db';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { createAuditLog } from '../../services/auditLog.service';

export const createDepartment = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { code, name, description } = req.body;

  const existing = await prisma.department.findUnique({ where: { code } });
  if (existing) {
    throw new AppError('Department code already exists', 400);
  }

  const department = await prisma.department.create({
    data: { code, name, description },
  });

  await createAuditLog({
    userId: req.user?.id,
    action: 'CREATE_DEPARTMENT',
    entity: 'Department',
    entityId: department.id,
    details: `Created department ${department.code} - ${department.name}`,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    statusCode: 201,
    message: 'Department created successfully',
    data: department,
  });
});

export const getDepartments = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const q = req.query.q as string;
  const skip = (page - 1) * limit;

  const whereClause: any = {
    deletedAt: null,
  };

  if (q) {
    whereClause.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { code: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [departments, total] = await Promise.all([
    prisma.department.findMany({
      where: whereClause,
      skip,
      take: limit,
      include: {
        _count: {
          select: { courses: true, programs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.department.count({ where: whereClause }),
  ]);

  sendResponse(res, {
    statusCode: 200,
    message: 'Departments fetched successfully',
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: departments,
  });
});
