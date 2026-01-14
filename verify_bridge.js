import { createHmac } from 'crypto';
import http from 'http';

const PORT = 4000;
const SECRET = "Quantum_Vault_2026_Secure_Key";

function request(options, body) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data: data ? JSON.parse(data) : {} }));
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function testBridge() {
    console.log("🛡️ INITIATING BRIDGE DIAGNOSTIC (Node HTTP)\n");

    // TEST 1: The Intruder
    try {
        console.log("🔹 TEST 1: Sending UNSIGNED command...");
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: '/api/enforce',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };
        const res = await request(options, JSON.stringify({ command: 'status' }));
        
        if (res.status === 401) {
            console.log("✅ SUCCESS: Intruder repelled (401).");
        } else {
            console.log(`❌ FAILURE: Intruder allowed (${res.status}).`);
        }
    } catch (e) { console.error("Test 1 Error:", e.message); }

    console.log("\n--------------------------------\n");

    // TEST 2: The Authorized Agent
    try {
        console.log("🔹 TEST 2: Sending SIGNED command...");
        const body = JSON.stringify({ command: 'status' });
        const hmac = createHmac('sha256', SECRET);
        const signature = hmac.update(body).digest('hex');

        const options = {
            hostname: 'localhost',
            port: PORT,
            path: '/api/enforce',
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-hmac-signature': signature
            }
        };
        const res = await request(options, body);

        if (res.status === 200) {
            console.log("✅ SUCCESS: Authenticated (200).");
            console.log(`📝 OUTPUT: ${res.data.stdout?.trim()}`);
        } else {
            console.log(`❌ FAILURE: Valid signature rejected (${res.status}).`);
            console.log("Error:", res.data);
        }
    } catch (e) { console.error("Test 2 Error:", e.message); }
}

testBridge();
