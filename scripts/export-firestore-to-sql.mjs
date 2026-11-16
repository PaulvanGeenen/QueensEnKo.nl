import fs from 'fs';
import path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
if (!fs.existsSync(configPath)) {
  console.error('firebase-applet-config.json niet gevonden.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const { projectId, firestoreDatabaseId: databaseId, apiKey } = config;
const collections = ['agenda', 'sessions', 'daily_summaries', 'newsletter'];

function parseValue(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return parseFloat(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) {
    const out = {};
    for (const [k, mv] of Object.entries(v.mapValue.fields || {})) {
      out[k] = parseValue(mv);
    }
    return out;
  }
  if ('arrayValue' in v) {
    return (v.arrayValue.values || []).map(parseValue);
  }
  return null;
}

function parseDoc(doc) {
  const obj = { id: doc.name.split('/').pop() };
  for (const [k, v] of Object.entries(doc.fields || {})) {
    obj[k] = parseValue(v);
  }
  return obj;
}

async function fetchCollection(col) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: col }] } }),
  });
  if (!res.ok) {
    throw new Error(`Firestore error voor ${col}: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.filter((x) => x && x.document).map((x) => parseDoc(x.document));
}

function sqlStr(val) {
  if (val === null || val === undefined) return "''";
  const s = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
  return `'${s}'`;
}

function sqlJson(val, fallback) {
  return sqlStr(JSON.stringify(val ?? fallback));
}

async function main() {
  const backup = {};
  const sqlLines = [
    '-- Queens & Ko.nl - Firestore Export naar TransIP MySQL',
    `-- Gegenereerd op: ${new Date().toISOString()}`,
    '',
    fs.readFileSync(path.resolve(process.cwd(), 'sql/schema.sql'), 'utf-8'),
    '',
  ];

  for (const col of collections) {
    console.log(`Ophalen van collectie: ${col}...`);
    const docs = await fetchCollection(col);
    backup[col] = docs;
    console.log(`  -> ${docs.length} documenten gevonden.`);

    if (docs.length === 0) continue;

    if (col === 'agenda') {
      for (const d of docs) {
        sqlLines.push(
          `INSERT INTO \`agenda\` (\`id\`, \`date\`, \`locationName\`, \`locationCity\`, \`infoLink\`, \`ticketPrice\`, \`displayFrom\`, \`displayUntil\`, \`isVisible\`, \`ticketLink\`, \`isSoldOut\`, \`comments\`, \`address\`) VALUES (${sqlStr(d.id)}, ${sqlStr(d.date)}, ${sqlStr(d.locationName)}, ${sqlStr(d.locationCity)}, ${sqlStr(d.infoLink)}, ${sqlStr(d.ticketPrice)}, ${sqlStr(d.displayFrom)}, ${sqlStr(d.displayUntil)}, ${d.isVisible ? 1 : 0}, ${sqlStr(d.ticketLink)}, ${d.isSoldOut ? 1 : 0}, ${sqlStr(d.comments)}, ${sqlStr(d.address)}) ON DUPLICATE KEY UPDATE \`date\`=VALUES(\`date\`), \`locationName\`=VALUES(\`locationName\`), \`locationCity\`=VALUES(\`locationCity\`), \`infoLink\`=VALUES(\`infoLink\`), \`ticketPrice\`=VALUES(\`ticketPrice\`), \`displayFrom\`=VALUES(\`displayFrom\`), \`displayUntil\`=VALUES(\`displayUntil\`), \`isVisible\`=VALUES(\`isVisible\`), \`ticketLink\`=VALUES(\`ticketLink\`), \`isSoldOut\`=VALUES(\`isSoldOut\`), \`comments\`=VALUES(\`comments\`), \`address\`=VALUES(\`address\`);`
        );
      }
    } else if (col === 'sessions') {
      for (const d of docs) {
        sqlLines.push(
          `INSERT INTO \`sessions\` (\`id\`, \`startedAt\`, \`lastActiveAt\`, \`duration\`, \`referrer\`, \`city\`, \`country\`, \`latitude\`, \`longitude\`, \`device\`, \`os\`, \`userAgent\`, \`views\`, \`clicks\`) VALUES (${sqlStr(d.id)}, ${sqlStr(d.startedAt)}, ${sqlStr(d.lastActiveAt)}, ${Number(d.duration || 0)}, ${sqlStr(d.referrer)}, ${sqlStr(d.city)}, ${sqlStr(d.country)}, ${Number(d.latitude || 0)}, ${Number(d.longitude || 0)}, ${sqlStr(d.device)}, ${sqlStr(d.os)}, ${sqlStr(d.userAgent)}, ${sqlJson(d.views, {})}, ${sqlJson(d.clicks, [])}) ON DUPLICATE KEY UPDATE \`lastActiveAt\`=VALUES(\`lastActiveAt\`), \`duration\`=VALUES(\`duration\`), \`views\`=VALUES(\`views\`), \`clicks\`=VALUES(\`clicks\`);`
        );
      }
    } else if (col === 'daily_summaries') {
      for (const d of docs) {
        sqlLines.push(
          `INSERT INTO \`daily_summaries\` (\`id\`, \`date\`, \`totalVisitors\`, \`avgDuration\`, \`cities\`, \`devices\`, \`os\`, \`referrers\`, \`clicks\`) VALUES (${sqlStr(d.id)}, ${sqlStr(d.date || d.id)}, ${Number(d.totalVisitors || 0)}, ${Number(d.avgDuration || 0)}, ${sqlJson(d.cities, {})}, ${sqlJson(d.devices, {})}, ${sqlJson(d.os, {})}, ${sqlJson(d.referrers, {})}, ${sqlJson(d.clicks, {})}) ON DUPLICATE KEY UPDATE \`totalVisitors\`=VALUES(\`totalVisitors\`), \`avgDuration\`=VALUES(\`avgDuration\`), \`cities\`=VALUES(\`cities\`), \`devices\`=VALUES(\`devices\`), \`os\`=VALUES(\`os\`), \`referrers\`=VALUES(\`referrers\`), \`clicks\`=VALUES(\`clicks\`);`
        );
      }
    } else if (col === 'newsletter') {
      for (const d of docs) {
        sqlLines.push(
          `INSERT INTO \`newsletter\` (\`id\`, \`email\`, \`subscribedAt\`) VALUES (${sqlStr(d.id)}, ${sqlStr(d.email)}, ${sqlStr(d.subscribedAt)}) ON DUPLICATE KEY UPDATE \`email\`=VALUES(\`email\`), \`subscribedAt\`=VALUES(\`subscribedAt\`);`
        );
      }
    }
    sqlLines.push('');
  }

  fs.writeFileSync(path.resolve(process.cwd(), 'queensko_backup.json'), JSON.stringify(backup, null, 2), 'utf-8');
  fs.writeFileSync(path.resolve(process.cwd(), 'queensko_import.sql'), sqlLines.join('\n'), 'utf-8');
  console.log('Klaar! Bestanden aangemaakt: queensko_backup.json en queensko_import.sql');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
