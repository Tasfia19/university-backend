import { z } from 'zod';

export const registerCourseSchema = z.object({
  body: z.object({
    sectionId: z.number().int().positive('Section ID is required'),
  }),
});
