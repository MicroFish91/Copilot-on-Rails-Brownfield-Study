import { afterAll, describe, expect, it } from 'vitest';
import {
  PostgresDatabaseService,
  camelToSnake,
  collectionToTable,
  rowToCamel,
  snakeToCamel,
} from '../../../src/services/postgres-database';

describe('postgres helpers', () => {
  it('maps collections to tables per plan Section 7a', () => {
    expect(collectionToTable('user')).toBe('users');
    expect(collectionToTable('couple')).toBe('couples');
    expect(collectionToTable('invitation')).toBe('invitations');
    expect(collectionToTable('photo')).toBe('photos');
    expect(collectionToTable('session')).toBe('sessions');
  });

  it('camelToSnake / snakeToCamel roundtrip', () => {
    expect(camelToSnake('coupleId')).toBe('couple_id');
    expect(snakeToCamel('couple_id')).toBe('coupleId');
    expect(snakeToCamel(camelToSnake('uploadedByUserId'))).toBe('uploadedByUserId');
  });

  it('rowToCamel converts dates to ISO strings', () => {
    const row = { couple_id: 'a', created_at: new Date('2026-01-01T00:00:00Z') };
    const out = rowToCamel<{ coupleId: string; createdAt: string }>(row);
    expect(out.coupleId).toBe('a');
    expect(out.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('PostgresDatabaseService (mocked executor)', () => {
  function mkService(rows: Record<string, unknown>[][]) {
    const calls: { text: string; values?: unknown[] }[] = [];
    let i = 0;
    const executor = {
      query: async (text: string, values?: unknown[]) => {
        calls.push({ text, ...(values ? { values } : {}) });
        return { rows: rows[i++] ?? [], rowCount: (rows[i - 1] ?? []).length } as never;
      },
    };
    const svc = new PostgresDatabaseService({ executor });
    return { svc, calls };
  }

  it('findById queries by id and returns camelCase row', async () => {
    const { svc, calls } = mkService([[{ id: '1', couple_id: 'c1', created_at: new Date('2026-01-01Z') }]]);
    const row = await svc.findById('user', '1');
    expect(row).toMatchObject({ id: '1', coupleId: 'c1' });
    expect(calls[0]?.text).toContain('FROM users');
  });

  it('findOne returns null when no row', async () => {
    const { svc } = mkService([[]]);
    expect(await svc.findOne('user', { email: 'x' })).toBeNull();
  });

  it('findOne with empty where uses LIMIT 1', async () => {
    const { svc, calls } = mkService([[{ id: '1' }]]);
    await svc.findOne('user', {});
    expect(calls[0]?.text).toMatch(/LIMIT 1/);
  });

  it('list builds WHERE + ORDER + LIMIT and returns nextCursor when more rows', async () => {
    const rows = Array.from({ length: 3 }, (_, i) => ({
      id: String(i),
      created_at: new Date(`2026-01-0${i + 1}T00:00:00Z`),
    }));
    const { svc, calls } = mkService([rows]);
    const result = await svc.list('photo', {
      where: { coupleId: 'c1' },
      orderBy: { column: 'createdAt', direction: 'desc' },
      limit: 2,
    });
    expect(result.items.length).toBe(2);
    expect(result.nextCursor).not.toBeNull();
    expect(calls[0]?.text).toContain('WHERE couple_id = $1');
    expect(calls[0]?.text).toContain('ORDER BY created_at DESC, id DESC');
  });

  it('list cursor decodes and adds tuple comparison', async () => {
    const cursor = Buffer.from(JSON.stringify({ v: '2026-01-01', id: 'x' })).toString(
      'base64url',
    );
    const { svc, calls } = mkService([[]]);
    await svc.list('photo', {
      where: { coupleId: 'c1' },
      orderBy: { column: 'createdAt', direction: 'asc' },
      limit: 2,
      cursor,
    });
    expect(calls[0]?.text).toContain('(created_at, id) >');
  });

  it('create strips id/createdAt/updatedAt and inserts', async () => {
    const { svc, calls } = mkService([[{ id: '1', email: 'a@x' }]]);
    await svc.create('user', {
      email: 'a@x',
      displayName: 'A',
      avatarUrl: null,
      coupleId: null,
    } as never);
    expect(calls[0]?.text).toContain('INSERT INTO users');
    expect(calls[0]?.text).toContain('email');
    expect(calls[0]?.text).not.toContain('id, created_at');
  });

  it('create with no fields uses DEFAULT VALUES', async () => {
    const { svc, calls } = mkService([[{ id: '1' }]]);
    await svc.create('user', {} as never);
    expect(calls[0]?.text).toContain('DEFAULT VALUES');
  });

  it('update with no fields returns existing row', async () => {
    const { svc, calls } = mkService([[{ id: '1', email: 'x' }]]);
    const r = await svc.update('user', '1', {});
    expect(r.id).toBe('1');
    expect(calls[0]?.text).toContain('SELECT *');
  });

  it('update builds SET clause and RETURNING', async () => {
    const { svc, calls } = mkService([[{ id: '1', display_name: 'B' }]]);
    await svc.update('user', '1', { displayName: 'B' });
    expect(calls[0]?.text).toContain('SET display_name = $1');
    expect(calls[0]?.text).toContain('RETURNING *');
  });

  it('update throws when no row returned', async () => {
    const { svc } = mkService([[]]);
    await expect(svc.update('user', '1', { displayName: 'B' })).rejects.toThrow();
  });

  it('delete issues DELETE statement', async () => {
    const { svc, calls } = mkService([[]]);
    await svc.delete('user', '1');
    expect(calls[0]?.text).toContain('DELETE FROM users');
  });

  it('ping returns true on success, false on throw', async () => {
    const okSvc = new PostgresDatabaseService({
      executor: { query: async () => ({ rows: [{ '?column?': 1 }] }) as never },
    });
    expect(await okSvc.ping()).toBe(true);
    const badSvc = new PostgresDatabaseService({
      executor: {
        query: async () => {
          throw new Error('down');
        },
      },
    });
    expect(await badSvc.ping()).toBe(false);
  });

  it('throws if no pool/executor/connectionString', () => {
    expect(() => new PostgresDatabaseService({})).toThrow();
  });

  it('transaction without a Pool throws', async () => {
    const svc = new PostgresDatabaseService({
      executor: { query: async () => ({ rows: [] }) as never },
    });
    await expect(svc.transaction(async () => 1)).rejects.toThrow(/Pool/);
  });
});

describe.skipIf(!process.env.INTEGRATION)('PostgresDatabaseService (integration)', () => {
  let svc: PostgresDatabaseService;

  afterAll(async () => {
    if (svc) await svc.dispose();
  });

  it('connects to a real Postgres', async () => {
    svc = new PostgresDatabaseService({
      connectionString: process.env.DATABASE_URL ?? '',
    });
    expect(await svc.ping()).toBe(true);
  });
});
