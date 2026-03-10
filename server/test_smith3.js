async function run() {
  try {
    const loginRes = await fetch('http://localhost:1000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'smith@gmail.com', password: 'smith123', platform: 'ADMIN' })
    });
    const cookie = loginRes.headers.get('set-cookie');
    
    if (!cookie) {
      console.log('NO COOKIE');
      return;
    }

    const catRes = await fetch('http://localhost:1000/api/v1/categories', { headers: { 'Cookie': cookie } });
    const catData = await catRes.json();
    console.log('Categories data type:', typeof catData.data, 'IsArray:', Array.isArray(catData.data));
    console.log('First Category Keys:', Object.keys(catData.data[0]));

    const supRes = await fetch('http://localhost:1000/api/v1/suppliers', { headers: { 'Cookie': cookie } });
    const supData = await supRes.json();
    console.log('Suppliers data type:', typeof supData.data, 'IsArray:', Array.isArray(supData.data), 'Length:', supData.data?.length);
    console.log('First Supplier Keys:', Object.keys(supData.data[0]));

  } catch (e) {
    console.error('ERROR:', e.message);
  }
}
run();
