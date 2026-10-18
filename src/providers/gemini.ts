import { GoogleGenAI } from '@google/genai';
import { LlmProvider, ProviderResponse, ToolDeclaration } from './types.js';
import { CodeHarnessError } from '../utils/errors.js';
export class GeminiProvider implements LlmProvider {
  readonly name = 'gemini';
  private ai: GoogleGenAI;
  constructor(apiKey: string) {
    if (!apiKey)
      throw new CodeHarnessError(
        'Gemini API key is missing. Set GEMINI_API_KEY or log in first.',
        'MISSING_CREDENTIAL',
      );
    this.ai = new GoogleGenAI({ apiKey });
  }
  async validateModel(model: string): Promise<boolean> {
    return !!model && !model.includes('/');
  }
  async generate(input: {
    system: string;
    contents: unknown[];
    tools: ToolDeclaration[];
    model: string;
    signal?: AbortSignal;
  }): Promise<ProviderResponse> {
    try {
      const response = await this.ai.models.generateContent({
        model: input.model,
        contents: input.contents as any,
        config: {
          systemInstruction: input.system,
          tools: [
            {
              functionDeclarations: input.tools.map((t) => ({
                name: t.name,
                description: t.description,
                parametersJsonSchema: t.parameters,
              })),
            },
          ],
          abortSignal: input.signal,
        } as any,
      });
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const toolCalls = parts.flatMap((part: any, index) =>
        part.functionCall
          ? [
              {
                id: part.functionCall.id ?? `call-${index}`,
                name: part.functionCall.name,
                args: part.functionCall.args ?? {},
              },
            ]
          : [],
      );
      return {
        text:
          parts
            .filter((p: any) => p.text)
            .map((p: any) => p.text)
            .join('\n') || undefined,
        toolCalls,
        raw: response,
        usage: {
          input: response.usageMetadata?.promptTokenCount,
          output: response.usageMetadata?.candidatesTokenCount,
        },
      };
    } catch (e) {
      const candidate = e as { status?: number; message?: string };
      const status = candidate.status;
      const message =
        candidate.message ?? (e instanceof Error ? e.message : String(e));
      if (
        status === 401 ||
        status === 403 ||
        /api key|unauth|permission denied/i.test(message)
      )
        throw new CodeHarnessError(
          'Gemini rejected the credentials.',
          'INVALID_CREDENTIALS',
        );
      if (
        status === 429 ||
        /quota|rate limit|resource exhausted/i.test(message)
      )
        throw new CodeHarnessError(
          'Gemini rate limit or quota exhausted.',
          'RATE_LIMIT',
        );
      if (
        status === 503 ||
        /service unavailable|temporarily unavailable/i.test(message)
      )
        throw new CodeHarnessError(
          'Gemini is temporarily unavailable. Try again or select another model.',
          'SERVICE_UNAVAILABLE',
        );
      if (/timeout|timed out|network|fetch| unavailable/i.test(message))
        throw new CodeHarnessError(
          'Gemini request failed due to a network or timeout error.',
          'NETWORK_ERROR',
        );
      if (status === 400)
        throw new CodeHarnessError(
          'Gemini rejected the request or selected model.',
          'INVALID_REQUEST',
        );
      throw new CodeHarnessError('Gemini request failed.', 'PROVIDER_ERROR');
    }
  }
}
