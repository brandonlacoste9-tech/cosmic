// backend/agents/N8NAdapter.js
// Connector for N8N workflow automation

import EventBus from '../utils/EventBus.js';

export class N8NAdapter {
    constructor() {
        this.baseUrl = process.env.N8N_URL?.replace(/\/+$/, ''); // strip trailing slash
        this.token = process.env.N8N_API_TOKEN;
        this.initialized = !!(this.baseUrl && this.token);
        
        if (!this.initialized) {
            console.warn('⚠️ N8N not configured (missing N8N_URL or N8N_API_TOKEN)');
        }
    }

    /** Check if N8N is configured */
    isConfigured() {
        return this.initialized;
    }

    /** Trigger an existing workflow execution */
    async triggerWorkflow(workflowId, executionData = {}) {
        if (!this.initialized) {
            console.log('📦 [N8N] Simulating trigger (not configured):', workflowId);
            EventBus.emit('n8n:triggered', { workflowId, simulated: true });
            return { success: true, simulated: true, workflowId };
        }

        const url = `${this.baseUrl}/webhook/${workflowId}`;
        
        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(executionData)
            });

            if (!resp.ok) {
                const txt = await resp.text();
                throw new Error(`N8N trigger failed (${resp.status}): ${txt}`);
            }

            const json = await resp.json();
            console.log('📦 [N8N] Workflow triggered →', workflowId);
            EventBus.emit('n8n:triggered', { workflowId, result: json });
            return json;
            
        } catch (error) {
            console.error('❌ [N8N] Trigger failed:', error.message);
            EventBus.emit('n8n:error', { workflowId, error: error.message });
            throw error;
        }
    }

    /** Create a new workflow from JSON definition */
    async createWorkflow(workflowJson) {
        if (!this.initialized) {
            console.log('📦 [N8N] Simulating create workflow (not configured)');
            return { success: true, simulated: true };
        }

        const url = `${this.baseUrl}/workflows`;
        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(workflowJson)
        });

        if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(`N8N create workflow failed: ${txt}`);
        }

        return await resp.json();
    }

    /** List available workflows */
    async listWorkflows() {
        if (!this.initialized) {
            return { simulated: true, workflows: [] };
        }

        const url = `${this.baseUrl}/workflows`;
        const resp = await fetch(url, {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });

        if (!resp.ok) {
            throw new Error(`N8N list workflows failed: ${resp.status}`);
        }

        return await resp.json();
    }
}

export default new N8NAdapter();
