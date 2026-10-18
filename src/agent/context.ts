import fs from 'node:fs/promises';
import path from 'node:path';
import { listFiles } from '../tools/list-files.js';
export async function buildContext(
  root: string,
  task: string,
): Promise<string> {
  const files = await listFiles(root, 120);
  let metadata = '';
  for (const name of ['package.json', 'README.md', 'tsconfig.json']) {
    try {
      metadata += `\n--- ${name} ---\n${(await fs.readFile(path.join(root, name), 'utf8')).slice(0, 12000)}`;
    } catch {
      /* optional */
    }
  }
  return `Task: ${task}\nRepository root: ${root}\nFiles:\n${files.join('\n')}${metadata}`;
}
