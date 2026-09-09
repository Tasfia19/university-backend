import { Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { AppError } from '../../utils/AppError';
import prisma from '../../services/db';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { createAuditLog } from '../../services/auditLog.service';

export const createSection = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { sectionNumber, courseId, semesterId, instructorId, capacity, classRoutine, room, status } = req.body;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.deletedAt !== null) {
    throw new AppError('Course not found', 404);
  }

  const semester = await prisma.semester.findUnique({ where: { id: semesterId } });
  if (!semester || semester.deletedAt !== null) {
    throw new AppError('Semester not found', 404);
  }

  const instructor = await prisma.user.findUnique({ where: { id: instructorId } });
  if (!instructor || instructor.role !== 'INSTRUCTOR' || instructor.deletedAt !== null) {
    throw new AppError('Instructor user not found or user is not an instructor', 400);
  }

  const section = await prisma.section.create({
    data: {
      sectionNumber,
      courseId,
      semesterId,
      instructorId,
      capacity: capacity || 30,
      classRoutine,
      room,
      status: status || 'OPEN',
    },
    include: {
      course: true,
      semester: true,
      instructor: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  await createAuditLog({
    userId: req.user?.id,
    action: 'CREATE_SECTION',
    entity: 'Section',
    entityId: section.id,
    details: `Created section ${section.sectionNumber} for course ${course.code}`,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    statusCode: 201,
    message: 'Section created successfully',
    data: section,
  });
});

export const getSections = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const courseId = req.query.courseId ? parseInt(req.query.courseId as string) : undefined;
  const semesterId = req.query.semesterId ? parseInt(req.query.semesterId as string) : undefined;
  const instructorId = req.query.instructorId ? parseInt(req.query.instructorId as string) : undefined;
  const status = req.query.status as string;
  const q = req.query.q as string;
  const skip = (page - 1) * limit;

  const whereClause: any = {
    deletedAt: null,
  };

  if (courseId) whereClause.courseId = courseId;
  if (semesterId) whereClause.semesterId = semesterId;
  if (instructorId) whereClause.instructorId = instructorId;
  if (status) whereClause.status = status;

  if (q) {
    whereClause.OR = [
      { course: { title: { contains: q, mode: 'insensitive' } } },
      { course: { code: { contains: q, mode: 'insensitive' } } },
      { room: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [sections, total] = await Promise.all([
    prisma.section.findMany({
      where: whereClause,
      skip,
      take: limit,
      include: {
        course: {
          select: { id: true, code: true, title: true, credits: true, prerequisiteId: true },
        },
        semester: {
          select: { id: true, name: true, isRegistrationOpen: true },
        },
        instructor: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.section.count({ where: whereClause }),
  ]);

  sendResponse(res, {
    statusCode: 200,
    message: 'Sections fetched successfully',
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: sections,
  });
});
