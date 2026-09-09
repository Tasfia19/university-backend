import { z } from 'zod';
import { AttendanceStatus } from '@prisma/client';

export const recordAttendanceSchema = z.object({
  body: z.object({
    sectionId: z.number().int().positive('Section ID is required'),
    studentId: z.number().int().positive('Student ID is required'),
    date: z.string().datetime().or(z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date' })),
    status: z.nativeEnum(AttendanceStatus).optional().default(AttendanceStatus.PRESENT),
    remarks: z.string().optional(),
  }),
});
