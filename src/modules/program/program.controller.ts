import { Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { AppError } from '../../utils/AppError';
import prisma from '../../services/db';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { createAuditLog } from '../../services/auditLog.service';

export const createProgram = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { code, name, degreeLevel, totalCredits, departmentId } = req.body;

  const department = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!department || department.deletedAt !== null) {
    throw new AppError('Department not found', 404);
  }

  const existing = await prisma.program.findUnique({ where: { code } });
  if (existing) {
    throw new AppError('Program code already exists', 400);
  }

  const program = await prisma.program.create({
    data: {
      code,
      name,
      degreeLevel,
      totalCredits,
      departmentId,
    },
    include: {
      department: true,
    },
  });

  await createAuditLog({
    userId: req.user?.id,
    action: 'CREATE_PROGRAM',
    entity: 'Program',
    entityId: program.id,
    details: `Created program ${program.code} in department ${department.code}`,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    statusCode: 201,
    message: 'Program created successfully',
    data: program,
  });
});

export const getPrograms = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined;
  const q = req.query.q as string;
  const skip = (page - 1) * limit;

  const whereClause: any = {
    deletedAt: null,
  };

  if (departmentId) {
    whereClause.departmentId = departmentId;
  }

  if (q) {
    whereClause.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { code: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [programs, total] = await Promise.all([
    prisma.program.findMany({
      where: whereClause,
      skip,
      take: limit,
      include: {
        department: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.program.count({ where: whereClause }),
  ]);

  sendResponse(res, {
    statusCode: 200,
    message: 'Programs fetched successfully',
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: programs,
  });
});
