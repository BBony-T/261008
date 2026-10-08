import { z } from 'zod';
export const criterionSchema = z.object({ id: z.string().min(1).max(80), title: z.string().trim().min(1).max(100), description: z.string().trim().min(1).max(2000), maxScore: z.number().int().min(1).max(100) });
export const rubricSchema = z.object({ name: z.string().trim().min(1).max(100), criteria: z.array(criterionSchema).min(1).max(20) }).refine(r => new Set(r.criteria.map(c => c.id)).size === r.criteria.length, '중복된 기준 ID');
export const resultSchema = z.object({ summary: z.string().min(1).max(5000), criteria: z.array(z.object({ criterionId: z.string(), score: z.number().min(0), evidence: z.string().min(1).max(5000), suggestion: z.string().min(1).max(5000) })).min(1).max(20) });
export type Criterion = z.infer<typeof criterionSchema>;
export type Rubric = z.infer<typeof rubricSchema> & { id: string };
export type Evaluation = z.infer<typeof resultSchema> & { id: string; fileName: string; storagePath: string; rubricName: string; rubricCriteria: Criterion[]; createdAt: string; totalScore: number; maxScore: number };
