const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:zain@localhost:5432/master'
});

async function run() {
  const result = await pool.query(
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  );
  console.log(result.rows.map(r => r.table_name));
  pool.end();
}
run();
