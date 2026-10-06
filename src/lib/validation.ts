import { z } from 'zod';
import { bloodGroups } from './domain';
export const phone = z
  .string()
  .regex(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number with 10–15 digits.');
export const password = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .max(128)
  .regex(/[a-z]/, 'Include a lowercase letter.')
  .regex(/[A-Z]/, 'Include an uppercase letter.')
  .regex(/[0-9]/, 'Include a number.')
  .regex(/[^a-zA-Z0-9]/, 'Include a symbol.');
export const registrationSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.email().toLowerCase(),
    phone,
    password,
    city: z.string().trim().min(2).max(80),
    bloodGroup: z.enum(bloodGroups),
    role: z.enum(['DONOR', 'PATIENT', 'HOSPITAL', 'BLOOD_BANK']),
    license: z.string().max(80).optional(),
    address: z.string().max(200).optional(),
  })
  .superRefine((data, ctx) => {
    if (['HOSPITAL', 'BLOOD_BANK'].includes(data.role) && (!data.license || !data.address))
      ctx.addIssue({
        code: 'custom',
        message: 'Organization license and address are required.',
        path: ['license'],
      });
  });
export const campaignSchema = z
  .object({
    title: z.string().trim().min(8).max(120),
    description: z.string().trim().min(40).max(5000),
    bloodGroup: z.enum(bloodGroups),
    targetUnits: z.coerce.number().int().min(1).max(500),
    city: z.string().trim().min(2).max(80),
    hospital: z.string().trim().min(3).max(120),
    contact: phone,
    categoryId: z.string().min(1),
    urgency: z.enum(['STANDARD', 'URGENT', 'EMERGENCY']),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.endDate > new Date(), {
    message: 'Choose a future closing date.',
    path: ['endDate'],
  });
