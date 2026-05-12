import { describe, expect, it } from 'vitest';
import {
  createCoupleRequestSchema,
  emailSchema,
  joinCoupleRequestSchema,
  loginRequestSchema,
  passwordSchema,
  photoIdParamSchema,
  photoListQuerySchema,
  registerRequestSchema,
  updateUserRequestSchema,
  uuidSchema,
} from '../../schemas/validation.js';

describe('primitive schemas', () => {
  it('emailSchema lowercases and trims', () => {
    expect(emailSchema.parse('  Foo@Example.COM ')).toBe('foo@example.com');
  });

  it('emailSchema rejects bad addresses', () => {
    expect(() => emailSchema.parse('not-an-email')).toThrow();
  });

  it('passwordSchema enforces 8 char minimum', () => {
    expect(() => passwordSchema.parse('short')).toThrow();
    expect(passwordSchema.parse('eightcharacters')).toBe('eightcharacters');
  });

  it('uuidSchema validates uuids', () => {
    expect(() => uuidSchema.parse('not-a-uuid')).toThrow();
    expect(uuidSchema.parse('550e8400-e29b-41d4-a716-446655440000')).toBeTruthy();
  });
});

describe('registerRequestSchema', () => {
  it('parses a valid request', () => {
    const parsed = registerRequestSchema.parse({
      email: 'A@B.com',
      password: 'verysecurepw',
      displayName: '  Avery  ',
    });
    expect(parsed).toEqual({
      email: 'a@b.com',
      password: 'verysecurepw',
      displayName: 'Avery',
    });
  });

  it('rejects short passwords', () => {
    expect(() =>
      registerRequestSchema.parse({
        email: 'a@b.com',
        password: 'short',
        displayName: 'A',
      }),
    ).toThrow();
  });
});

describe('loginRequestSchema', () => {
  it('accepts any non-empty password', () => {
    const parsed = loginRequestSchema.parse({ email: 'a@b.com', password: 'x' });
    expect(parsed.password).toBe('x');
  });
});

describe('updateUserRequestSchema', () => {
  it('requires at least one field', () => {
    expect(() => updateUserRequestSchema.parse({})).toThrow();
  });

  it('accepts displayName only', () => {
    expect(updateUserRequestSchema.parse({ displayName: 'New' })).toEqual({
      displayName: 'New',
    });
  });

  it('accepts avatarUrl null (clear)', () => {
    expect(updateUserRequestSchema.parse({ avatarUrl: null })).toEqual({
      avatarUrl: null,
    });
  });

  it('rejects invalid avatar url', () => {
    expect(() => updateUserRequestSchema.parse({ avatarUrl: 'not-a-url' })).toThrow();
  });
});

describe('couple schemas', () => {
  it('createCoupleRequestSchema trims and bounds name', () => {
    expect(createCoupleRequestSchema.parse({ name: '  us  ' })).toEqual({ name: 'us' });
    expect(() => createCoupleRequestSchema.parse({ name: '' })).toThrow();
  });

  it('joinCoupleRequestSchema uppercases and validates 8-char alnum', () => {
    expect(joinCoupleRequestSchema.parse({ code: 'abcd1234' })).toEqual({
      code: 'ABCD1234',
    });
    expect(() => joinCoupleRequestSchema.parse({ code: 'short' })).toThrow();
    expect(() => joinCoupleRequestSchema.parse({ code: 'ABCD!@#$' })).toThrow();
  });
});

describe('photo schemas', () => {
  it('photoIdParamSchema validates uuids', () => {
    expect(() => photoIdParamSchema.parse({ id: 'nope' })).toThrow();
  });

  it('photoListQuerySchema coerces limit and applies default', () => {
    expect(photoListQuerySchema.parse({})).toEqual({ limit: 24 });
    expect(photoListQuerySchema.parse({ limit: '5' })).toEqual({ limit: 5 });
  });

  it('photoListQuerySchema rejects out-of-range limits', () => {
    expect(() => photoListQuerySchema.parse({ limit: '0' })).toThrow();
    expect(() => photoListQuerySchema.parse({ limit: '101' })).toThrow();
  });
});
