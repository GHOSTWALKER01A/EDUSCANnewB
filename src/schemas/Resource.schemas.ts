
import { z } from 'zod';

export const createResourceSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().optional(),
    resourceType: z.enum(['Academic Material', 'Previous year paper', 'Video', 'Other']),
    fileRemoved: z.string().optional(),
  })
});

export type CreateResourceInput = z.infer<typeof createResourceSchema>['body'];
