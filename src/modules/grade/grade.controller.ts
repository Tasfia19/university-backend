import { Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { AppError } from '../../utils/AppError';
import prisma from '../../services/db';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { createAuditLog } from '../../services/auditLog.service';

// Helper function to map marks to letter grade and grade point
export const calculateGradeFromMarks = (marks: number): { letterGrade: string; gradePoint: number } => {
  if (marks >= 80) return { letterGrade: 'A+', gradePoint: 4.0 };
  if (marks >= 75) return { letterGrade: 'A', gradePoint: 3.75 };
  if (marks >= 70) return { letterGrade: 'A-', gradePoint: 3.50 };
  if (marks >= 65) return { letterGrade: 'B+', gradePoint: 3.25 };
  if (marks >= 60) return { letterGrade: 'B', gradePoint: 3.00 };
  if (marks >= 55) return { letterGrade: 'B-', gradePoint: 2.75 };
  if (marks >= 50) return { letterGrade: 'C+', gradePoint: 2.50 };
  if (marks >= 45) return { letterGrade: 'C', gradePoint: 2.25 };
  if (marks >= 40) return { letterGrade: 'D', gradePoint: 2.00 };
  return { letterGrade: 'F', gradePoint: 0.00 };
};

export const submitStudentGrade = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { studentId, sectionId, marks } = req.body;

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { course: true, semester: true },
  });

  if (!section || section.deletedAt !== null) {
    throw new AppError('Section not found', 404);
  }

  // Instructor authorization check
  if (req.user.role === 'INSTRUCTOR' && section.instructorId !== req.user.id) {
    throw new AppError('You are not authorized to grade students in this section', 403);
  }

  const { letterGrade, gradePoint } = calculateGradeFromMarks(marks);

  const gradeResult = await prisma.$transaction(async (tx) => {
    // 1. Upsert grade entry
    const grade = await tx.grade.upsert({
      where: {
        studentId_sectionId: { studentId, sectionId },
      },
      update: {
        marks,
        letterGrade,
        gradePoint,
        submittedById: req.user!.id,
      },
      create: {
        studentId,
        sectionId,
        courseId: section.courseId,
        submittedById: req.user!.id,
        marks,
        letterGrade,
        gradePoint,
      },
      include: {
        course: true,
        student: { select: { id: true, name: true, email: true } },
      },
    });

    // Mark registration status as COMPLETED
    await tx.courseRegistration.updateMany({
      where: { studentId, sectionId },
      data: { status: 'COMPLETED' },
    });

    // 2. Recalculate Semester GPA & Cumulative CGPA
    const allSemesterGrades = await tx.grade.findMany({
      where: {
        studentId,
        section: { semesterId: section.semesterId },
        deletedAt: null,
      },
      include: { course: true },
    });

    let semesterTotalCredits = 0;
    let semesterQualityPoints = 0;
    let semesterEarnedCredits = 0;

    for (const g of allSemesterGrades) {
      const cr = g.course.credits;
      semesterTotalCredits += cr;
      semesterQualityPoints += cr * g.gradePoint;
      if (g.gradePoint > 0) {
        semesterEarnedCredits += cr;
      }
    }

    const semesterGPA = semesterTotalCredits > 0 ? parseFloat((semesterQualityPoints / semesterTotalCredits).toFixed(2)) : 0.0;

    // Recalculate Cumulative CGPA across all semesters
    const allGrades = await tx.grade.findMany({
      where: { studentId, deletedAt: null },
      include: { course: true },
    });

    let totalCredits = 0;
    let totalQualityPoints = 0;
    let earnedCredits = 0;

    for (const g of allGrades) {
      const cr = g.course.credits;
      totalCredits += cr;
      totalQualityPoints += cr * g.gradePoint;
      if (g.gradePoint > 0) {
        earnedCredits += cr;
      }
    }

    const cgpa = totalCredits > 0 ? parseFloat((totalQualityPoints / totalCredits).toFixed(2)) : 0.0;

    // Save SemesterGPA record
    await tx.semesterGPA.upsert({
      where: {
        studentId_semesterId: { studentId, semesterId: section.semesterId },
      },
      update: {
        totalCredits: semesterTotalCredits,
        earnedCredits: semesterEarnedCredits,
        gpa: semesterGPA,
        cgpa,
      },
      create: {
        studentId,
        semesterId: section.semesterId,
        totalCredits: semesterTotalCredits,
        earnedCredits: semesterEarnedCredits,
        gpa: semesterGPA,
        cgpa,
      },
    });

    return { grade, semesterGPA, cgpa };
  });

  await createAuditLog({
    userId: req.user.id,
    action: 'SUBMIT_GRADE',
    entity: 'Grade',
    entityId: gradeResult.grade.id,
    details: `Submitted grade ${letterGrade} (${gradePoint}) for student ID ${studentId} in course ${section.course.code}`,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    statusCode: 200,
    message: 'Student grade submitted and GPA recalculated successfully',
    data: gradeResult,
  });
});

export const getStudentTranscript = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  let targetStudentId = req.user.id;
  if (req.user.role === 'ADMIN' || req.user.role === 'INSTRUCTOR') {
    if (req.query.studentId) {
      targetStudentId = parseInt(req.query.studentId as string);
    }
  }

  const student = await prisma.user.findUnique({
    where: { id: targetStudentId },
    select: { id: true, name: true, email: true, phone: true, deletedAt: true },
  });

  if (!student || student.deletedAt !== null) {
    throw new AppError('Student not found', 404);
  }

  const grades = await prisma.grade.findMany({
    where: { studentId: targetStudentId, deletedAt: null },
    include: {
      course: {
        select: { id: true, code: true, title: true, credits: true, department: true },
      },
      section: {
        include: { semester: true },
      },
    },
    orderBy: { section: { semester: { startDate: 'asc' } } },
  });

  const semesterGpas = await prisma.semesterGPA.findMany({
    where: { studentId: targetStudentId },
    include: { semester: true },
    orderBy: { semester: { startDate: 'asc' } },
  });

  let totalCreditsEarned = 0;
  let totalCreditsAttempted = 0;
  let cumulativeQualityPoints = 0;

  for (const g of grades) {
    totalCreditsAttempted += g.course.credits;
    cumulativeQualityPoints += g.course.credits * g.gradePoint;
    if (g.gradePoint > 0) {
      totalCreditsEarned += g.course.credits;
    }
  }

  const overallCGPA = totalCreditsAttempted > 0 ? parseFloat((cumulativeQualityPoints / totalCreditsAttempted).toFixed(2)) : 0.0;

  sendResponse(res, {
    statusCode: 200,
    message: 'Academic transcript retrieved successfully',
    data: {
      student,
      summary: {
        totalCreditsAttempted,
        totalCreditsEarned,
        cgpa: overallCGPA,
      },
      semesterGpas,
      courseHistory: grades,
    },
  });
});
