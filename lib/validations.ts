import { z } from 'zod'

export const LeadCreateSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal('')),
  status: z.enum(['new', 'engaged', 'meeting_scheduled', 'ghosted', 'done', 'unsubscribed']).optional(),
  bison_sender_email_id: z.number().optional().nullable(),
})

export const SequenceStepSchema = z.object({
  step_number: z.number().min(1),
  delay_days: z.number().min(0),
  delay_hours: z.number().min(0),
  send_on_weekends: z.boolean(),
  custom_message: z.string().optional()
})

export const SequenceCreateSchema = z.object({
  name: z.string().min(1, { message: "Sequence name is required" }),
  is_active: z.boolean().optional(),
  steps: z.array(SequenceStepSchema).min(1, { message: "At least one step is required" })
})
