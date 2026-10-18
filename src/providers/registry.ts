import { getCredential } from '../storage/credentials.js';
import { CodeHarnessError } from '../utils/errors.js';
import { GeminiProvider } from './gemini.js';
import { OpenRouterProvider } from './openrouter.js';

export async function createProvider(name: string) {
  if (name === 'gemini') {
    return new GeminiProvider((await getCredential('gemini')) ?? '');
  }
  if (name === 'openrouter') {
    return new OpenRouterProvider((await getCredential('openrouter')) ?? '');
  }
  throw new CodeHarnessError(`Unknown provider: ${name}`, 'UNKNOWN_PROVIDER');
}
