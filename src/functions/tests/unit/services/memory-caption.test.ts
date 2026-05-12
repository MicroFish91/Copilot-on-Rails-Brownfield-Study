import { describe, expect, it } from 'vitest';
import { MemoryCaptionService } from '../../../src/services/memory-caption';

describe('MemoryCaptionService', () => {
  it('produces deterministic caption for same input', async () => {
    const svc = new MemoryCaptionService();
    const a = await svc.generate({ bytes: Buffer.from('abc'), mimeType: 'image/jpeg' });
    const b = await svc.generate({ bytes: Buffer.from('abc'), mimeType: 'image/jpeg' });
    expect(a.caption).toBe(b.caption);
    expect(a.fromModel).toBe(false);
    expect(a.caption).toMatch(/^Memory [a-f0-9]{6}$/);
  });

  it('produces different caption for different input', async () => {
    const svc = new MemoryCaptionService();
    const a = await svc.generate({ bytes: Buffer.from('abc'), mimeType: 'image/jpeg' });
    const b = await svc.generate({ bytes: Buffer.from('xyz'), mimeType: 'image/jpeg' });
    expect(a.caption).not.toBe(b.caption);
  });

  it('ping returns true', async () => {
    expect(await new MemoryCaptionService().ping()).toBe(true);
  });
});
