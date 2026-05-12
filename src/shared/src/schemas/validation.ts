import { z } from 'zod';

/**
 * Zod schemas — request validation + canonical request types via `z.infer`.
 * Per Shared Types Rule: schemas live here; entity + response types in `types/`.
 */

// ---- Primitives ---------------------------------------------------------

export const uuidSchema = z.string().uuid('Must be a valid UUID');
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Must be a valid email address')
  .max(254);
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');
export const displayNameSchema = z.string().trim().min(1).max(80);

// ---- Auth ---------------------------------------------------------------

export const registerRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

// ---- Users --------------------------------------------------------------

export const updateUserRequestSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    avatarUrl: z.string().url().max(2048).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Provide at least one field to update',
  });
export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;

// ---- Couples ------------------------------------------------------------

export const createCoupleRequestSchema = z.object({
  name: z.string().trim().min(1).max(80),
});
export type CreateCoupleRequest = z.infer<typeof createCoupleRequestSchema>;

export const joinCoupleRequestSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{8}$/, 'Invite code must be 8 alphanumeric characters'),
});
export type JoinCoupleRequest = z.infer<typeof joinCoupleRequestSchema>;

// ---- Photos -------------------------------------------------------------

export const photoIdParamSchema = z.object({ id: uuidSchema });
export type PhotoIdParam = z.infer<typeof photoIdParamSchema>;

export const photoListQuerySchema = z.object({
  cursor: z.string().min(1).max(256).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});
export type PhotoListQuery = z.infer<typeof photoListQuerySchema>;

export const photoUploadMetadataSchema = z.object({
  takenAt: z.string().datetime().optional(),
});
export type PhotoUploadMetadata = z.infer<typeof photoUploadMetadataSchema>;
