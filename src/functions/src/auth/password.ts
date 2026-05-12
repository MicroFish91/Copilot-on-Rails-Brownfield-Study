import bcrypt from 'bcryptjs';
import { loadConfig } from '../services/config';

export async function hashPassword(plain: string): Promise<string> {
  const cfg = loadConfig();
  return bcrypt.hash(plain, cfg.auth.bcryptCost);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}
