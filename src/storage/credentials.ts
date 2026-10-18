import fs from 'node:fs/promises';
import path from 'node:path';
import { configDir } from './config.js';
import { CodeHarnessError } from '../utils/errors.js';
const file = () => path.join(configDir(), 'credentials.json');
export async function getCredential(
  provider: string,
): Promise<string | undefined> {
  const env =
    provider === 'gemini'
      ? process.env.GEMINI_API_KEY
      : provider === 'openrouter'
        ? process.env.OPENROUTER_API_KEY
        : undefined;
  if (env) return env;
  try {
    return (
      JSON.parse(await fs.readFile(file(), 'utf8')) as Record<string, string>
    )[provider];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw new CodeHarnessError(
      'Credential storage is corrupted. Remove credentials.json and log in again.',
      'CREDENTIALS_INVALID',
    );
  }
}
export async function setCredential(
  provider: string,
  value: string,
): Promise<void> {
  await fs.mkdir(configDir(), { recursive: true, mode: 0o700 });
  let current: Record<string, string> = {};
  try {
    current = JSON.parse(await fs.readFile(file(), 'utf8')) as Record<
      string,
      string
    >;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT')
      throw new CodeHarnessError(
        'Credential storage is corrupted.',
        'CREDENTIALS_INVALID',
      );
  }
  const temp = `${file()}.tmp-${process.pid}`;
  await fs.writeFile(temp, JSON.stringify({ ...current, [provider]: value }), {
    mode: 0o600,
  });
  await fs.rename(temp, file());
}
export async function removeCredential(provider: string): Promise<void> {
  try {
    const current = JSON.parse(await fs.readFile(file(), 'utf8')) as Record<
      string,
      string
    >;
    delete current[provider];
    await fs.writeFile(file(), JSON.stringify(current), { mode: 0o600 });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT')
      throw new CodeHarnessError(
        'Credential storage is corrupted.',
        'CREDENTIALS_INVALID',
      );
  }
}
