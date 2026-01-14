// scripts/testLinear.js - Verify Linear connection
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const LINEAR_API_TOKEN = process.env.LINEAR_API_TOKEN;

async function testLinear() {
    console.log('🔗 Testing Linear Connection...\n');
    
    if (!LINEAR_API_TOKEN) {
        console.error('❌ LINEAR_API_TOKEN not found in .env');
        return;
    }
    
    console.log('✅ Token found:', LINEAR_API_TOKEN.slice(0, 15) + '...');

    try {
        const response = await fetch('https://api.linear.app/graphql', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LINEAR_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: `query { 
                    viewer { id name email }
                    teams { nodes { id name key } }
                }`
            })
        });

        const { data, errors } = await response.json();
        
        if (errors) {
            console.error('❌ GraphQL Errors:', errors);
            return;
        }

        console.log('\n👤 Authenticated as:', data.viewer.name, `(${data.viewer.email})`);
        console.log('\n📋 Available Teams:');
        data.teams.nodes.forEach(team => {
            console.log(`   • ${team.name} (${team.key}) - ID: ${team.id}`);
        });

        console.log('\n✅ Linear connection successful!');
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
    }
}

testLinear();
