import { exec } from 'child_process';
import { promisify } from 'util';
import Advisor from './Advisor.js';
import RalphLoopManager from './managers/RalphLoopManager.js';

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

export const runCommand = async (command, params) => {
  // 1. Advisor Veto
  const veto = await Advisor.vet(command, params);
  
  if (!veto.approved) throw new Error(`Vetoed: ${veto.reason}`);

  // 2. Lookup Command
  if (!ALLOWED_COMMANDS[command]) {
      throw new Error("Command not in whitelist.");
  }
  
  // 3. Execute
  console.log(`[AppEnforcer] Executing: ${command}`);

  try {
      if (typeof ALLOWED_COMMANDS[command] === 'function') {
        const result = await ALLOWED_COMMANDS[command](params);
        // If it's a string, it's a shell command (legacy support)
        if (typeof result === 'string') {
             const { stdout, stderr } = await execAsync(result);
             return { stdout, stderr, exitCode: 0 };
        }
        // Otherwise it's a direct function result (RalphLoop)
        return result;
      }
      return { error: "Invalid command structure" };
  } catch (err) {
      return { stdout: '', stderr: err.message, exitCode: err.code || 1 };
  }
};
