/**
 * Database service interface — abstracts all relational access.
 * Concrete impls: postgres-database (Postgres) and memory-database (in-memory fake).
 *
 * IMPORTANT: collection names are domain singulars (e.g. 'user', 'photo').
 * Concrete impls MUST map them to table names per plan Section 7a
 * (camelToSnake + pluralize).
 */

import type { Couple, Invitation, Photo, Session, User } from '@duo-scrapbook/shared';

export type Collection = 'user' | 'couple' | 'invitation' | 'photo' | 'session';

export interface CollectionTypeMap {
  user: User;
  couple: Couple;
  invitation: Invitation;
  photo: Photo;
  session: Session;
}

/**
 * Auto-managed columns (id, createdAt, updatedAt) are stripped server-side
 * by the concrete repo before INSERT/UPDATE.
 */
export type CreateInput<C extends Collection> = Omit<
  CollectionTypeMap[C],
  'id' | 'createdAt' | 'updatedAt'
>;

export type UpdateInput<C extends Collection> = Partial<
  Omit<CollectionTypeMap[C], 'id' | 'createdAt' | 'updatedAt'>
>;

export interface ListOptions {
  /** Filter by exact column matches (camelCase keys). */
  where?: Record<string, unknown>;
  /** Order by column (camelCase) + direction. */
  orderBy?: { column: string; direction: 'asc' | 'desc' };
  /** Pagination — opaque cursor produced by previous list call. */
  cursor?: string;
  limit?: number;
}

export interface ListResult<T> {
  items: T[];
  nextCursor: string | null;
}

export interface IDatabaseService {
  /** Run a function inside a transaction. Roll back on throw. */
  transaction<T>(fn: (tx: IDatabaseService) => Promise<T>): Promise<T>;

  findById<C extends Collection>(
    collection: C,
    id: string,
  ): Promise<CollectionTypeMap[C] | null>;

  findOne<C extends Collection>(
    collection: C,
    where: Record<string, unknown>,
  ): Promise<CollectionTypeMap[C] | null>;

  list<C extends Collection>(
    collection: C,
    options?: ListOptions,
  ): Promise<ListResult<CollectionTypeMap[C]>>;

  create<C extends Collection>(
    collection: C,
    input: CreateInput<C>,
  ): Promise<CollectionTypeMap[C]>;

  update<C extends Collection>(
    collection: C,
    id: string,
    input: UpdateInput<C>,
  ): Promise<CollectionTypeMap[C]>;

  delete<C extends Collection>(collection: C, id: string): Promise<void>;

  /** Health probe — `true` if the DB is reachable. */
  ping(): Promise<boolean>;

  /** Cleanly close the underlying pool. */
  dispose(): Promise<void>;
}
