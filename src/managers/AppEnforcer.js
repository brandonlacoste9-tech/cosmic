// src/managers/AppEnforcer.js
import { exec } from 'child_process';
import { promisify } from 'util';
import { log } from 'console';
import process from 'process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Advisor from '../agents/Advisor.js';
import RalphLoopManager from '../../backend/managers/RalphLoopManager.js';

const execAsync = promisify(exec);

// Helper for resource path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resourcesPath = process.resourcesPath || path.join(__dirname, '../../resources');

/**
 * Very small wrapper that keeps the list of allowed OS commands
 * to avoid arbitrary command injection from the UI.
 *
 * Each command is mapped to a shell string.  Add or remove entries
 * as your product evolves.
 */
const ALLOWED_COMMANDS = {
  deploy: (parameters) => {
    // Example: Deploy the node package
    const pkg = parameters?.package || 'node';
    const idMap = {
        'node': 'OpenJS.NodeJS.LTS',
        'git': 'Git.Git',
        'chrome': 'Google.Chrome',
        'gh': 'GitHub.cli'
    };
    
    // Fallback to local installer logic would go here, but for simple bridge we use winget
    const wingetId = idMap[pkg] || pkg;
    
    return `winget install --id ${wingetId} --silent --accept-package-agreements --accept-source-agreements`;
  },
  status: () => {
    return `echo Battalion Status: Active [${new Date().toLocaleTimeString()}]`;
  },
  'devhound:scan': async (parameters) => {
      const file = parameters?.file;
      if (!file) throw new Error("Missing file parameter");
      return await RalphLoopManager.scan(file);
  },
  'devhound:fix': async (parameters) => {
      const file = parameters?.file;
      if (!file) throw new Error("Missing file parameter");
      // Trigger async fix loop
      RalphLoopManager.startLoop({ 
          type: 'manual_trigger', 
          context: { targetFile: file } 
      });
      return { status: 'fix_initiated', file };
  }
};

/**
 * Execute a whitelisted command and return stdout/stderr.
 * @param {string} name  - key in ALLOWED_COMMANDS
 * @param {object} params - optional parameters for the command
 */
export async function runCommand(name, params = {}) {
  // 1. Validate Command Existence
  if (!ALLOWED_COMMANDS[name]) {
    throw new Error(`Command "${name}" is not allowed`);
  }

  // 2. Advisor Veto (DeepSeek Check)
  const veto = await Advisor.vet(name, params);
  if (!veto.approved) {
      log(`⛔ [AppEnforcer] Command Blocked: ${veto.reason}`);
      throw new Error(veto.reason);
  }

  // 3. Execution using verified command string
  const cmdOrResult = await ALLOWED_COMMANDS[name](params);

  // If result is NOT a string, it's a direct function return (RalphLoop)
  if (typeof cmdOrResult !== 'string') {
      log(`[AppEnforcer] Executed Internal Function: ${name}`);
      return cmdOrResult;
  }

  // Shell Command Execution
  log(`[AppEnforcer] executing: ${cmdOrResult}`);

  try {
    const { stdout, stderr } = await execAsync(cmdOrResult, {
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err) {
    return {
        stdout: err.stdout ?? '',
        stderr: err.stderr ?? err.message,
        exitCode: err.code,
    };
  }
}
