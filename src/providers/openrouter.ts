import { LlmProvider, ProviderResponse, ToolDeclaration } from './types.js';
import { CodeHarnessError } from '../utils/errors.js';

type OpenRouterModel = {
  id: string;
  name?: string;
  pricing?: { prompt?: string; completion?: string };
  supported_parameters?: string[];
};

function toMessages(contents: unknown[]): unknown[] {
  return contents.flatMap((entry: any) => {
    const parts = entry.parts ?? [];
    if (entry.role === 'model')
      return [
        {
          role: 'assistant',
          tool_calls: parts
            .filter((p: any) => p.functionCall)
            .map((p: any) => ({
              id: p.functionCall.id,
              type: 'function',
              function: {
                name: p.functionCall.name,
                arguments: JSON.stringify(p.functionCall.args ?? {}),
              },
            })),
        },
      ];
    const messages: unknown[] = [];
    const text = parts
      .filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join('\n');
    if (text)
      messages.push({
        role: entry.role === 'model' ? 'assistant' : 'user',
        content: text,
      });
    for (const part of parts.filter((p: any) => p.functionResponse))
      messages.push({
        role: 'tool',
        tool_call_id: part.functionResponse.id ?? part.functionResponse.name,
        content: JSON.stringify(part.functionResponse.response ?? {}),
      });
    return messages;
  });
}

export async function fetchOpenRouterModels(
  fetcher: typeof fetch = fetch,
): Promise<OpenRouterModel[]> {
  const response = await fetcher('https://openrouter.ai/api/v1/models');
  if (!response.ok)
    throw new CodeHarnessError(
      'OpenRouter model catalog is unavailable.',
      'CATALOG_UNAVAILABLE',
    );
  const data = (await response.json()) as { data?: OpenRouterModel[] };
  return data.data ?? [];
}

export class OpenRouterProvider implements LlmProvider {
  readonly name = 'openrouter';
  constructor(private readonly apiKey: string) {
    if (!apiKey)
      throw new CodeHarnessError(
        'OpenRouter API key is missing. Set OPENROUTER_API_KEY or log in first.',
        'MISSING_CREDENTIAL',
      );
  }
  async validateModel(model: string): Promise<boolean> {
    return model === 'openrouter/free' || model.includes('/');
  }
  async generate(input: {
    system: string;
    contents: unknown[];
    tools: ToolDeclaration[];
    model: string;
    signal?: AbortSignal;
  }): Promise<ProviderResponse> {
    try {
      const response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/S30-3-0/codeharness',
            'X-Title': 'CodeHarness',
          },
          body: JSON.stringify({
            model: input.model,
            messages: [
              { role: 'system', content: input.system },
              ...toMessages(input.contents),
            ],
            tools: input.tools.map((tool) => ({
              type: 'function',
              function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
              },
            })),
            tool_choice: 'auto',
          }),
          signal: input.signal,
        },
      );
      const data = (await response.json().catch(() => ({}))) as any;
      if (!response.ok) {
        if (response.status === 401 || response.status === 403)
          throw new CodeHarnessError(
            'OpenRouter rejected the credentials.',
            'INVALID_CREDENTIALS',
          );
        if (response.status === 429)
          throw new CodeHarnessError(
            'OpenRouter rate limit or quota exhausted.',
            'RATE_LIMIT',
          );
        if (response.status === 400)
          throw new CodeHarnessError(
            'OpenRouter rejected the request or selected model.',
            'INVALID_REQUEST',
          );
        throw new CodeHarnessError(
          'OpenRouter request failed.',
          'PROVIDER_ERROR',
        );
      }
      const message = data.choices?.[0]?.message ?? {};
      return {
        text: message.content || undefined,
        toolCalls: (message.tool_calls ?? []).map((call: any) => ({
          id: call.id,
          name: call.function.name,
          args: JSON.parse(call.function.arguments || '{}'),
        })),
        raw: data,
        usage: {
          input: data.usage?.prompt_tokens,
          output: data.usage?.completion_tokens,
        },
      };
    } catch (error) {
      if (error instanceof CodeHarnessError) throw error;
      if (error instanceof Error && error.name === 'AbortError')
        throw new CodeHarnessError('OpenRouter request timed out.', 'TIMEOUT');
      throw new CodeHarnessError(
        'OpenRouter request failed due to a network error.',
        'NETWORK_ERROR',
      );
    }
  }
}
