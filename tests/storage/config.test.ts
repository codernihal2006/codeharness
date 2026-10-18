import { describe, expect, it, beforeEach } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { saveConfig, loadConfig } from '../../src/storage/config.js';

describe('config', () => {
  beforeEach(async () => {
    process.env.CODEHARNESS_CONFIG_DIR = await fs.mkdtemp(
      path.join(os.tmpdir(), 'ch-config-'),
    );
  });
  it('persists non-sensitive settings', async () => {
    await saveConfig({ version: 1, provider: 'gemini', model: 'x' });
    await expect(loadConfig()).resolves.toMatchObject({ model: 'x' });
  });
});
