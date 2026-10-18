import path from 'node:path';
import fs from 'node:fs/promises';
import { Command } from 'commander';
import { loadConfig } from '../storage/config.js';
import { createProvider } from '../providers/registry.js';
import { runAgent } from '../agent/runner.js';

export function agentCommand(): Command {
  return new Command('agent')
    .requiredOption('-p, --prompt <prompt>')
    .option('--repo <path>', 'repository root', process.cwd())
    .action(async (o) => {
      const root = path.resolve(o.repo);
      try {
        if (!(await fs.stat(root)).isDirectory()) {
          throw new Error('not a directory');
        }
      } catch {
        throw new Error(
          `Repository root does not exist or is not a directory: ${root}`,
        );
      }
      const config = await loadConfig();
      const provider = await createProvider(config.provider ?? 'gemini');
      if (!config.model) {
        throw new Error(
          'No model selected. Run codeharness providers set gemini/<model-id>.',
        );
      }
      console.log(
        await runAgent(provider, root, o.prompt, { model: config.model }),
      );
    });
}
