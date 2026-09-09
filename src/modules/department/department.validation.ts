import { z } from 'zod';

export const createDepartmentSchema = z.object({
  body: z.object({
    code: z.string().min(2, 'Department code is required'),
    name: z.string().min(2, 'Department name is required'),
    description: z.string().optional(),
  }),
});
