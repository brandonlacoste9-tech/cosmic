// scripts/demoRalphLoop.js
// Demonstration of the Ralph Loop self-healing system

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import RalphLoopManager from '../backend/managers/RalphLoopManager.js';
import EventBus from '../backend/utils/EventBus.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');
const TARGET_FILE = 'quantum-canvas/apps/quantum-canvas/src/main.tsx';
const TARGET_PATH = path.join(PROJECT_ROOT, TARGET_FILE);

// Store original content for restoration
let originalContent = null;

async function corruptComponent() {
    console.log('\n🛠️  Phase 1: Corrupting component to simulate build failure...');
    
    // Backup original
    if (fs.existsSync(TARGET_PATH)) {
        originalContent = fs.readFileSync(TARGET_PATH, 'utf-8');
    } else {
        // Create a simple component if none exists
        originalContent = `
import React from 'react';
export const App = () => <div>Hello World</div>;
export default App;
`;
    }

    // Inject intentional SYNTAX error that will fail build
    const corruptedContent = `
// CORRUPTED BY RALPH LOOP DEMO - SYNTAX ERROR
import React from 'react';
import ReactDOM from 'react-dom/client';

// INTENTIONAL SYNTAX ERROR: Missing closing bracket
const App = () => {
    return (
        <div>
            {/* Missing closing tag and bracket */}
        </div
    );
;

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
`;

    fs.writeFileSync(TARGET_PATH, corruptedContent, 'utf-8');
    console.log('   ✅ Component corrupted with SYNTAX ERROR – build WILL fail.');
}

async function triggerBuildFailure() {
    console.log('\n🔨 Phase 2: Triggering build to capture error...');
    
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
        await execAsync('npm run build', {
            cwd: path.join(PROJECT_ROOT, 'quantum-canvas/apps/quantum-canvas'),
            maxBuffer: 10 * 1024 * 1024
        });
        console.log('   ⚠️ Build succeeded unexpectedly!');
        return null;
    } catch (err) {
        console.log('   ❌ Build failed (as expected)');
        return {
            type: 'BUILD_FAILED',
            context: {
                error: err.stderr || err.message,
                targetFile: TARGET_FILE,
                buildCommand: 'npm run build'
            }
        };
    }
}

async function runRalphLoop(trigger) {
    console.log('\n🧠 Phase 3: Activating Ralph Loop...');
    const result = await RalphLoopManager.startLoop(trigger);
    return result;
}

async function restoreOriginal() {
    console.log('\n🧹 Phase 4: Cleanup - Restoring original component...');
    if (originalContent) {
        fs.writeFileSync(TARGET_PATH, originalContent, 'utf-8');
        console.log('   ✅ Original component restored.');
    }
}

// Subscribe to EventBus for logging
EventBus.on('ralph:loop_started', (data) => {
    console.log(`   [HUD] 🚀 Initiating self-repair for: ${data.trigger.type}`);
});

EventBus.on('ralph:diagnosis_complete', (data) => {
    console.log(`   [HUD] 🔍 Diagnosis: ${data.reasoning.slice(0, 80)}...`);
});

EventBus.on('ralph:fix_executing', (data) => {
    console.log(`   [HUD] ✍️ Writing fix to ${data.file} (Iteration ${data.iteration})`);
});

EventBus.on('ralph:loop_success', (data) => {
    console.log(`   [HUD] ✅ Repair successful after ${data.iterations} iteration(s)!`);
});

EventBus.on('ralph:loop_failed', (data) => {
    console.log(`   [HUD] ❌ Repair failed after ${data.iterations} iteration(s).`);
});

// Main execution
async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('       RALPH LOOP DEMONSTRATION - Autonomous Self-Repair   ');
    console.log('═══════════════════════════════════════════════════════════');

    try {
        // Phase 1: Corrupt
        await corruptComponent();

        // Phase 2: Trigger failure
        const trigger = await triggerBuildFailure();
        
        if (!trigger) {
            console.log('\n⚠️ No build failure detected. Aborting demo.');
            await restoreOriginal();
            return;
        }

        // Phase 3: Ralph Loop
        const result = await runRalphLoop(trigger);

        // Report
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('                     DEMO COMPLETE                          ');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`   Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`   Iterations: ${result.iterations}`);
        console.log(`   Loop ID: ${result.loopId}`);

    } catch (err) {
        console.error('\n❌ Demo crashed:', err.message);
    } finally {
        // Always restore
        await restoreOriginal();
    }
}

main();
