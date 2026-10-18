import { z } from 'zod';
import { listFiles } from './list-files.js';
import { readFile } from './read-file.js';
import { searchCode } from './search-code.js';
export const declarations = [
  {
    name: 'list_files',
    description: 'List safe repository-relative files.',
    parameters: { type: 'object', properties: { limit: { type: 'integer' } } },
  },
  {
    name: 'read_file',
    description: 'Read a safe source file with line numbers.',
    parameters: {
      type: 'object',
      required: ['path'],
      properties: {
        path: { type: 'string' },
        startLine: { type: 'integer' },
        endLine: { type: 'integer' },
      },
    },
  },
  {
    name: 'search_code',
    description: 'Search source files for text or symbols.',
    parameters: {
      type: 'object',
      required: ['query'],
      properties: { query: { type: 'string' }, limit: { type: 'integer' } },
    },
  },
];
const schemas = {
  list_files: z.object({
    limit: z.number().int().positive().max(500).optional(),
  }),
  read_file: z.object({
    path: z.string().min(1),
    startLine: z.number().int().positive().optional(),
    endLine: z.number().int().positive().optional(),
  }),
  search_code: z.object({
    query: z.string().min(1).max(200),
    limit: z.number().int().positive().max(100).optional(),
  }),
};
export async function executeTool(
  root: string,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (!(name in schemas)) return { error: 'Unknown tool.' };
  try {
    if (name === 'list_files')
      return {
        files: await listFiles(root, schemas.list_files.parse(args).limit),
      };
    if (name === 'read_file')
      return { content: await readFile(root, schemas.read_file.parse(args)) };
    return {
      matches: await searchCode(
        root,
        schemas.search_code.parse(args).query,
        schemas.search_code.parse(args).limit,
      ),
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
