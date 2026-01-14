// backend/agents/DeepSeekAdvisor.js
// Optimized for surgical syntax error fixes

import EventBus from '../utils/EventBus.js';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.DEEPSEEK_MODEL || 'gpt-oss:20b-cloud';

class DeepSeekAdvisor {
    
    // Optimized prompt for SYNTAX errors (most common failure mode)
    static _syntaxErrorPrompt(errorContext) {
        const { error, targetFile, codeSnippet } = errorContext;
        
        // Try to extract line number from error
        const lineMatch = error?.match(/:(\d+):/);
        const errorLine = lineMatch ? parseInt(lineMatch[1]) : null;
        
        const markedCode = errorLine 
            ? DeepSeekAdvisor._markErrorLine(codeSnippet || '', errorLine)
            : (codeSnippet || 'No code provided');

        return `You are a **TypeScript/React syntax surgeon**.
Your only job is to **fix the syntax error** that caused the build to fail.

**CONTEXT**
- Project: React + TypeScript + Vite
- Error: ${error}
- File: ${targetFile}

**ORIGINAL CODE (error line marked if known)**
${markedCode}

**RULES**
1. Fix ONLY the syntax error – do NOT change any other code.
2. Preserve all imports, hooks, component signatures, and JSX structure.
3. If the fix requires an import, add ONLY that import.
4. Return EXACTLY the corrected file contents.
5. Wrap the result in valid JSON with this shape:

{"fixPossible": true, "reasoning": "short explanation", "targetFile": "${targetFile}", "proposedFix": "FULL_FILE_CONTENT_AFTER_FIX"}

IMPORTANT: Return ONLY valid JSON, no markdown fences or extra text.`;
    }

    // Helper – inject a comment on the offending line
    static _markErrorLine(code, errorLine) {
        const lines = code.split('\n');
        const idx = errorLine - 1;
        if (idx >= 0 && idx < lines.length) {
            lines[idx] = `// ⚠️ ERROR HERE → ${lines[idx]}`;
        }
        return lines.join('\n');
    }

    // Generic prompt for non-syntax errors
    static _genericPrompt(errorContext) {
        return `You are an expert software engineer. Analyze the following build error and provide a fix.

ERROR CONTEXT:
${JSON.stringify(errorContext, null, 2)}

Respond ONLY with valid JSON in this exact format:
{"fixPossible": true or false, "reasoning": "Brief explanation", "targetFile": "path/to/file", "proposedFix": "The corrected code content for the entire file"}`;
    }

    async diagnose(errorContext) {
        console.log(`🧠 [DeepSeek] Analyzing error...`);
        EventBus.emit('ralph:diagnosing', { status: 'thinking' });

        // Pick prompt based on error type
        const isSyntax = /SyntaxError|Unexpected token|Parse error|Missing|Expected/.test(errorContext.error || '');
        const prompt = isSyntax 
            ? DeepSeekAdvisor._syntaxErrorPrompt(errorContext)
            : DeepSeekAdvisor._genericPrompt(errorContext);

        try {
            const response = await fetch(`${OLLAMA_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: MODEL,
                    prompt: prompt,
                    stream: false,
                    options: { temperature: 0.1 } // Deterministic for surgical fixes
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama returned ${response.status}`);
            }

            const data = await response.json();
            const text = data.response;
            
            // Extract JSON from response (safe extraction)
            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}');
            
            if (jsonStart === -1 || jsonEnd === -1) {
                throw new Error('No JSON found in response');
            }
            
            const jsonStr = text.slice(jsonStart, jsonEnd + 1);
            const diagnosis = JSON.parse(jsonStr);
            
            EventBus.emit('ralph:diagnosis_complete', diagnosis);
            console.log(`   ✅ Diagnosis: ${diagnosis.reasoning?.slice(0, 60)}...`);
            return diagnosis;

        } catch (error) {
            console.error(`❌ [DeepSeek] Failed: ${error.message}`);
            EventBus.emit('ralph:diagnosis_failed', { error: error.message });
            
            return {
                fixPossible: false,
                reasoning: `DeepSeek error: ${error.message}`,
                targetFile: null,
                proposedFix: null
            };
        }
    }
}

export default new DeepSeekAdvisor();
