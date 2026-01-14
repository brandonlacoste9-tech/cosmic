// backend/agents/GoalInterpreter.js
// Decomposes high-level natural language goals into executable tasks

import EventBus from '../utils/EventBus.js';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.DEEPSEEK_MODEL || 'gpt-oss:20b-cloud';

class GoalInterpreter {
    
    /** Main entry point - interpret a natural language goal */
    async interpret(goalText) {
        console.log(`🎯 [GoalInterpreter] Analyzing goal: "${goalText.slice(0, 50)}..."`);
        EventBus.emit('goal:interpreting', { goal: goalText });

        const tasks = await this._decomposeViaLLM(goalText);
        
        const goal = {
            id: `goal-${Date.now()}`,
            text: goalText,
            tasks: tasks,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        console.log(`   ✅ Decomposed into ${tasks.length} task(s)`);
        EventBus.emit('goal:decomposed', goal);
        
        return goal;
    }

    /** Use LLM to decompose the goal */
    async _decomposeViaLLM(goalText) {
        const prompt = this._buildPrompt(goalText);

        try {
            const response = await fetch(`${OLLAMA_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: MODEL,
                    prompt: prompt,
                    stream: false,
                    options: { temperature: 0.2 }
                })
            });

            if (!response.ok) {
                throw new Error(`LLM returned ${response.status}`);
            }

            const data = await response.json();
            const text = data.response;

            // Extract JSON array from response
            const jsonStart = text.indexOf('[');
            const jsonEnd = text.lastIndexOf(']');
            
            if (jsonStart === -1 || jsonEnd === -1) {
                throw new Error('No JSON array found in response');
            }

            const jsonStr = text.slice(jsonStart, jsonEnd + 1);
            const tasks = JSON.parse(jsonStr);
            
            // Validate and normalize tasks
            return tasks.map((task, idx) => ({
                id: `task-${Date.now()}-${idx}`,
                type: task.type || 'UNKNOWN',
                description: task.description || '',
                ...task,
                status: 'pending'
            }));

        } catch (error) {
            console.error(`❌ [GoalInterpreter] LLM failed: ${error.message}`);
            
            // Return a fallback single task
            return [{
                id: `task-${Date.now()}-0`,
                type: 'MANUAL_REVIEW',
                description: `Goal could not be auto-decomposed: ${goalText}`,
                originalGoal: goalText,
                status: 'pending'
            }];
        }
    }

    /** Build the decomposition prompt */
    _buildPrompt(goalText) {
        return `You are a **Task Decomposer** for an autonomous development system.

Your job is to break down a high-level goal into a sequence of executable tasks.

**AVAILABLE TASK TYPES:**

FILE OPERATIONS:
- CREATE_FILE: Create a new file { type, filePath, content, description }
- MODIFY_FILE: Modify existing file { type, filePath, changes, description }
- DELETE_FILE: Delete a file { type, filePath, description }

BUILD OPERATIONS:
- RUN_BUILD: Run build command { type, command, cwd, description }
- RUN_TEST: Run tests { type, command, description }

EXTERNAL INTEGRATIONS:
- N8N_TRIGGER: Start an N8N workflow { type, workflowId, payload, description }
- LINEAR_CREATE_ISSUE: Create a Linear issue { type, title, description, teamId, projectId, labels, description }

MANUAL:
- MANUAL_REVIEW: Requires human review { type, description }

**GOAL TO DECOMPOSE:**
"${goalText}"

**RULES:**
1. Output ONLY a valid JSON array of tasks
2. Each task must have at minimum: { type, description }
3. Order tasks logically (dependencies first)
4. Be specific with file paths and content
5. Use realistic defaults for missing info

**OUTPUT FORMAT:**
Return ONLY a JSON array, no markdown or extra text:
[
  { "type": "TASK_TYPE", "description": "What this does", ...other_fields },
  { "type": "TASK_TYPE", "description": "What this does", ...other_fields }
]`;
    }
}

export default new GoalInterpreter();
