import { Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { AppError } from '../../utils/AppError';
import prisma from '../../services/db';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { createAuditLog } from '../../services/auditLog.service';

export const recordAttendance = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { sectionId, studentId, date, status, remarks } = req.body;

  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section || section.deletedAt !== null) {
    throw new AppError('Section not found', 404);
  }

  // Authorize instructor teaching this section or admin
  if (req.user?.role === 'INSTRUCTOR' && section.instructorId !== req.user.id) {
    throw new AppError('You are not assigned to teach this section', 403);
  }

  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== 'STUDENT' || student.deletedAt !== null) {
    throw new AppError('Student user not found', 404);
  }

  const attendance = await prisma.attendance.create({
    data: {
      sectionId,
      studentId,
      date: new Date(date),
      status: status || 'PRESENT',
      remarks,
    },
    include: {
      student: { select: { id: true, name: true, email: true } },
      section: { select: { id: true, sectionNumber: true } },
    },
  });

  await createAuditLog({
    userId: req.user?.id,
    action: 'RECORD_ATTENDANCE',
    entity: 'Attendance',
    entityId: attendance.id,
    details: `Marked student ${student.name} as ${status} for section ${section.sectionNumber}`,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    statusCode: 201,
    message: 'Attendance recorded successfully',
    data: attendance,
  });
});

export const getSectionAttendance = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const sectionId = parseInt(req.params.sectionId);
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section || section.deletedAt !== null) {
    throw new AppError('Section not found', 404);
  }

  const whereClause: any = { sectionId };

  // If student, filter only their own attendance
  if (req.user?.role === 'STUDENT') {
    whereClause.studentId = req.user.id;
  }

  const [attendanceRecords, total] = await Promise.all([
    prisma.attendance.findMany({
      where: whereClause,
      skip,
      take: limit,
      include: {
        student: { select: { id: true, name: true, email: true } },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.attendance.count({ where: whereClause }),
  ]);

  sendResponse(res, {
    statusCode: 200,
    message: 'Section attendance records fetched successfully',
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: attendanceRecords,
  });
});
