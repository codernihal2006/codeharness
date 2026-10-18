export class CodeHarnessError extends Error {
  constructor(
    message: string,
    public readonly code = 'CODEHARNESS_ERROR',
  ) {
    super(message);
    this.name = 'CodeHarnessError';
  }
}
export function userMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
