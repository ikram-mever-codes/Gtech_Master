async function run() {
  try {
    const loginRes = await fetch('http://localhost:1000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'smith@gmail.com', password: 'smith123', platform: 'ADMIN' })
    });
    const cookie = loginRes.headers.get('set-cookie');
    if (!cookie) {
      console.log('No cookie');
      return;
    }
    const statRes = await fetch('http://localhost:1000/api/v1/items/stats/statistics', {
      headers: { 'Cookie': cookie }
    });
    console.log('Stats status:', statRes.status);
    console.log(await statRes.text());
  } catch (e) {
    console.error('ERROR:', e.message);
  }
}
run();
