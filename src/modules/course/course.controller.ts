import { Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { AppError } from '../../utils/AppError';
import prisma from '../../services/db';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { createAuditLog } from '../../services/auditLog.service';

export const createCourse = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { code, title, credits, departmentId, prerequisiteId, description } = req.body;

  const department = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!department || department.deletedAt !== null) {
    throw new AppError('Department not found', 404);
  }

  if (prerequisiteId) {
    const prereq = await prisma.course.findUnique({ where: { id: prerequisiteId } });
    if (!prereq || prereq.deletedAt !== null) {
      throw new AppError('Prerequisite course not found', 404);
    }
  }

  const existing = await prisma.course.findUnique({ where: { code } });
  if (existing) {
    throw new AppError('Course code already exists', 400);
  }

  const course = await prisma.course.create({
    data: {
      code,
      title,
      credits: credits || 3.0,
      departmentId,
      prerequisiteId: prerequisiteId || null,
      description,
    },
    include: {
      department: true,
      prerequisite: true,
    },
  });

  await createAuditLog({
    userId: req.user?.id,
    action: 'CREATE_COURSE',
    entity: 'Course',
    entityId: course.id,
    details: `Created course ${course.code} - ${course.title}`,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    statusCode: 201,
    message: 'Course created successfully',
    data: course,
  });
});

export const getCourses = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined;
  const q = req.query.q as string;
  const sortBy = (req.query.sortBy as string) || 'code';
  const sortOrder = (req.query.sortOrder as string) === 'desc' ? 'desc' : 'asc';
  const skip = (page - 1) * limit;

  const whereClause: any = {
    deletedAt: null,
  };

  if (departmentId) {
    whereClause.departmentId = departmentId;
  }

  if (q) {
    whereClause.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { code: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where: whereClause,
      skip,
      take: limit,
      include: {
        department: true,
        prerequisite: {
          select: { id: true, code: true, title: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.course.count({ where: whereClause }),
  ]);

  sendResponse(res, {
    statusCode: 200,
    message: 'Courses fetched successfully',
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: courses,
  });
});

export const getCourseById = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      department: true,
      prerequisite: true,
      prerequisites: true,
      sections: {
        where: { deletedAt: null },
        include: {
          instructor: {
            select: { id: true, name: true, email: true },
          },
          semester: true,
        },
      },
    },
  });

  if (!course || course.deletedAt !== null) {
    throw new AppError('Course not found', 404);
  }

  sendResponse(res, {
    statusCode: 200,
    message: 'Course details fetched successfully',
    data: course,
  });
});

export const deleteCourse = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course || course.deletedAt !== null) {
    throw new AppError('Course not found', 404);
  }

  const deletedCourse = await prisma.course.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await createAuditLog({
    userId: req.user?.id,
    action: 'SOFT_DELETE_COURSE',
    entity: 'Course',
    entityId: id,
    details: `Soft deleted course ${course.code}`,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    statusCode: 200,
    message: 'Course soft-deleted successfully',
    data: deletedCourse,
  });
});
