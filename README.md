# CodeHarness

CodeHarness is a secure, read-only CLI for evidence-backed AI codebase investigation. It uses Gemini function calling to select bounded repository inspection tools instead of sending an entire repository to a model.

## Architecture

```text
CLI -> commands -> agent runner -> provider adapter (Gemini/OpenRouter)
                    |                  |
                    v                  v
             bounded tools        model catalog
                    |
             path/secret controls
```

The loop builds a small initial context, sends tool definitions to Gemini, validates each structured tool call with Zod, executes only read-only repository tools, returns results, and stops on a final response, timeout, repeated call, or step limit.

## Install and develop

```bash
npm install
npm run build
npm test
npm run lint
```

## Usage

```bash
codeharness
codeharness providers list
codeharness providers login --provider gemini
codeharness providers login --provider openrouter
codeharness providers set gemini/<model-id>
codeharness providers set openrouter/openrouter/free
codeharness models
codeharness agent -p "Explain this repository's architecture"
codeharness agent -p "Find potential authentication bugs" --repo /path/to/repository
```

Running `codeharness` without a subcommand opens interactive mode. Users can type natural-language questions repeatedly, use `/help`, print the active `/repo`, or exit with `/exit`. Advanced users can continue using the one-shot `agent -p` command.

Set `GEMINI_API_KEY` or `OPENROUTER_API_KEY` to use an environment-provided credential. OpenRouter supports `openrouter/free` and catalogued model IDs, but free-model availability and tool-calling support can change. Local fallback credentials and configuration live under `~/.config/codeharness/`, outside the project. The `--api-key` option is supported for compatibility but warns about shell history and process inspection.

## Security and limitations

The initial release does not execute shell commands or modify repositories. It rejects traversal, outside-root symlinks, binary files, oversized files, secret-bearing names and extensions, generated directories, and untrusted repository instructions. Read and search results redact common secret patterns. Credentials are never logged or included in prompts. Local credential files use user-only permissions, but permissions are not encryption. Gemini is the only implemented provider, the model catalog is best-effort, and the agent does not run repository tests.
