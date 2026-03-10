const http = require('http');

async function test() {
  try {
    const login = await fetch('http://localhost:1000/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'smith@gmail.com', password: 'smith123', platform: 'ADMIN' }),
      headers: { 'Content-Type': 'application/json' }
    });
    const cookie = login.headers.get('set-cookie');
    const b1 = await login.text();
    console.log('Login:', login.status, b1.slice(0, 50));
    
    if (!cookie) return;
    
    const stats = await fetch('http://localhost:1000/api/v1/items/stats/statistics', {
      headers: { 'Cookie': cookie }
    });
    console.log('Stats:', stats.status);
    const b2 = await stats.text();
    console.log('Stats body:', b2);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
