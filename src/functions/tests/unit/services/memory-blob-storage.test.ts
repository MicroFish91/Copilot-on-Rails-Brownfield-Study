import { describe, expect, it } from 'vitest';
import { MemoryBlobStorageService } from '../../../src/services/memory-blob-storage';

describe('MemoryBlobStorageService', () => {
  it('puts and gets a blob', async () => {
    const svc = new MemoryBlobStorageService();
    const info = await svc.put('a/b.txt', Buffer.from('hello'), {
      contentType: 'text/plain',
    });
    expect(info.blobName).toBe('a/b.txt');
    expect(info.sizeBytes).toBe(5);
    const out = await svc.get('a/b.txt');
    expect(out.toString()).toBe('hello');
  });

  it('throws when getting a missing blob', async () => {
    const svc = new MemoryBlobStorageService();
    await expect(svc.get('nope')).rejects.toThrow();
  });

  it('idempotent delete (no throw if missing)', async () => {
    const svc = new MemoryBlobStorageService();
    await svc.delete('nope');
    await svc.put('x', Buffer.from('y'), { contentType: 'text/plain' });
    await svc.delete('x');
    expect(svc.has('x')).toBe(false);
  });

  it('ping returns true', async () => {
    expect(await new MemoryBlobStorageService().ping()).toBe(true);
  });
});
