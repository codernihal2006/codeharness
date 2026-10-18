import fs from 'node:fs/promises';
import path from 'node:path';
import { configDir } from '../storage/config.js';

export type Catalog = Record<
  string,
  Array<{ id: string; name?: string; context_length?: number }>
>;
const cache = () => path.join(configDir(), 'models.json');
export async function getCatalog(
  fetcher: typeof fetch = fetch,
): Promise<{ catalog: Catalog; stale: boolean }> {
  try {
    const res = await fetcher('https://models.dev/api.json');
    if (!res.ok) {
      throw new Error('network');
    }
    const raw = (await res.json()) as any;
    const catalog: Catalog = {};
    for (const [provider, value] of Object.entries(raw ?? {})) {
      const models = (value as any)?.models ?? value;
      const entries = Array.isArray(models)
        ? models
        : Object.entries(models ?? {}).map(([id, model]) => ({
            ...(model as any),
            id,
          }));
      if (entries.length) {
        catalog[provider] = entries.map((m: any) => ({
          id: String(m.id ?? m.name),
          name: m.name,
          context_length: m.context_length,
        }));
      }
    }
    if (catalog.google && !catalog.gemini) {
      catalog.gemini = catalog.google;
    }
    await fs.mkdir(configDir(), { recursive: true, mode: 0o700 });
    await fs.writeFile(
      cache(),
      JSON.stringify({ fetchedAt: Date.now(), catalog }),
      { mode: 0o600 },
    );
    return { catalog, stale: false };
  } catch {
    try {
      const saved = JSON.parse(await fs.readFile(cache(), 'utf8'));
      return { catalog: saved.catalog as Catalog, stale: true };
    } catch {
      return { catalog: {}, stale: true };
    }
  }
}
