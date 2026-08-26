import { z } from 'zod';
import { AMS_OPTIONS } from '@/lib/ams/catalog';

export const attributionSchema = z.object({
  utm_source: z.string().max(255).nullable().optional(),
  utm_medium: z.string().max(255).nullable().optional(),
  utm_campaign: z.string().max(255).nullable().optional(),
  utm_content: z.string().max(255).nullable().optional(),
  landing_url: z.string().max(2048).nullable().optional(),
  referrer: z.string().max(2048).nullable().optional(),
});

export const startSchema = z.object({
  first_name: z.string().trim().min(1, 'Enter your first name').max(100),
  last_name: z.string().trim().min(1, 'Enter your last name').max(100),
  email: z.string().trim().email('Enter a valid work email').max(254),
  attribution: attributionSchema.optional(),
});

export const verifySchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the six digits from your email'),
});

export const amsSchema = z.object({
  ams_name: z.enum(AMS_OPTIONS),
  /** Optional, and the single most useful field for ranking integration demand. */
  book_size_est: z.number().int().min(0).max(10_000_000).nullable().optional(),
  agency_name: z.string().trim().max(200).nullable().optional(),
});
