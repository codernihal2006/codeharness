const secretPatterns = [
  /(api[_-]?key|token|secret|password)\s*[:=]\s*["']?[^\s"']+/gi,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  /\bAIza[0-9A-Za-z_-]{20,}\b/g,
];

export function redactSecrets(value: string): string {
  return secretPatterns.reduce((result, pattern) => result.replace(pattern, '[REDACTED_SECRET]'), value);
}
