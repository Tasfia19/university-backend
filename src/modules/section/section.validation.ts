import { z } from 'zod';
import { SectionStatus } from '@prisma/client';

export const createSectionSchema = z.object({
  body: z.object({
    sectionNumber: z.string().min(1, 'Section number is required'),
    courseId: z.number().int().positive('Course ID is required'),
    semesterId: z.number().int().positive('Semester ID is required'),
    instructorId: z.number().int().positive('Instructor User ID is required'),
    capacity: z.number().int().positive().optional().default(30),
    classRoutine: z.string().min(2, 'Class routine is required (e.g. Mon/Wed 10:00-11:30)'),
    room: z.string().min(1, 'Room is required'),
    status: z.nativeEnum(SectionStatus).optional().default(SectionStatus.OPEN),
  }),
});
