import type {
  Collection,
  CollectionTypeMap,
  CreateInput,
  IDatabaseService,
  ListOptions,
  ListResult,
  UpdateInput,
} from './interfaces/IDatabaseService';
import { newUuid } from '../utils/ids';

type Row = Record<string, unknown>;

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

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function nowIso(): string {
  return new Date().toISOString();
}

const TIMESTAMPED: ReadonlySet<Collection> = new Set<Collection>(['user', 'couple', 'photo']);

export class MemoryDatabaseService implements IDatabaseService {
  private store: Map<Collection, Map<string, Row>>;

  constructor(initial?: Map<Collection, Map<string, Row>>) {
    this.store = initial ?? new Map();
  }

  private bucket(c: Collection): Map<string, Row> {
    let b = this.store.get(c);
    if (!b) {
      b = new Map();
      this.store.set(c, b);
    }
    return b;
  }

  private snapshot(): Map<Collection, Map<string, Row>> {
    const copy = new Map<Collection, Map<string, Row>>();
    for (const [k, v] of this.store) {
      const inner = new Map<string, Row>();
      for (const [id, row] of v) inner.set(id, { ...row });
      copy.set(k, inner);
    }
    return copy;
  }

  async transaction<T>(fn: (tx: IDatabaseService) => Promise<T>): Promise<T> {
    const backup = this.snapshot();
    try {
      return await fn(this);
    } catch (err) {
      this.store = backup;
      throw err;
    }
  }

  async findById<C extends Collection>(
    collection: C,
    id: string,
  ): Promise<CollectionTypeMap[C] | null> {
    const row = this.bucket(collection).get(id);
    return row ? ({ ...row } as unknown as CollectionTypeMap[C]) : null;
  }

  async findOne<C extends Collection>(
    collection: C,
    where: Record<string, unknown>,
  ): Promise<CollectionTypeMap[C] | null> {
    for (const row of this.bucket(collection).values()) {
      if (matches(row, where)) return { ...row } as unknown as CollectionTypeMap[C];
    }
    return null;
  }

  async list<C extends Collection>(
    collection: C,
    options: ListOptions = {},
  ): Promise<ListResult<CollectionTypeMap[C]>> {
    const where = options.where ?? {};
    const orderBy = options.orderBy ?? { column: 'createdAt', direction: 'desc' as const };
    const limit = Math.min(Math.max(options.limit ?? 24, 1), 100);

    let items: Row[] = [];
    for (const row of this.bucket(collection).values()) {
      if (matches(row, where)) items.push(row);
    }

    items.sort((a, b) => {
      const cmp = compareValues(a[orderBy.column], b[orderBy.column]);
      if (cmp !== 0) return orderBy.direction === 'asc' ? cmp : -cmp;
      const idCmp = compareValues(a.id, b.id);
      return orderBy.direction === 'asc' ? idCmp : -idCmp;
    });

    if (options.cursor) {
      const cur = decodeCursor(options.cursor);
      if (cur) {
        const idx = items.findIndex(
          (r) =>
            compareValues(r[orderBy.column], cur.v) === 0 && r.id === cur.id,
        );
        if (idx >= 0) items = items.slice(idx + 1);
      }
    }

    const page = items.slice(0, limit);
    const hasMore = items.length > limit;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ v: last[orderBy.column], id: last.id as string })
        : null;

    return {
      items: page.map((r) => ({ ...r }) as unknown as CollectionTypeMap[C]),
      nextCursor,
    };
  }

  async create<C extends Collection>(
    collection: C,
    input: CreateInput<C>,
  ): Promise<CollectionTypeMap[C]> {
    const id = newUuid();
    const now = nowIso();
    const row: Row = { ...(input as Row), id, createdAt: now };
    if (TIMESTAMPED.has(collection) || collection === 'invitation') {
      row.updatedAt = now;
    }
    if (collection === 'invitation' || collection === 'session') {
      delete row.updatedAt;
    }
    if (TIMESTAMPED.has(collection)) row.updatedAt = now;
    this.bucket(collection).set(id, row);
    return { ...row } as unknown as CollectionTypeMap[C];
  }

  async update<C extends Collection>(
    collection: C,
    id: string,
    input: UpdateInput<C>,
  ): Promise<CollectionTypeMap[C]> {
    const bucket = this.bucket(collection);
    const existing = bucket.get(id);
    if (!existing) {
      throw new Error(`${collection}/${id} not found`);
    }
    const next: Row = { ...existing, ...(input as Row), id };
    if (TIMESTAMPED.has(collection)) next.updatedAt = nowIso();
    bucket.set(id, next);
    return { ...next } as unknown as CollectionTypeMap[C];
  }

  async delete<C extends Collection>(collection: C, id: string): Promise<void> {
    this.bucket(collection).delete(id);
  }

  async ping(): Promise<boolean> {
    return true;
  }

  async dispose(): Promise<void> {
    this.store.clear();
  }
}

function matches(row: Row, where: Record<string, unknown>): boolean {
  for (const [k, v] of Object.entries(where)) {
    if (row[k] !== v) return false;
  }
  return true;
}
