import { describe, expect, it } from 'vitest';
import { MemoryDatabaseService } from '../../../src/services/memory-database';

describe('MemoryDatabaseService', () => {
  it('creates and finds rows', async () => {
    const db = new MemoryDatabaseService();
    const created = await db.create('couple', { name: 'A' } as never);
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    const found = await db.findById('couple', created.id);
    expect(found?.name).toBe('A');
  });

  it('updates rows and bumps updatedAt for timestamped collections', async () => {
    const db = new MemoryDatabaseService();
    const created = await db.create('couple', { name: 'A' } as never);
    const original = created.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    const updated = await db.update('couple', created.id, { name: 'B' });
    expect(updated.name).toBe('B');
    expect(updated.updatedAt).not.toBe(original);
  });

  it('returns null for missing rows', async () => {
    const db = new MemoryDatabaseService();
    expect(await db.findById('user', 'nope')).toBeNull();
    expect(await db.findOne('user', { email: 'no@x' })).toBeNull();
  });

  it('throws when updating a missing row', async () => {
    const db = new MemoryDatabaseService();
    await expect(db.update('user', 'nope', { displayName: 'X' })).rejects.toThrow();
  });

  it('lists rows with limit + cursor pagination', async () => {
    const db = new MemoryDatabaseService();
    for (let i = 0; i < 5; i++) {
      await db.create('couple', { name: `C${i}` } as never);
      await new Promise((r) => setTimeout(r, 1));
    }
    const page1 = await db.list('couple', {
      orderBy: { column: 'createdAt', direction: 'asc' },
      limit: 2,
    });
    expect(page1.items.length).toBe(2);
    expect(page1.nextCursor).not.toBeNull();
    const page2 = await db.list('couple', {
      orderBy: { column: 'createdAt', direction: 'asc' },
      limit: 2,
      cursor: page1.nextCursor!,
    });
    expect(page2.items.length).toBe(2);
    expect(page2.items[0]?.id).not.toBe(page1.items[0]?.id);
  });

  it('filters by where clause', async () => {
    const db = new MemoryDatabaseService();
    await db.create('user', { email: 'a@x', displayName: 'A', avatarUrl: null, coupleId: 'c1' } as never);
    await db.create('user', { email: 'b@x', displayName: 'B', avatarUrl: null, coupleId: 'c2' } as never);
    const list = await db.list('user', { where: { coupleId: 'c1' } });
    expect(list.items.length).toBe(1);
    expect(list.items[0]?.email).toBe('a@x');
  });

  it('commits transaction on success', async () => {
    const db = new MemoryDatabaseService();
    const result = await db.transaction(async (tx) => {
      return await tx.create('couple', { name: 'TX' } as never);
    });
    expect(await db.findById('couple', result.id)).not.toBeNull();
  });

  it('rolls back transaction on throw', async () => {
    const db = new MemoryDatabaseService();
    await expect(
      db.transaction(async (tx) => {
        await tx.create('couple', { name: 'WILL ROLLBACK' } as never);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    const list = await db.list('couple');
    expect(list.items.find((c) => c.name === 'WILL ROLLBACK')).toBeUndefined();
  });

  it('deletes rows', async () => {
    const db = new MemoryDatabaseService();
    const created = await db.create('couple', { name: 'X' } as never);
    await db.delete('couple', created.id);
    expect(await db.findById('couple', created.id)).toBeNull();
  });

  it('ping returns true and dispose clears state', async () => {
    const db = new MemoryDatabaseService();
    expect(await db.ping()).toBe(true);
    await db.create('couple', { name: 'X' } as never);
    await db.dispose();
    expect((await db.list('couple')).items.length).toBe(0);
  });
});
