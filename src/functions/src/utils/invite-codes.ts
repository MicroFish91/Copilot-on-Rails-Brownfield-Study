import { randomBytes } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

export const INVITE_CODE_REGEX = /^[A-Z0-9]{8}$/;

export function generateInviteCode(): string {
  const buf = randomBytes(CODE_LENGTH);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const byte = buf[i] ?? 0;
    out += ALPHABET[byte % ALPHABET.length];
  }
  return out;
}

export function isValidInviteCode(code: string): boolean {
  return INVITE_CODE_REGEX.test(code);
}
