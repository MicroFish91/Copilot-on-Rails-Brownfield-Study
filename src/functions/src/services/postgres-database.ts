import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import type {
  Collection,
  CollectionTypeMap,
  CreateInput,
  IDatabaseService,
  ListOptions,
  ListResult,
  UpdateInput,
} from './interfaces/IDatabaseService';

export const COLLECTION_TO_TABLE: Record<Collection, string> = {
  user: 'users',
  couple: 'couples',
  invitation: 'invitations',
  photo: 'photos',
  session: 'sessions',
};

export function collectionToTable(c: Collection): string {
  return COLLECTION_TO_TABLE[c];
}

const STRIPPED_KEYS = new Set(['id', 'createdAt', 'updatedAt']);

export function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

export function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

export function rowToCamel<T = Record<string, unknown>>(row: QueryResultRow): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[snakeToCamel(k)] = v instanceof Date ? v.toISOString() : v;
  }
  return out as T;
}

interface CursorPayload {
  v: unknown;
  id: string;
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as CursorPayload;
    if (typeof parsed.id !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

interface Executor {
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<R>>;
}

export class PostgresDatabaseService implements IDatabaseService {
  private readonly pool: Pool | null;
  private readonly executor: Executor;

  constructor(input: { pool?: Pool; connectionString?: string; executor?: Executor }) {
    if (input.executor) {
      this.executor = input.executor;
      this.pool = input.pool ?? null;
    } else if (input.pool) {
      this.pool = input.pool;
      this.executor = input.pool;
    } else if (input.connectionString) {
      this.pool = new Pool({ connectionString: input.connectionString });
      this.executor = this.pool;
    } else {
      throw new Error('PostgresDatabaseService requires pool, executor, or connectionString');
    }
  }

  async transaction<T>(fn: (tx: IDatabaseService) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('Cannot start transaction without a Pool');
    }
    const client: PoolClient = await this.pool.connect();
    const txExecutor: Executor = {
      query: <R extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]) =>
        client.query<R>(text, values),
    };
    const tx = new PostgresDatabaseService({ executor: txExecutor });
    try {
      await client.query('BEGIN');
      const result = await fn(tx);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* ignore rollback failures */
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async findById<C extends Collection>(
    collection: C,
    id: string,
  ): Promise<CollectionTypeMap[C] | null> {
    const table = collectionToTable(collection);
    const r = await this.executor.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    const row = r.rows[0];
    return row ? (rowToCamel(row) as unknown as CollectionTypeMap[C]) : null;
  }

  async findOne<C extends Collection>(
    collection: C,
    where: Record<string, unknown>,
  ): Promise<CollectionTypeMap[C] | null> {
    const table = collectionToTable(collection);
    const keys = Object.keys(where);
    if (keys.length === 0) {
      const r = await this.executor.query(`SELECT * FROM ${table} LIMIT 1`);
      const row = r.rows[0];
      return row ? (rowToCamel(row) as unknown as CollectionTypeMap[C]) : null;
    }
    const conditions = keys.map((k, i) => `${camelToSnake(k)} = $${i + 1}`).join(' AND ');
    const values = keys.map((k) => where[k]);
    const r = await this.executor.query(
      `SELECT * FROM ${table} WHERE ${conditions} LIMIT 1`,
      values,
    );
    const row = r.rows[0];
    return row ? (rowToCamel(row) as unknown as CollectionTypeMap[C]) : null;
  }

  async list<C extends Collection>(
    collection: C,
    options: ListOptions = {},
  ): Promise<ListResult<CollectionTypeMap[C]>> {
    const table = collectionToTable(collection);
    const orderBy = options.orderBy ?? { column: 'createdAt', direction: 'desc' as const };
    const limit = Math.min(Math.max(options.limit ?? 24, 1), 100);

    const orderCol = camelToSnake(orderBy.column);
    const direction = orderBy.direction === 'asc' ? 'ASC' : 'DESC';
    const cmpOp = orderBy.direction === 'asc' ? '>' : '<';

    const whereParts: string[] = [];
    const values: unknown[] = [];

    for (const [k, v] of Object.entries(options.where ?? {})) {
      values.push(v);
      whereParts.push(`${camelToSnake(k)} = $${values.length}`);
    }

    if (options.cursor) {
      const cur = decodeCursor(options.cursor);
      if (cur) {
        values.push(cur.v);
        const vIdx = values.length;
        values.push(cur.id);
        const idIdx = values.length;
        whereParts.push(
          `(${orderCol}, id) ${cmpOp} ($${vIdx}, $${idIdx})`,
        );
      }
    }

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
    values.push(limit + 1);
    const limitIdx = values.length;
    const sql = `SELECT * FROM ${table} ${whereSql} ORDER BY ${orderCol} ${direction}, id ${direction} LIMIT $${limitIdx}`;
    const r = await this.executor.query(sql, values);
    const rows = r.rows.map((row) => rowToCamel(row));
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1] as Record<string, unknown> | undefined;
    const nextCursor =
      hasMore && last
        ? encodeCursor({ v: last[orderBy.column], id: last.id as string })
        : null;
    return {
      items: page as unknown as CollectionTypeMap[C][],
      nextCursor,
    };
  }

  async create<C extends Collection>(
    collection: C,
    input: CreateInput<C>,
  ): Promise<CollectionTypeMap[C]> {
    const table = collectionToTable(collection);
    const entries = Object.entries(input as Record<string, unknown>).filter(
      ([k]) => !STRIPPED_KEYS.has(k),
    );
    if (entries.length === 0) {
      const r = await this.executor.query(`INSERT INTO ${table} DEFAULT VALUES RETURNING *`);
      const row = r.rows[0];
      if (!row) throw new Error('INSERT returned no row');
      return rowToCamel(row) as unknown as CollectionTypeMap[C];
    }
    const cols = entries.map(([k]) => camelToSnake(k));
    const placeholders = entries.map((_, i) => `$${i + 1}`);
    const values = entries.map(([, v]) => v);
    const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    const r = await this.executor.query(sql, values);
    const row = r.rows[0];
    if (!row) throw new Error('INSERT returned no row');
    return rowToCamel(row) as unknown as CollectionTypeMap[C];
  }

  async update<C extends Collection>(
    collection: C,
    id: string,
    input: UpdateInput<C>,
  ): Promise<CollectionTypeMap[C]> {
    const table = collectionToTable(collection);
    const entries = Object.entries(input as Record<string, unknown>).filter(
      ([k]) => !STRIPPED_KEYS.has(k),
    );
    if (entries.length === 0) {
      const r = await this.executor.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
      const row = r.rows[0];
      if (!row) throw new Error(`${collection}/${id} not found`);
      return rowToCamel(row) as unknown as CollectionTypeMap[C];
    }
    const sets = entries.map(([k], i) => `${camelToSnake(k)} = $${i + 1}`);
    const values = entries.map(([, v]) => v);
    values.push(id);
    const sql = `UPDATE ${table} SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`;
    const r = await this.executor.query(sql, values);
    const row = r.rows[0];
    if (!row) throw new Error(`${collection}/${id} not found`);
    return rowToCamel(row) as unknown as CollectionTypeMap[C];
  }

  async delete<C extends Collection>(collection: C, id: string): Promise<void> {
    const table = collectionToTable(collection);
    await this.executor.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  }

  async ping(): Promise<boolean> {
    try {
      await this.executor.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async dispose(): Promise<void> {
    if (this.pool) await this.pool.end();
  }
}
