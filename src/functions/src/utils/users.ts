import type { User } from '@duo-scrapbook/shared';

export type UserRow = User & { passwordHash: string };

export function toPublicUser(row: User | UserRow): User {
  const r = row as UserRow;
  const { passwordHash: _hash, ...rest } = r;
  void _hash;
  return rest as User;
}
