// backend/agents/TaskOrchestrator.js
// Executes tasks through the Ralph Loop pipeline with safety guards

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import EventBus from '../utils/EventBus.js';
import N8NAdapter from './N8NAdapter.js';
import LinearAdapter from './LinearAdapter.js';
import SyntaxValidator from './SyntaxValidator.js';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '../..');

class TaskOrchestrator {
    constructor() {
        this.currentGoal = null;
        this.taskQueue = [];
        this.backups = new Map(); // filePath -> originalContent
    }

    /** Execute all tasks for a goal */
    async executeGoal(goal) {
        this.currentGoal = goal;
        this.taskQueue = [...goal.tasks];
        this.backups.clear();

        console.log(`\n🚀 [Orchestrator] Starting goal: ${goal.id}`);
        EventBus.emit('goal:started', { goalId: goal.id });

        let completedCount = 0;
        let failedCount = 0;

        for (const task of this.taskQueue) {
            try {
                console.log(`\n  📌 Task ${task.id}: ${task.type}`);
                EventBus.emit('goal:task_started', { goalId: goal.id, task });

                await this._handleTask(task);

                task.status = 'completed';
                completedCount++;
                console.log(`  ✅ Task completed: ${task.description?.slice(0, 40)}...`);
                EventBus.emit('goal:task_completed', { goalId: goal.id, task, success: true });

            } catch (error) {
                task.status = 'failed';
                task.error = error.message;
                failedCount++;
                console.error(`  ❌ Task failed: ${error.message}`);
                EventBus.emit('goal:task_completed', { goalId: goal.id, task, success: false, error: error.message });

                // Rollback on failure
                await this._rollback();
                break;
            }
        }

        const success = failedCount === 0;
        goal.status = success ? 'completed' : 'failed';

        console.log(`\n${success ? '✅' : '❌'} Goal ${goal.id} ${goal.status} (${completedCount}/${goal.tasks.length} tasks)`);
        EventBus.emit('goal:finished', { goalId: goal.id, success, completedCount, failedCount });

        return { success, completedCount, failedCount };
    }

    /** Route task to appropriate handler */
    async _handleTask(task) {
        switch (task.type) {
            case 'CREATE_FILE':
                await this._createFile(task);
                break;
            case 'MODIFY_FILE':
                await this._modifyFile(task);
                break;
            case 'DELETE_FILE':
                await this._deleteFile(task);
                break;
            case 'RUN_BUILD':
            case 'RUN_TEST':
                await this._runCommand(task);
                break;
            case 'N8N_TRIGGER':
                await this._triggerN8N(task);
                break;
            case 'LINEAR_CREATE_ISSUE':
                await this._createLinearIssue(task);
                break;
            case 'MANUAL_REVIEW':
                console.log(`  ⏸️ Manual review required: ${task.description}`);
                EventBus.emit('goal:manual_review', { task });
                break;
            default:
                throw new Error(`Unknown task type: ${task.type}`);
        }
    }

    /** CREATE_FILE handler */
    async _createFile(task) {
        const { filePath, content } = task;
        if (!filePath || content === undefined) {
            throw new Error('CREATE_FILE requires filePath and content');
        }

        const fullPath = path.join(PROJECT_ROOT, filePath);

        // Validate syntax if it's a code file
        if (filePath.match(/\.(tsx?|jsx?)$/)) {
            const check = SyntaxValidator.validate(content, path.basename(filePath));
            if (!check.valid) {
                throw new Error(`Syntax validation failed: ${check.diagnostics.join('; ')}`);
            }
        }

        // Backup if exists
        if (fs.existsSync(fullPath)) {
            this.backups.set(fullPath, fs.readFileSync(fullPath, 'utf-8'));
        }

        // Create directory if needed
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(fullPath, content, 'utf-8');
    }

    /** MODIFY_FILE handler */
    async _modifyFile(task) {
        const { filePath, content, changes } = task;
        if (!filePath) {
            throw new Error('MODIFY_FILE requires filePath');
        }

        const fullPath = path.join(PROJECT_ROOT, filePath);

        if (!fs.existsSync(fullPath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        // Backup original
        const original = fs.readFileSync(fullPath, 'utf-8');
        this.backups.set(fullPath, original);

        // Apply changes
        let newContent = content || original;
        if (changes && typeof changes === 'object') {
            // Simple find-replace changes
            for (const [find, replace] of Object.entries(changes)) {
                newContent = newContent.replace(find, replace);
            }
        }

        // Validate syntax
        if (filePath.match(/\.(tsx?|jsx?)$/)) {
            const check = SyntaxValidator.validate(newContent, path.basename(filePath));
            if (!check.valid) {
                throw new Error(`Syntax validation failed: ${check.diagnostics.join('; ')}`);
            }
        }

        fs.writeFileSync(fullPath, newContent, 'utf-8');
    }

    /** DELETE_FILE handler */
    async _deleteFile(task) {
        const { filePath } = task;
        const fullPath = path.join(PROJECT_ROOT, filePath);

        if (fs.existsSync(fullPath)) {
            this.backups.set(fullPath, fs.readFileSync(fullPath, 'utf-8'));
            fs.unlinkSync(fullPath);
        }
    }

    /** RUN_BUILD / RUN_TEST handler */
    async _runCommand(task) {
        const { command, cwd } = task;
        const workDir = cwd ? path.join(PROJECT_ROOT, cwd) : PROJECT_ROOT;

        const { stdout, stderr } = await execAsync(command, {
            cwd: workDir,
            maxBuffer: 10 * 1024 * 1024
        });

        if (stderr && stderr.includes('error')) {
            throw new Error(stderr);
        }
    }

    /** N8N_TRIGGER handler */
    async _triggerN8N(task) {
        const { workflowId, payload } = task;
        if (!workflowId) {
            throw new Error('N8N_TRIGGER requires workflowId');
        }

        await N8NAdapter.triggerWorkflow(workflowId, payload || {});
    }

    /** LINEAR_CREATE_ISSUE handler */
    async _createLinearIssue(task) {
        const { title, description = '', teamId, projectId, labels = [] } = task;

        if (!title) {
            throw new Error('LINEAR_CREATE_ISSUE requires title');
        }

        // Use default team if not specified
        const team = teamId || process.env.LINEAR_DEFAULT_TEAM_ID || 'default-team';

        await LinearAdapter.createIssue({
            title,
            description,
            teamId: team,
            projectId,
            labels
        });
    }

    /** Rollback all changes on failure */
    async _rollback() {
        console.log('\n  🔄 Rolling back changes...');
        
        for (const [filePath, originalContent] of this.backups) {
            try {
                if (originalContent === null) {
                    // File was created, delete it
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                } else {
                    // Restore original content
                    fs.writeFileSync(filePath, originalContent, 'utf-8');
                }
                console.log(`     ↩️ Restored: ${path.basename(filePath)}`);
            } catch (err) {
                console.error(`     ⚠️ Failed to restore: ${filePath}`);
            }
        }

        this.backups.clear();
        EventBus.emit('goal:rollback_complete', { goalId: this.currentGoal?.id });
    }
}

export default new TaskOrchestrator();
