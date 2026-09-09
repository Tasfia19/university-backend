import { Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import prisma from '../../services/db';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { createAuditLog } from '../../services/auditLog.service';

export const createSemester = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { name, year, term, startDate, endDate, isRegistrationOpen } = req.body;

  const semester = await prisma.semester.create({
    data: {
      name,
      year,
      term,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isRegistrationOpen: isRegistrationOpen ?? true,
    },
  });

  await createAuditLog({
    userId: req.user?.id,
    action: 'CREATE_SEMESTER',
    entity: 'Semester',
    entityId: semester.id,
    details: `Created semester ${semester.name}`,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    statusCode: 201,
    message: 'Semester created successfully',
    data: semester,
  });
});

export const getSemesters = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const [semesters, total] = await Promise.all([
    prisma.semester.findMany({
      where: { deletedAt: null },
      skip,
      take: limit,
      orderBy: { startDate: 'desc' },
    }),
    prisma.semester.count({ where: { deletedAt: null } }),
  ]);

  sendResponse(res, {
    statusCode: 200,
    message: 'Semesters fetched successfully',
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: semesters,
  });
});
