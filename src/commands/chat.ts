import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { loadConfig } from '../storage/config.js';
import { createProvider } from '../providers/registry.js';
import { runAgent } from '../agent/runner.js';

export async function startChat(repo = process.cwd()): Promise<void> {
  const root = path.resolve(repo);
  const config = await loadConfig();
  if (!config.model) {
    console.log(
      'No model is selected yet. Run: codeharness providers set gemini/<model-id>',
    );
    console.log('Then run codeharness again. You only need to do this once.');
    return;
  }
  const provider = await createProvider(config.provider ?? 'gemini');
  const rl = readline.createInterface({ input, output });
  console.log('\nCodeHarness interactive mode');
  console.log(`Repository: ${root}`);
  console.log(
    'Ask questions in plain English. Type /help for examples or /exit to quit.\n',
  );
  try {
    while (true) {
      const prompt = (await rl.question('codeharness> ')).trim();
      if (!prompt) {
        continue;
      }
      if (prompt === '/exit' || prompt === '/quit') {
        break;
      }
      if (prompt === '/help') {
        console.log(
          'Try: “Explain this project”, “Find security issues”, or “What could crash?”',
        );
        console.log('Commands: /help, /repo, /exit');
        continue;
      }
      if (prompt === '/repo') {
        console.log(root);
        continue;
      }
      try {
        console.log('\nInvestigating...');
        console.log(
          await runAgent(provider, root, prompt, { model: config.model }),
        );
        console.log();
      } catch (error) {
        console.error(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  } finally {
    rl.close();
    console.log('Goodbye.');
  }
}
