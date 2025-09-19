import { z } from 'zod';

export const studentCreateSchema = z.object({
  name: z.string().min(1, 'Name required').max(120),
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  studentId: z.string().min(1, 'Student ID required').max(40),
  year: z.coerce.number().int().min(1).max(8).optional(),
  major: z.string().max(120).optional(),
  gpa: z.coerce.number().min(0).max(4).optional(),
  status: z.enum(['active', 'inactive', 'graduated', 'suspended']).default('active'),
  clubs: z.string().optional(), // comma separated incoming
});

export type StudentCreateInput = z.infer<typeof studentCreateSchema>;

export function normalizeStudent(input: StudentCreateInput) {
  return {
    name: input.name.trim(),
    email: input.email?.trim() || undefined,
    studentId: input.studentId.trim(),
    year: input.year,
    major: input.major?.trim() || undefined,
    gpa: input.gpa,
    status: input.status,
    clubs: input.clubs ? input.clubs.split(',').map(c => c.trim()).filter(Boolean) : [],
    createdAt: new Date()
  };
}