require('dotenv').config();

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const DB_SSL_DISABLED = String(process.env.DB_SSL_DISABLED || 'false').toLowerCase() === 'true';

if (!DATABASE_URL) {
  console.error('DATABASE_URL não configurada');
  process.exit(1);
}

function buildDatabaseConfig(connectionString) {
  const normalized = new URL(connectionString);
  normalized.searchParams.delete('sslmode');
  normalized.searchParams.delete('sslcert');
  normalized.searchParams.delete('sslkey');
  normalized.searchParams.delete('sslrootcert');
  return {
    connectionString: normalized.toString(),
    ssl: DB_SSL_DISABLED ? false : { rejectUnauthorized: false },
  };
}

const pool = new Pool(buildDatabaseConfig(DATABASE_URL));

async function main() {
  const result = await pool.query('SELECT now() AS now, current_database() AS db');
  const row = result.rows[0];
  console.log(`Conexão OK | db=${row.db} | now=${row.now.toISOString()}`);

  const tableCheck = await pool.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'saas'
        AND table_name = 'meet_conferences'
    ) AS exists
  `);

  if (!tableCheck.rows[0].exists) {
    console.error('Tabela meet_conferences não existe. Rode: npm run db:migrate');
    process.exit(2);
  }

  console.log('Tabela meet_conferences encontrada.');
}

main()
  .catch((error) => {
    console.error('Falha na conexão/verificação:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
