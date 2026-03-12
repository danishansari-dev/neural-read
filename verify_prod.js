const https = require('https');

async function testUrl(url, expectedStatus = 200, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const options = {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {}
    };
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('--- NeuralRead Verification Report ---');

  // 1. Backend Health
  const health = await testUrl('https://neural-read-backend-production.up.railway.app/health');
  console.log(`Backend Health: ${health.status} - ${health.data}`);

  // 2. Swagger Docs
  const docs = await testUrl('https://neural-read-backend-production.up.railway.app/docs');
  console.log(`Backend Docs: ${docs.status}`);

  // 3. NLP Extract
  const extract = await testUrl('https://neural-read-backend-production.up.railway.app/api/v1/extract', 200, 'POST', {
    text: "Artificial intelligence is transforming industries worldwide. Machine learning enables computers to learn from data without explicit programming. Deep neural networks have achieved superhuman performance on many benchmark tasks.",
    url: "https://example.com/test",
    title: "AI Test Article"
  });
  console.log(`NLP Extract: ${extract.status}`);
  try {
    const json = JSON.parse(extract.data);
    console.log(`Highlights Count: ${json.highlights ? json.highlights.length : 0}`);
  } catch (e) {
    console.log(`NLP Extract Error: ${extract.data}`);
  }

  // 4. Dashboard Login
  const login = await testUrl('https://neural-read-dashboard.vercel.app/login');
  console.log(`Dashboard Login: ${login.status}`);

  // 5. Dashboard Vault Redirect
  const vault = await testUrl('https://neural-read-dashboard.vercel.app/vault');
  console.log(`Vault Status (Direct): ${vault.status}`);
  // Note: Node https doesn't follow redirects by default with this simple setup, 
  // but if status is 302/307 or 200 with login text, it's good.
  if (vault.data.includes('NeuralRead') && vault.data.includes('login')) {
      console.log('Vault Redirects to Login: PASS');
  } else {
      console.log('Vault Redirect Info: ' + vault.status);
  }

  console.log('--- End of Report ---');
}

run();
