import { describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { safeRelative } from '../../src/security/paths.js';
import { readFile } from '../../src/tools/read-file.js';
describe('repository safety', () => {
  it('rejects traversal', () =>
    expect(() => safeRelative('/repo', '../secret')).toThrow());
  it('excludes secret filename variants', () => {
    expect(() => safeRelative('/repo', 'id_rsa.pub')).toThrow();
    expect(() => safeRelative('/repo', 'backup.pem')).toThrow();
  });
  it('line numbers and redacts secrets', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ch-'));
    await fs.writeFile(
      path.join(root, 'a.ts'),
      'one\napiKey = "hidden-value"\ntwo\n',
    );
    await expect(readFile(root, { path: 'a.ts' })).resolves.toContain(
      '2: [REDACTED_SECRET]',
    );
    await expect(readFile(root, { path: '.env' })).rejects.toThrow();
  });
});
