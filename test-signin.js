const https = require('https');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (e) {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testSignIn() {
  console.log('🚀 Testing sign-in endpoint...\n');

  try {
    // Test sign-in with ram@myquro.com
    console.log('Testing sign-in with ram@myquro.com...');
    const response = await makeRequest({
      hostname: 'api.myquro.com',
      port: 443,
      path: '/api/auth/sign-in/email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MyQuro-Test/1.0'
      }
    }, {
      email: 'ram@myquro.com',
      password: 'somepassword' // We don't know the actual password
    });

    console.log('Response Status:', response.status, response.statusText);
    console.log('Response Headers:', JSON.stringify(response.headers, null, 2));
    console.log('Response Body:', JSON.stringify(response.body, null, 2));

  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testSignIn();