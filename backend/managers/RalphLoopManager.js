// backend/managers/RalphLoopManager.js
// The Self-Healing Loop: Sense → Act → Observe → Iterate
// With SyntaxValidator AND LinterSensor for full coverage

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import EventBus from '../utils/EventBus.js';
import DeepSeekAdvisor from '../agents/DeepSeekAdvisor.js';
import SyntaxValidator from '../agents/SyntaxValidator.js';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '../..');

class RalphLoopManager {
    constructor(maxIterations = 5) {
        this.maxIterations = maxIterations;
        this.loopId = null;
    }

    async startLoop(trigger) {
        this.loopId = `ralph-loop-${Date.now()}`;
        console.log(`\n🧠 Ralph Loop ${this.loopId} INITIATED for: ${trigger.type}`);
        EventBus.emit('ralph:loop_started', { loopId: this.loopId, trigger });

        let iteration = 0;
        let success = false;

        while (iteration < this.maxIterations && !success) {
            iteration++;
            console.log(`\n  ⟳ Iteration ${iteration}/${this.maxIterations}`);
            EventBus.emit('ralph:iteration_start', { iteration, loopId: this.loopId });

            // 1. SENSE: Diagnose the error with DeepSeek
            const diagnosis = await DeepSeekAdvisor.diagnose(trigger.context);

            if (!diagnosis.fixPossible) {
                console.log(`  ⚠️ DeepSeek cannot fix: ${diagnosis.reasoning}`);
                EventBus.emit('ralph:fix_impossible', { reasoning: diagnosis.reasoning });
                break;
            }

            if (!diagnosis.proposedFix || !diagnosis.targetFile) {
                console.log(`  ⚠️ Incomplete diagnosis - missing fix or target file`);
                continue;
            }

            // 2. VALIDATE SYNTAX: Check syntax BEFORE writing
            console.log(`  🔍 Pre-validating syntax...`);
            const syntaxCheck = SyntaxValidator.validate(
                diagnosis.proposedFix, 
                path.basename(diagnosis.targetFile)
            );

            if (!syntaxCheck.valid) {
                console.warn(`  ⚠️ Proposed fix FAILED syntax validation:`);
                syntaxCheck.diagnostics.forEach(d => console.warn(`     ${d}`));
                EventBus.emit('ralph:syntax_invalid', {
                    targetFile: diagnosis.targetFile,
                    diagnostics: syntaxCheck.diagnostics
                });
                trigger.context.validationError = syntaxCheck.diagnostics.join('; ');
                continue;
            }

            console.log(`  ✅ Syntax validation PASSED`);

            // 3. ACT: Apply the validated fix
            console.log(`  ✍️ Writing fix to ${diagnosis.targetFile}`);
            EventBus.emit('ralph:fix_executing', { file: diagnosis.targetFile, iteration });

            try {
                const targetPath = path.join(PROJECT_ROOT, diagnosis.targetFile);
                
                // Create backup
                if (fs.existsSync(targetPath)) {
                    fs.copyFileSync(targetPath, targetPath + '.bak');
                }
                
                // Ensure directory exists
                const dir = path.dirname(targetPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                
                // Write fix
                fs.writeFileSync(targetPath, diagnosis.proposedFix, 'utf-8');

            } catch (err) {
                console.error(`  ❌ Failed to write fix: ${err.message}`);
                EventBus.emit('ralph:fix_failed', { error: err.message });
                continue;
            }

            // 4. VALIDATE LOGIC: Run ESLint to catch runtime errors
            console.log(`  🧪 Running Logic Check (Linter)...`);
            const lintResult = await this.validateLogic(
                path.join(PROJECT_ROOT, diagnosis.targetFile)
            );

            if (!lintResult.success) {
                console.warn(`  ⚠️ Linter found issues:`);
                console.warn(`     ${lintResult.error?.slice(0, 200)}...`);
                EventBus.emit('ralph:lint_failed', { error: lintResult.error });
                
                // Update context for next iteration
                trigger.context.error = `Linter error: ${lintResult.error}`;
                trigger.context.codeSnippet = fs.readFileSync(
                    path.join(PROJECT_ROOT, diagnosis.targetFile), 
                    'utf-8'
                );
                continue;
            }

            console.log(`  ✅ Logic validation PASSED`);

            // 5. OBSERVE: Validate with actual build
            console.log(`  🔨 Running build validation...`);
            const buildResult = await this.validateBuild(trigger.context.buildCommand || 'npm run build');

            if (buildResult.success) {
                success = true;
                console.log(`\n✅ Ralph Loop ${this.loopId} SUCCESS in ${iteration} iteration(s)`);
                EventBus.emit('ralph:loop_success', { loopId: this.loopId, iterations: iteration });
            } else {
                console.log(`  ❌ Build still failing, retrying...`);
                trigger.context.error = buildResult.error;
                trigger.context.codeSnippet = fs.readFileSync(
                    path.join(PROJECT_ROOT, diagnosis.targetFile), 
                    'utf-8'
                );
            }
        }

        if (!success) {
            console.log(`\n❌ Ralph Loop ${this.loopId} FAILED after ${iteration} iteration(s)`);
            EventBus.emit('ralph:loop_failed', { loopId: this.loopId, iterations: iteration });
        }

        return { success, iterations: iteration, loopId: this.loopId };
    }

    // ═══════════════════════════════════════════════════════════════
    // SCAN ONLY: Diagnosis without mutation
    // ═══════════════════════════════════════════════════════════════
    async scan(targetFile) {
        console.log(`\n🔍 Ralph Loop SCAN initiated for: ${targetFile}`);
        try {
            const fullPath = path.join(PROJECT_ROOT, targetFile);
            if (!fs.existsSync(fullPath)) {
                return { error: `File not found: ${targetFile}` };
            }

            const content = fs.readFileSync(fullPath, 'utf-8');
            const diagnosis = await DeepSeekAdvisor.diagnose({
                targetFile: targetFile,
                codeSnippet: content,
                error: "Manual Scan Request" // Dummy error to trigger comprehensive check
            });

            return {
                file: targetFile,
                issues: diagnosis.fixPossible ? [{
                    message: diagnosis.reasoning,
                    fix: diagnosis.proposedFix
                }] : []
            };
        } catch (e) {
            console.error(`Scan failed: ${e.message}`);
            return { error: e.message };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // LINTER SENSATION: Catches undefined variables before runtime
    // ═══════════════════════════════════════════════════════════════
    async validateLogic(filePath) {
        try {
            // Run ESLint on the specific file using flat config
            const { stdout, stderr } = await execAsync(
                `npx eslint "${filePath}" --no-error-on-unmatched-pattern`,
                {
                    cwd: path.join(PROJECT_ROOT, 'quantum-canvas/apps/quantum-canvas'),
                    maxBuffer: 10 * 1024 * 1024
                }
            );
            
            return { success: true, stdout };
        } catch (err) {
            // ESLint returns non-zero exit code on errors
            return { success: false, error: err.stdout || err.stderr || err.message };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // BUILD VALIDATION
    // ═══════════════════════════════════════════════════════════════
    async validateBuild(buildCommand) {
        try {
            const buildDir = path.join(PROJECT_ROOT, 'quantum-canvas/apps/quantum-canvas');
            const { stdout, stderr } = await execAsync(buildCommand, {
                cwd: buildDir,
                maxBuffer: 10 * 1024 * 1024
            });
            return { success: true, stdout, stderr };
        } catch (err) {
            return { success: false, error: err.stderr || err.message };
        }
    }
}

export default new RalphLoopManager();
