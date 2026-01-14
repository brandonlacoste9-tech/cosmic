// backend/agents/LinearAdapter.js
// Connector for Linear issue tracking (GraphQL API)

import EventBus from '../utils/EventBus.js';

export class LinearAdapter {
    constructor() {
        this.apiToken = process.env.LINEAR_API_TOKEN;
        this.endpoint = 'https://api.linear.app/graphql';
        this.initialized = !!this.apiToken;
        
        if (!this.initialized) {
            console.warn('⚠️ Linear not configured (missing LINEAR_API_TOKEN)');
        }
    }

    /** Check if Linear is configured */
    isConfigured() {
        return this.initialized;
    }

    /** Helper – execute a GraphQL query/mutation */
    async _graphql(query, variables = {}) {
        if (!this.initialized) {
            console.log('📋 [Linear] Simulating GraphQL (not configured)');
            return { simulated: true };
        }

        const resp = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query, variables })
        });

        const { data, errors } = await resp.json();
        if (errors && errors.length) {
            throw new Error(`Linear GraphQL error: ${errors.map(e => e.message).join(', ')}`);
        }
        return data;
    }

    /** Create a Linear issue */
    async createIssue({ title, description = '', teamId, projectId, labels = [] }) {
        if (!this.initialized) {
            console.log('📋 [Linear] Simulating issue creation:', title);
            EventBus.emit('linear:issue_created', { 
                title, 
                simulated: true,
                url: `https://linear.app/simulated/issue/SIM-${Date.now()}`
            });
            return { 
                id: `sim-${Date.now()}`, 
                identifier: `SIM-${Date.now()}`, 
                title, 
                url: `https://linear.app/simulated/issue/SIM-${Date.now()}`,
                simulated: true 
            };
        }

        const mutation = `
            mutation CreateIssue(
                $title: String!
                $description: String
                $teamId: String!
                $projectId: String
                $labelIds: [String!]
            ) {
                issueCreate(
                    input: {
                        title: $title
                        description: $description
                        teamId: $teamId
                        projectId: $projectId
                        labelIds: $labelIds
                    }
                ) {
                    success
                    issue {
                        id
                        identifier
                        title
                        url
                    }
                }
            }
        `;

        const variables = { title, description, teamId, projectId, labelIds: labels };
        const result = await this._graphql(mutation, variables);
        const payload = result.issueCreate;
        
        if (!payload.success) {
            throw new Error(`Linear issueCreate failed`);
        }

        console.log('📋 [Linear] Issue created →', payload.issue.url);
        EventBus.emit('linear:issue_created', payload.issue);
        return payload.issue;
    }

    /** Fetch teams list */
    async listTeams() {
        if (!this.initialized) {
            return { simulated: true, nodes: [] };
        }

        const query = `query { teams { nodes { id name } } }`;
        const data = await this._graphql(query);
        return data.teams.nodes;
    }

    /** Fetch projects for a team */
    async listProjects(teamId) {
        if (!this.initialized) {
            return { simulated: true, nodes: [] };
        }

        const query = `
            query Projects($teamId: String!) {
                projects(filter: {team: {id: {eq: $teamId}}}) {
                    nodes { id name }
                }
            }`;
        const data = await this._graphql(query, { teamId });
        return data.projects.nodes;
    }
}

export default new LinearAdapter();
