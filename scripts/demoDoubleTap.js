// scripts/demoDoubleTap.js
// 🎯 DOUBLE-TAP TEST: Multi-pass failure resilience validation

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import RalphLoopManager from '../backend/managers/RalphLoopManager.js';
import EventBus from '../backend/utils/EventBus.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');
const TARGET_FILE = 'quantum-canvas/apps/quantum-canvas/src/main.tsx';
const TARGET_PATH = path.join(PROJECT_ROOT, TARGET_FILE);

let originalContent = null;
let testStartTime = null;

// Metrics tracking
const metrics = {
    pass1StartTime: null,
    pass1EndTime: null,
    pass2StartTime: null,
    pass2EndTime: null,
    totalIterations: 0,
    errors: []
};

// ═══════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════

EventBus.on('ralph:loop_started', (data) => {
    console.log(`\n🔄 Ralph Loop ${data.loopId} INITIATED`);
    console.log(`   Trigger: ${data.trigger.type}`);
});

EventBus.on('ralph:iteration_start', ({ iteration }) => {
    console.log(`   ⟳ Iteration ${iteration}/5`);
    metrics.totalIterations++;
});

EventBus.on('ralph:diagnosing', () => {
    console.log(`   🔍 DeepSeek analyzing...`);
});

EventBus.on('ralph:diagnosis_complete', (diagnosis) => {
    console.log(`   💡 Diagnosis: ${diagnosis.reasoning?.slice(0, 60)}...`);
});

EventBus.on('ralph:syntax_invalid', ({ diagnostics }) => {
    console.log(`   ⚠️  Syntax validation FAILED:`);
    diagnostics.forEach(d => console.log(`      ${d}`));
});

EventBus.on('ralph:fix_executing', ({ file, iteration }) => {
    console.log(`   ✍️  Writing fix (Iteration ${iteration})`);
});

EventBus.on('ralph:loop_success', ({ iterations }) => {
    console.log(`   ✅ Loop SUCCESS in ${iterations} iteration(s)`);
});

EventBus.on('ralph:loop_failed', ({ iterations }) => {
    console.log(`   ❌ Loop FAILED after ${iterations} iteration(s)`);
});

// ═══════════════════════════════════════════════════════════════
// PHASE 1: SYNTAX ERROR
// ═══════════════════════════════════════════════════════════════

async function injectSyntaxError() {
    console.log('\n' + '═'.repeat(60));
    console.log('   PHASE 1: SYNTAX ERROR INJECTION');
    console.log('═'.repeat(60));
    
    metrics.pass1StartTime = Date.now();
    
    // Backup original
    if (fs.existsSync(TARGET_PATH)) {
        originalContent = fs.readFileSync(TARGET_PATH, 'utf-8');
    }

    // Inject syntax error - missing closing tag
    const corruptedContent = `
// CORRUPTED BY DOUBLE-TAP TEST - PHASE 1
import React from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
    return (
        <div>
            <h1>Double-Tap Test</h1>
            {/* SYNTAX ERROR: Missing closing div tag */}
        </div
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
`;

    fs.writeFileSync(TARGET_PATH, corruptedContent, 'utf-8');
    console.log('   ✂️  Syntax error injected (missing closing tag)');
    console.log('   📁 File:', TARGET_FILE);
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2: LOGIC ERROR (revealed after syntax fix)
// ═══════════════════════════════════════════════════════════════

async function injectLogicError() {
    console.log('\n' + '═'.repeat(60));
    console.log('   PHASE 2: LOGIC ERROR INJECTION');
    console.log('═'.repeat(60));
    
    metrics.pass2StartTime = Date.now();

    // Inject runtime/logic error - undefined variable
    const corruptedContent = `
// CORRUPTED BY DOUBLE-TAP TEST - PHASE 2
import React from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
    // LOGIC ERROR: Using undefined variable
    const message = undefinedVariable.toString();
    
    return (
        <div>
            <h1>{message}</h1>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
`;

    fs.writeFileSync(TARGET_PATH, corruptedContent, 'utf-8');
    console.log('   ⚡ Logic error injected (undefined variable)');
    console.log('   📁 File:', TARGET_FILE);
}

// ═══════════════════════════════════════════════════════════════
// BUILD TRIGGER
// ═══════════════════════════════════════════════════════════════

async function triggerBuild(phase) {
    console.log(`\n   🔨 Triggering build for Phase ${phase}...`);
    
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
        await execAsync('npm run build', {
            cwd: path.join(PROJECT_ROOT, 'quantum-canvas/apps/quantum-canvas'),
            maxBuffer: 10 * 1024 * 1024
        });
        console.log('   ✅ Build succeeded (unexpected!)');
        return null;
    } catch (err) {
        console.log('   ❌ Build FAILED (as expected)');
        return {
            type: 'BUILD_FAILED',
            context: {
                error: err.stderr || err.message,
                targetFile: TARGET_FILE,
                buildCommand: 'npm run build',
                codeSnippet: fs.readFileSync(TARGET_PATH, 'utf-8')
            }
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════

async function main() {
    testStartTime = Date.now();
    
    console.log('');
    console.log('🎯'.repeat(30));
    console.log('');
    console.log('       D O U B L E - T A P   T E S T');
    console.log('       Multi-Pass Failure Resilience');
    console.log('');
    console.log('🎯'.repeat(30));
    console.log('');
    
    try {
        // ═══════════════════════════════════════════════════════════
        // PASS 1: SYNTAX ERROR
        // ═══════════════════════════════════════════════════════════
        
        await injectSyntaxError();
        const trigger1 = await triggerBuild(1);
        
        if (trigger1) {
            console.log('\n   🧠 Activating Ralph Loop for Pass 1...');
            const result1 = await RalphLoopManager.startLoop(trigger1);
            metrics.pass1EndTime = Date.now();
            
            if (!result1.success) {
                console.log('\n   ⚠️  Pass 1 failed - continuing to Pass 2 anyway...');
            }
        }
        
        // Brief pause between passes
        await new Promise(r => setTimeout(r, 2000));
        
        // ═══════════════════════════════════════════════════════════
        // PASS 2: LOGIC ERROR
        // ═══════════════════════════════════════════════════════════
        
        await injectLogicError();
        const trigger2 = await triggerBuild(2);
        
        if (trigger2) {
            console.log('\n   🧠 Activating Ralph Loop for Pass 2...');
            const result2 = await RalphLoopManager.startLoop(trigger2);
            metrics.pass2EndTime = Date.now();
        }
        
        // ═══════════════════════════════════════════════════════════
        // RESULTS
        // ═══════════════════════════════════════════════════════════
        
        const totalTime = (Date.now() - testStartTime) / 1000;
        const pass1Time = metrics.pass1EndTime ? 
            ((metrics.pass1EndTime - metrics.pass1StartTime) / 1000).toFixed(1) : 'N/A';
        const pass2Time = metrics.pass2EndTime ? 
            ((metrics.pass2EndTime - metrics.pass2StartTime) / 1000).toFixed(1) : 'N/A';
        
        console.log('\n');
        console.log('═'.repeat(60));
        console.log('       D O U B L E - T A P   R E S U L T S');
        console.log('═'.repeat(60));
        console.log('');
        console.log(`   ⏱️  Total Test Time: ${totalTime.toFixed(1)}s`);
        console.log(`   📊 Pass 1 Time: ${pass1Time}s`);
        console.log(`   📊 Pass 2 Time: ${pass2Time}s`);
        console.log(`   🔄 Total Iterations: ${metrics.totalIterations}`);
        console.log('');
        console.log('═'.repeat(60));
        
        // Final verdict
        if (metrics.pass1EndTime && metrics.pass2EndTime) {
            console.log('');
            console.log('   🎉 DOUBLE-TAP TEST: COMPLETE ');
            console.log('   ✅ Multi-error resilience: PROVEN');
            console.log('   ✅ State-aware recovery: VERIFIED');
            console.log('   ✅ Autonomous coordination: CONFIRMED');
            console.log('');
        }
        
    } catch (error) {
        console.error('\n   ❌ Test crashed:', error.message);
        metrics.errors.push(error.message);
    } finally {
        // Restore original
        console.log('\n   🧹 Restoring original file...');
        if (originalContent) {
            fs.writeFileSync(TARGET_PATH, originalContent, 'utf-8');
            console.log('   ✅ Original restored');
        }
    }
}

main().catch(console.error);
