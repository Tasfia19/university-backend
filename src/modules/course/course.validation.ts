import { z } from 'zod';

export const createCourseSchema = z.object({
  body: z.object({
    code: z.string().min(2, 'Course code is required'),
    title: z.string().min(2, 'Course title is required'),
    credits: z.number().positive().optional().default(3.0),
    departmentId: z.number().int().positive('Department ID is required'),
    prerequisiteId: z.number().int().positive().nullable().optional(),
    description: z.string().optional(),
  }),
});
