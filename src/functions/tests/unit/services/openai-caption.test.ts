import { describe, expect, it, vi } from 'vitest';

const createMock = vi.fn();
vi.mock('openai', () => {
  return {
    AzureOpenAI: class {
      public chat = {
        completions: {
          create: (...args: unknown[]) => createMock(...args),
        },
      };
    },
  };
});

import { OpenAICaptionService } from '../../../src/services/openai-caption';

describe('OpenAICaptionService', () => {
  it('constructor does not throw with null cfg', () => {
    expect(() => new OpenAICaptionService(null)).not.toThrow();
  });

  it('returns fallback when cfg is null', async () => {
    const svc = new OpenAICaptionService(null);
    const r = await svc.generate({ bytes: Buffer.from('x'), mimeType: 'image/jpeg' });
    expect(r.fromModel).toBe(false);
    expect(r.caption).toBe('A new memory.');
  });

  it('returns fallback when API throws', async () => {
    createMock.mockRejectedValueOnce(new Error('boom'));
    const svc = new OpenAICaptionService({
      endpoint: 'https://x',
      apiKey: 'k',
      apiVersion: '2024',
      deployment: 'd',
    });
    const r = await svc.generate({ bytes: Buffer.from('x'), mimeType: 'image/jpeg' });
    expect(r.fromModel).toBe(false);
    expect(r.caption).toBe('A new memory.');
  });

  it('returns model caption on success', async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: 'A lovely shot.' } }],
    });
    const svc = new OpenAICaptionService({
      endpoint: 'https://x',
      apiKey: 'k',
      apiVersion: '2024',
      deployment: 'd',
    });
    const r = await svc.generate({ bytes: Buffer.from('x'), mimeType: 'image/jpeg' });
    expect(r.fromModel).toBe(true);
    expect(r.caption).toBe('A lovely shot.');
  });

  it('returns fallback on empty model response', async () => {
    createMock.mockResolvedValueOnce({ choices: [{ message: { content: '' } }] });
    const svc = new OpenAICaptionService({
      endpoint: 'https://x',
      apiKey: 'k',
      apiVersion: '2024',
      deployment: 'd',
    });
    const r = await svc.generate({ bytes: Buffer.from('x'), mimeType: 'image/jpeg' });
    expect(r.fromModel).toBe(false);
  });

  it('ping reflects cfg presence', async () => {
    expect(await new OpenAICaptionService(null).ping()).toBe(false);
    expect(
      await new OpenAICaptionService({
        endpoint: 'https://x',
        apiKey: 'k',
        apiVersion: '2024',
        deployment: 'd',
      }).ping(),
    ).toBe(true);
  });
});
