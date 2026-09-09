import { z } from 'zod';
import { DegreeLevel } from '@prisma/client';

export const createProgramSchema = z.object({
  body: z.object({
    code: z.string().min(2, 'Program code is required'),
    name: z.string().min(2, 'Program name is required'),
    degreeLevel: z.nativeEnum(DegreeLevel).optional().default(DegreeLevel.BACHELOR),
    totalCredits: z.number().int().positive().optional().default(120),
    departmentId: z.number().int().positive('Department ID is required'),
  }),
});
