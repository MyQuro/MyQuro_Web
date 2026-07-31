
const fetch = require('node-fetch');

async function testCreateSession() {
    const BACKEND_URL = 'http://localhost:4000';

    console.log('--- Test 1: Valid qrToken ---');
    try {
        const res = await fetch(`${BACKEND_URL}/api/sessions/create-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qrToken: 'test-token' })
        });
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Data:', data);
    } catch (err) {
        console.error('Error:', err.message);
    }

    console.log('\n--- Test 2: Missing qrToken ---');
    try {
        const res = await fetch(`${BACKEND_URL}/api/sessions/create-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Data:', data);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

testCreateSession();
