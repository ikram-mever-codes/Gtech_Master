const http = require('http');

async function run() {
  try {
    const loginRes = await fetch('http://localhost:1000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'smith@gmail.com', password: 'smith123', platform: 'ADMIN' })
    });
    const cookie = loginRes.headers.get('set-cookie');
    console.log('Login:', loginRes.status, await loginRes.json());
    if (!cookie) return console.error('No cookie');

    const catRes = await fetch('http://localhost:1000/api/v1/categories', {
      headers: { 'Cookie': cookie }
    });
    console.log('Categories:', catRes.status, (await catRes.json()).data.slice(0,2));

    const supRes = await fetch('http://localhost:1000/api/v1/suppliers', {
      headers: { 'Cookie': cookie }
    });
    console.log('Suppliers:', supRes.status, (await supRes.json()).data.slice(0,2));
  } catch (e) { console.error('ERROR:', e.message); }
}

run();
