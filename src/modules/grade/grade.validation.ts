import { z } from 'zod';

export const submitGradeSchema = z.object({
  body: z.object({
    studentId: z.number().int().positive('Student ID is required'),
    sectionId: z.number().int().positive('Section ID is required'),
    marks: z.number().min(0).max(100, 'Marks must be between 0 and 100'),
  }),
});
