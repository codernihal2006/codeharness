import { Command } from 'commander';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { loadConfig, updateConfig } from '../storage/config.js';
import {
  getCredential,
  removeCredential,
  setCredential,
} from '../storage/credentials.js';
import { createProvider } from '../providers/registry.js';
import { getCatalog } from '../providers/model-catalog.js';
import { fetchOpenRouterModels } from '../providers/openrouter.js';

const supported = ['gemini', 'openrouter'];
export function providersCommand(): Command {
  const cmd = new Command('providers').description('Manage LLM providers');
  cmd.command('list').action(async () => {
    const config = await loadConfig();
    for (const provider of supported) {
      console.log(
        `${provider}\t${(await getCredential(provider)) ? 'authenticated' : 'not authenticated'}\t${config.provider === provider ? 'active' : ''}`,
      );
    }
  });
  cmd
    .command('login')
    .requiredOption('--provider <provider>')
    .option('--api-key <key>')
    .action(async (o) => {
      if (!supported.includes(o.provider)) {
        throw new Error(`Unknown provider: ${o.provider}`);
      }
      let key = o.apiKey;
      if (key) {
        console.error(
          'Warning: command-line secrets may be exposed in shell history or process listings.',
        );
      } else {
        const rl = readline.createInterface({ input, output });
        key = await rl.question(`${o.provider} API key: `);
        rl.close();
      }
      if (!key) {
        throw new Error('An API key is required.');
      }
      await setCredential(o.provider, key);
      await updateConfig({ provider: o.provider });
      console.log(`${o.provider} credentials saved securely.`);
    });
  cmd
    .command('logout')
    .requiredOption('--provider <provider>')
    .action(async (o) => {
      if (!supported.includes(o.provider)) {
        throw new Error(`Unknown provider: ${o.provider}`);
      }
      await removeCredential(o.provider);
      const config = await loadConfig();
      if (config.provider === o.provider) {
        await updateConfig({ provider: undefined, model: undefined });
      }
      console.log(`${o.provider} credentials removed.`);
    });
  cmd.command('set <selection>').action(async (selection) => {
    const slash = selection.indexOf('/');
    const provider = slash < 0 ? selection : selection.slice(0, slash);
    const model = slash < 0 ? '' : selection.slice(slash + 1);
    if (!provider || !model) {
      throw new Error(
        'Use provider/model, for example gemini/gemini-2.5-flash or openrouter/openrouter/free.',
      );
    }
    if (!supported.includes(provider)) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    await createProvider(provider);
    if (provider === 'openrouter' && model !== 'openrouter/free') {
      const models = await fetchOpenRouterModels();
      if (!models.some((entry) => entry.id === model)) {
        throw new Error(
          `Model ${model} was not found in the OpenRouter catalog.`,
        );
      }
    } else if (provider === 'gemini') {
      const { catalog } = await getCatalog();
      if (
        catalog.gemini &&
        !catalog.gemini.some((entry) => entry.id === model)
      ) {
        throw new Error(`Model ${model} was not found in the current catalog.`);
      }
    }
    await updateConfig({ provider, model });
    console.log(`Selected ${provider}/${model}.`);
  });
  return cmd;
}
