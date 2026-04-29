
import {z} from 'zod' 


export const createDoubtSchema = z.object({
  body: z.object({
    studentId: z.string(),
    teacherId: z.string(),
    subject: z.string(),
    description: z.string(),
    attachments: z.array(z.object({
      url: z.string(),
      fileName: z.string(),
      fileType: z.string(),
      publicId: z.string()
    })),
    status: z.string(),
    replies: z.array(z.object({
      by: z.object({
        _id: z.string(),
        fullname: z.string(),
        role: z.string()
      }),
      message: z.string(),
      attachments: z.array(z.object({
        url: z.string(),
        fileName: z.string(),
        fileType: z.string(),
        publicId: z.string()
      }))
    }))
  })
})