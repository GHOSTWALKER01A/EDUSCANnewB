import { z } from 'zod'

export const EventSchema = z.object({
  body: z.object({
    title: z.string().trim().max(200, 'Title must be at most 200 characters'),
    description: z.string().trim().max(2000, 'Description must be at most 2000 characters'),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    location: z.string().trim().optional(),
    category: z.string().trim().optional(),
    mediaType: z.string().optional(),
    fileRemoved: z.string().optional(),
    createdBy: z.string().optional(),

  })
})

export type CreateEventInput = z.infer<typeof EventSchema>['body'];