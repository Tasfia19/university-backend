import { Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { AppError } from '../../utils/AppError';
import prisma from '../../services/db';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { createAuditLog } from '../../services/auditLog.service';

export const registerCourseSection = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const studentId = req.user.id;
  const { sectionId } = req.body;

  // Perform inside interactive database transaction to guarantee concurrency safety
  const registrationResult = await prisma.$transaction(async (tx) => {
    // 1. Fetch section details
    const section = await tx.section.findUnique({
      where: { id: sectionId },
      include: {
        course: true,
        semester: true,
      },
    });

    if (!section || section.deletedAt !== null) {
      throw new AppError('Course section not found', 404);
    }

    if (section.status !== 'OPEN') {
      throw new AppError(`Section is ${section.status} for registration`, 400);
    }

    // 2. Check if semester registration window is open
    if (!section.semester.isRegistrationOpen) {
      throw new AppError(`Registration is closed for semester ${section.semester.name}`, 400);
    }

    // 3. Check if student is already enrolled in this section or course in the same semester
    const existingRegistration = await tx.courseRegistration.findFirst({
      where: {
        studentId,
        sectionId,
        status: 'ENROLLED',
      },
    });

    if (existingRegistration) {
      throw new AppError('You are already registered for this section', 400);
    }

    // 4. Check Prerequisite validation
    if (section.course.prerequisiteId) {
      const completedPrerequisite = await tx.grade.findFirst({
        where: {
          studentId,
          courseId: section.course.prerequisiteId,
          gradePoint: { gt: 0 }, // Greater than 0 means passed (not F)
        },
      });

      if (!completedPrerequisite) {
        const prereqCourse = await tx.course.findUnique({
          where: { id: section.course.prerequisiteId },
        });
        throw new AppError(
          `Prerequisite requirement not satisfied: You must pass course ${prereqCourse?.code || section.course.prerequisiteId} first`,
          400
        );
      }
    }

    // 5. Concurrency check: Verify seat capacity
    if (section.enrolledCount >= section.capacity) {
      // Mark section as CLOSED if full
      await tx.section.update({
        where: { id: sectionId },
        data: { status: 'CLOSED' },
      });
      throw new AppError('Course section is full. Registration limit reached.', 400);
    }

    // 6. Create registration record
    const registration = await tx.courseRegistration.create({
      data: {
        studentId,
        sectionId,
        semesterId: section.semesterId,
        status: 'ENROLLED',
      },
      include: {
        section: {
          include: {
            course: true,
            instructor: { select: { id: true, name: true, email: true } },
          },
        },
        semester: true,
      },
    });

    // 7. Increment section enrolled count
    const updatedSection = await tx.section.update({
      where: { id: sectionId },
      data: {
        enrolledCount: { increment: 1 },
      },
    });

    // Automatically close section if it reaches full capacity after this enrollment
    if (updatedSection.enrolledCount >= updatedSection.capacity) {
      await tx.section.update({
        where: { id: sectionId },
        data: { status: 'CLOSED' },
      });
    }

    return registration;
  });

  await createAuditLog({
    userId: studentId,
    action: 'COURSE_REGISTRATION',
    entity: 'CourseRegistration',
    entityId: registrationResult.id,
    details: `Registered for section ${registrationResult.section.sectionNumber} - ${registrationResult.section.course.code}`,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    statusCode: 201,
    message: 'Course registration successful',
    data: registrationResult,
  });
});

export const getMySchedule = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const semesterId = req.query.semesterId ? parseInt(req.query.semesterId as string) : undefined;

  const whereClause: any = {
    studentId: req.user.id,
    status: 'ENROLLED',
    deletedAt: null,
  };

  if (semesterId) {
    whereClause.semesterId = semesterId;
  }

  const registrations = await prisma.courseRegistration.findMany({
    where: whereClause,
    include: {
      section: {
        include: {
          course: {
            include: { department: true },
          },
          instructor: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      semester: true,
    },
    orderBy: { registeredAt: 'desc' },
  });

  sendResponse(res, {
    statusCode: 200,
    message: 'Enrolled class schedule fetched successfully',
    data: registrations,
  });
});

export const dropCourseRegistration = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const registrationId = parseInt(req.params.id);

  const registration = await prisma.courseRegistration.findUnique({
    where: { id: registrationId },
    include: { section: true },
  });

  if (!registration || registration.deletedAt !== null) {
    throw new AppError('Course registration not found', 404);
  }

  // Authorize: Only the student themselves or an Admin can drop
  if (req.user.role !== 'ADMIN' && registration.studentId !== req.user.id) {
    throw new AppError('You are not authorized to drop this registration', 403);
  }

  if (registration.status === 'DROPPED') {
    throw new AppError('Course is already dropped', 400);
  }

  await prisma.$transaction(async (tx) => {
    // 1. Update registration status to DROPPED & soft delete timestamp
    await tx.courseRegistration.update({
      where: { id: registrationId },
      data: {
        status: 'DROPPED',
        deletedAt: new Date(),
      },
    });

    // 2. Decrement enrolled count on section
    if (registration.section.enrolledCount > 0) {
      const updatedSection = await tx.section.update({
        where: { id: registration.sectionId },
        data: {
          enrolledCount: { decrement: 1 },
        },
      });

      // Re-open section if it was previously closed due to capacity
      if (updatedSection.status === 'CLOSED' && updatedSection.enrolledCount < updatedSection.capacity) {
        await tx.section.update({
          where: { id: registration.sectionId },
          data: { status: 'OPEN' },
        });
      }
    }
  });

  await createAuditLog({
    userId: req.user.id,
    action: 'DROP_COURSE_REGISTRATION',
    entity: 'CourseRegistration',
    entityId: registrationId,
    details: `Dropped registration ID ${registrationId}`,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    statusCode: 200,
    message: 'Course dropped successfully',
    data: null,
  });
});
