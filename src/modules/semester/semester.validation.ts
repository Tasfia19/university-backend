import { z } from 'zod';
import { SemesterTerm } from '@prisma/client';

export const createSemesterSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Semester name is required'),
    year: z.number().int().positive('Year is required'),
    term: z.nativeEnum(SemesterTerm),
    startDate: z.string().datetime().or(z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date' })),
    endDate: z.string().datetime().or(z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date' })),
    isRegistrationOpen: z.boolean().optional().default(true),
  }),
});
