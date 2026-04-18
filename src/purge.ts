export interface PurgeResult {
  url: string;
  ok: boolean;
  status?: number;
  error?: string;
}

export type FetchLike = (
  input: string,
  init: { method: string },
) => Promise<{ ok: boolean; status: number }>;

export async function purgeOne(
  url: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<PurgeResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchImpl(url, { method: 'PURGE' });
      return { url, ok: res.ok, status: res.status };
    } catch (err) {
      lastError = err;
    }
  }
  return {
    url,
    ok: false,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  };
}

export async function purgeAll(
  urls: string[],
  concurrency: number,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
  onResult?: (result: PurgeResult, index: number) => void,
): Promise<PurgeResult[]> {
  const results: PurgeResult[] = new Array(urls.length);
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const i = cursor++;
      if (i >= urls.length) return;
      const result = await purgeOne(urls[i]!, fetchImpl);
      results[i] = result;
      onResult?.(result, i);
    }
  };

  const n = Math.max(1, Math.min(concurrency, urls.length));
  await Promise.all(Array.from({ length: n }, worker));
  return results;
}
