import { buildContext } from './context.js';
import { systemPrompt } from './prompts.js';
import { executeTool, declarations } from '../tools/registry.js';
import { LlmProvider } from '../providers/types.js';
import { CodeHarnessError } from '../utils/errors.js';

export async function runAgent(
  provider: LlmProvider,
  root: string,
  task: string,
  options: { model: string; maxSteps?: number; timeoutMs?: number },
): Promise<string> {
  const maxSteps = options.maxSteps ?? 8;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 120000,
  );
  const contents: unknown[] = [
    { role: 'user', parts: [{ text: await buildContext(root, task) }] },
  ];
  const seen = new Set<string>();
  try {
    for (let step = 0; step < maxSteps; step++) {
      const response = await provider.generate({
        system: systemPrompt,
        contents,
        tools: declarations,
        model: options.model,
        signal: controller.signal,
      });
      if (!response.toolCalls.length) {
        return (
          response.text ?? 'The provider returned no investigation report.'
        );
      }
      contents.push({
        role: 'model',
        parts: response.toolCalls.map((c) => ({
          functionCall: { name: c.name, args: c.args, id: c.id },
        })),
      });
      const results = [];
      for (const call of response.toolCalls) {
        const key = `${call.name}:${JSON.stringify(call.args)}`;
        const result = seen.has(key)
          ? {
              error:
                'Repeated tool call; choose a different investigation step.',
            }
          : await executeTool(root, call.name, call.args);
        seen.add(key);
        results.push({
          functionResponse: { id: call.id, name: call.name, response: result },
        });
      }
      contents.push({ role: 'user', parts: results });
    }
    return 'Investigation incomplete: the maximum agent step limit was reached. Findings are limited to the evidence gathered before the limit.';
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new CodeHarnessError('Investigation timed out.', 'TIMEOUT');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
