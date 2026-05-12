import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../../src/auth/password';

describe('password', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('hunter22!');
    expect(hash).not.toBe('hunter22!');
    expect(await verifyPassword('hunter22!', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('hunter22!');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('rejects when hash is empty', async () => {
    expect(await verifyPassword('x', '')).toBe(false);
  });

  it('returns false when hash is malformed', async () => {
    expect(await verifyPassword('x', 'not-a-bcrypt-hash')).toBe(false);
  });
});
