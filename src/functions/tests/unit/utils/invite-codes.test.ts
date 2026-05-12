import { describe, expect, it } from 'vitest';
import {
  INVITE_CODE_REGEX,
  generateInviteCode,
  isValidInviteCode,
} from '../../../src/utils/invite-codes';

describe('invite codes', () => {
  it('generates 8-char A-Z0-9 codes', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateInviteCode();
      expect(code).toMatch(INVITE_CODE_REGEX);
    }
  });

  it('isValidInviteCode mirrors regex', () => {
    expect(isValidInviteCode('ABCD2345')).toBe(true);
    expect(isValidInviteCode('abcd2345')).toBe(false);
    expect(isValidInviteCode('SHORT')).toBe(false);
    expect(isValidInviteCode('TOOLONG12')).toBe(false);
  });
});
