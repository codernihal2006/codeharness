import { describe, expect, it, vi } from 'vitest';
import { OpenRouterProvider, fetchOpenRouterModels } from '../../src/providers/openrouter.js';

describe('OpenRouter provider', () => {
  it('normalizes structured tool calls and tool results', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: 'done', tool_calls: [{ id: 'call-1', function: { name: 'read_file', arguments: '{"path":"README.md"}' } }] } }] }), { status: 200 }));
    const provider = new OpenRouterProvider('test-key');
    const response = await provider.generate({ system: 'safe', model: 'openrouter/free', tools: [{ name: 'read_file', description: 'read', parameters: { type: 'object' } }], contents: [{ role: 'user', parts: [{ text: 'inspect' }] }] });
    expect(response.toolCalls[0]).toMatchObject({ id: 'call-1', name: 'read_file', args: { path: 'README.md' } });
    expect(fetchMock.mock.calls[0]?.[1]?.body).toContain('openrouter/free');
    fetchMock.mockRestore();
  });
  it('loads the OpenRouter catalog without an API key', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: [{ id: 'example/free' }] }), { status: 200 }));
    await expect(fetchOpenRouterModels()).resolves.toEqual([{ id: 'example/free' }]);
    fetchMock.mockRestore();
  });
});
