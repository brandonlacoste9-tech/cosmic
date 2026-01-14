import crypto from 'crypto';

const BASE_URL = 'http://localhost:4000';
const SECRET = 'Quantum_Vault_2026_Secure_Key';

async function callBridge(command, parameters) {
    const url = `${BASE_URL}/api/enforce`;
    const payload = JSON.stringify({ command, parameters });
    const signature = crypto
        .createHmac('sha256', SECRET)
        .update(payload)
        .digest('hex');

    console.log(`Sending ${command}...`);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-hmac-signature': signature
            },
            body: payload
        });
        
        const data = await res.json();
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

// Test Scan
callBridge('devhound:scan', { file: 'package.json' });
