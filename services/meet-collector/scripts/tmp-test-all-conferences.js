require('dotenv').config();
const { Pool } = require('pg');

const BASE_URL = 'https://n8nouvidoria.contato-lojavirtual.com/meet/run-conference';
const TOKEN = process.env.WEBHOOK_TOKEN || 'api-meet-comercial';

async function postConferenceKey(conferenceKey) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'x-webhook-token': TOKEN,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ conference_key: conferenceKey }),
  });

  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}

  return {
    httpStatus: res.status,
    body: json,
    raw: text,
  };
}

(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL_DISABLED === 'true' ? false : { rejectUnauthorized: false },
  });

  const started = new Date();
  const report = {
    started_at: started.toISOString(),
    total: 0,
    ok_200: 0,
    done_now: 0,
    duplicated_or_already_done: 0,
    not_found_404: 0,
    bad_request_400: 0,
    server_error_500: 0,
    other_status: 0,
    by_error_message: {},
    sample_failures: [],
  };

  try {
    const rows = await pool.query(`
      select conference_key, status
      from appmax.meet_conferences
      order by created_at asc
    `);

    report.total = rows.rowCount;

    for (let i = 0; i < rows.rows.length; i += 1) {
      const { conference_key: key } = rows.rows[i];
      const r = await postConferenceKey(key);
      const body = r.body || {};
      const code = Number(body.statusCode || r.httpStatus || 0);

      if (code === 200) {
        report.ok_200 += 1;
        if (body?.duplicated || body?.alreadyProcessed) {
          report.duplicated_or_already_done += 1;
        } else {
          report.done_now += 1;
        }
      } else if (code === 404) {
        report.not_found_404 += 1;
      } else if (code === 400) {
        report.bad_request_400 += 1;
      } else if (code >= 500) {
        report.server_error_500 += 1;
      } else {
        report.other_status += 1;
      }

      const msg = body?.error || 'NO_ERROR_MESSAGE';
      if (code !== 200) {
        report.by_error_message[msg] = (report.by_error_message[msg] || 0) + 1;
      }

      if (code !== 200 && report.sample_failures.length < 10) {
        report.sample_failures.push({ conference_key: key, code, error: msg });
      }

      if ((i + 1) % 10 === 0) {
        console.log(`progress ${i + 1}/${rows.rows.length}`);
      }
    }

    const after = await pool.query(`
      select status, count(*)::int as qtd
      from appmax.meet_conferences
      group by status
      order by status
    `);

    report.finished_at = new Date().toISOString();
    report.status_distribution_after = after.rows;

    console.log('REPORT_JSON_START');
    console.log(JSON.stringify(report, null, 2));
    console.log('REPORT_JSON_END');
  } finally {
    await pool.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
