#!/usr/bin/env node
import { Command } from 'commander'; import { providersCommand } from './commands/providers.js'; import { modelsCommand } from './commands/models.js'; import { agentCommand } from './commands/agent.js'; import { startChat } from './commands/chat.js'; import { userMessage } from './utils/errors.js';
const program = new Command().name('codeharness').description('A Secure, Testable Harness for AI-Powered Codebase Investigation').version('0.1.0'); program.addCommand(providersCommand()).addCommand(modelsCommand()).addCommand(agentCommand());
if (process.argv.length <= 2) startChat().catch((e) => { console.error(`Error: ${userMessage(e)}`); process.exitCode = 1; }); else program.parseAsync().catch((e) => { console.error(`Error: ${userMessage(e)}`); process.exitCode = 1; });
