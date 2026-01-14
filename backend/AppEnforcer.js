import { exec } from 'child_process';
import { promisify } from 'util';
import Advisor from './Advisor.js';

const execAsync = promisify(exec);

const ALLOWED_COMMANDS = {
  deploy: (parameters) => {
    const pkg = parameters?.package || 'node';
    const idMap = {
        'node': 'OpenJS.NodeJS.LTS',
        'git': 'Git.Git',
        'chrome': 'Google.Chrome',
        'gh': 'GitHub.cli',
        'vscode': 'Microsoft.VisualStudioCode'
    };
    const wingetId = idMap[pkg] || pkg;
    return `winget install --id ${wingetId} --silent --accept-package-agreements --accept-source-agreements`;
  },
  status: () => {
    return `echo Battalion Status: Active [${new Date().toLocaleTimeString()}]`;
  }
};

export const runCommand = async (command, params) => {
  // 1. Advisor Veto
  const veto = await Advisor.vet(command, params);
  
  if (!veto.approved) throw new Error(`Vetoed: ${veto.reason}`);

  // 2. Lookup Command
  if (!ALLOWED_COMMANDS[command]) {
      throw new Error("Command not in whitelist.");
  }
  
  const script = ALLOWED_COMMANDS[command](params);
  console.log(`[AppEnforcer] Executing: ${script}`);

  try {
      const { stdout, stderr } = await execAsync(script);
      return { stdout, stderr, exitCode: 0 };
  } catch (err) {
      return { stdout: '', stderr: err.message, exitCode: err.code || 1 };
  }
};
