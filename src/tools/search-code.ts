import fs from 'node:fs/promises';
import path from 'node:path';
import { redactSecrets } from '../security/secrets.js';
import { listFiles } from './list-files.js';

export async function searchCode(
  root: string,
  query: string,
  limit = 40,
): Promise<Array<{ path: string; line: number; excerpt: string }>> {
  const out: Array<{ path: string; line: number; excerpt: string }> = [];
  for (const file of await listFiles(root, 500)) {
    if (out.length >= limit) {
      break;
    }
    let text: string;
    try {
      text = await fs.readFile(path.join(root, file), 'utf8');
    } catch {
      continue;
    }
    if (text.includes('\0')) {
      continue;
    }
    text.split(/\r?\n/).forEach((line, index) => {
      if (
        out.length < limit &&
        line.toLowerCase().includes(query.toLowerCase())
      ) {
        out.push({
          path: file,
          line: index + 1,
          excerpt: redactSecrets(line.trim().slice(0, 300)),
        });
      }
    });
  }
  return out;
}
