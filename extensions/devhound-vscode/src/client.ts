import * as vscode from 'vscode';
import * as crypto from 'crypto';

export class NeuralBridgeClient {
    private get config() {
        return vscode.workspace.getConfiguration('devhound');
    }

    private get baseUrl(): string {
        return this.config.get('bridgeUrl', 'http://localhost:4000');
    }

    private get secret(): string {
        // In a real scenario, this should be stored in VS Code SecretStorage
        // For Alpha, we read from settings or env
        return this.config.get('bridgeSecret') || '';
    }

    async scanFile(filePath: string): Promise<any> {
        return this._call('devhound:scan', { file: filePath });
    }

    async fixFile(filePath: string): Promise<any> {
        return this._call('devhound:fix', { file: filePath });
    }

    private async _call(command: string, parameters: any, retryCount = 0): Promise<any> {
        const url = `${this.baseUrl}/api/enforce`;
        
        const payload = JSON.stringify({ command, parameters });
        const signature = crypto
            .createHmac('sha256', this.secret)
            .update(payload)
            .digest('hex');

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-hmac-signature': signature
                },
                body: payload
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Bridge Error (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            
            // Check for application-level errors
            if (data.error) {
                throw new Error(data.error);
            }
            
            return data;

        } catch (error: any) {
            // Retry logic
            if (retryCount < 3 && (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed'))) {
                console.log(`[DevHound] Connection failed, retrying (${retryCount + 1}/3)...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
                return this._call(command, parameters, retryCount + 1);
            }
            throw error;
        }
    }
}
