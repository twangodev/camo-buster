import { describe, expect, it, vi } from 'vitest';

import { purgeAll, purgeOne } from '../src/purge';

describe('purgeOne', () => {
  it('returns ok on a 2xx response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const result = await purgeOne('https://camo.githubusercontent.com/x', fetchImpl);
    expect(result).toEqual({ url: 'https://camo.githubusercontent.com/x', ok: true, status: 200 });
    expect(fetchImpl).toHaveBeenCalledWith('https://camo.githubusercontent.com/x', {
      method: 'PURGE',
    });
  });

  it('returns not-ok on a non-2xx response without retrying', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const result = await purgeOne('https://camo.githubusercontent.com/x', fetchImpl);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries once on network error and succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce({ ok: true, status: 200 });
    const result = await purgeOne('https://camo.githubusercontent.com/x', fetchImpl);
    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('gives up after two network errors', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('ECONNRESET'));
    const result = await purgeOne('https://camo.githubusercontent.com/x', fetchImpl);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('ECONNRESET');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe('purgeAll', () => {
  it('purges every URL and preserves order in results', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const urls = [
      'https://camo.githubusercontent.com/a',
      'https://camo.githubusercontent.com/b',
      'https://camo.githubusercontent.com/c',
    ];
    const results = await purgeAll(urls, 2, fetchImpl);
    expect(results).toHaveLength(3);
    expect(results.map(r => r.url)).toEqual(urls);
    expect(results.every(r => r.ok)).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('handles an empty URL list', async () => {
    const fetchImpl = vi.fn();
    const results = await purgeAll([], 4, fetchImpl);
    expect(results).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('respects concurrency as an upper bound', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchImpl = vi.fn().mockImplementation(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise(r => setTimeout(r, 5));
      inFlight--;
      return { ok: true, status: 200 };
    });
    const urls = Array.from({ length: 10 }, (_, i) => `https://camo.githubusercontent.com/${i}`);
    await purgeAll(urls, 3, fetchImpl);
    expect(maxInFlight).toBeLessThanOrEqual(3);
  });
});
