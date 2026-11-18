import SftpClient from 'ssh2-sftp-client';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { syncMedia } from './sync-media.js';

const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config();
}

const SFTP_CONFIG = {
  host: process.env.TRANSIP_SFTP_HOST || 'paulw6.ssh.transip.me',
  port: parseInt(process.env.TRANSIP_SFTP_PORT || '22', 10),
  username: process.env.TRANSIP_SFTP_USER || 'paulvangeenennl',
  password: process.env.TRANSIP_SFTP_PASS,
};

const REMOTE_ROOT = process.env.TRANSIP_REMOTE_ROOT || '/data/sites/web/paulvangeenennl/subsites/queensenko.nl';
const DIST_DIR = path.join(process.cwd(), 'dist');

const ALWAYS_UPLOAD_DIRS = new Set(['assets', 'api']);
const ALWAYS_UPLOAD_FILES = new Set(['index.html', '.htaccess', 'robots.txt', 'sitemap.xml']);

function walkDir(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

async function deploy() {
  // Synchroniseer eerst alle op de live site geüploade foto's & documenten naar lokaal
  try {
    await syncMedia();
  } catch (err) {
    console.warn('⚠️ Kon uploads niet synchroniseren:', err.message);
  }

  console.log('🚀 Start deploy naar TransIP...');
  console.log(`📡 Host: ${SFTP_CONFIG.host} (${SFTP_CONFIG.username})`);
  console.log(`📁 Doelmap: ${REMOTE_ROOT}`);

  if (!SFTP_CONFIG.password) {
    console.error('❌ TRANSIP_SFTP_PASS ontbreekt in .env.local.');
    process.exit(1);
  }

  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ Map dist/ niet gevonden. Voer eerst npm run build uit.');
    process.exit(1);
  }

  const sftp = new SftpClient();
  try {
    await sftp.connect(SFTP_CONFIG);
    console.log('✅ Verbonden via SFTP!');

    const files = walkDir(DIST_DIR);
    let uploaded = 0;
    let skipped = 0;

    for (const localPath of files) {
      const rel = path.relative(DIST_DIR, localPath).replace(/\\/g, '/');
      if (rel.endsWith('.gitkeep') || rel.endsWith('config.example.php')) continue;

      const remotePath = `${REMOTE_ROOT}/${rel}`;
      const remoteDir = path.posix.dirname(remotePath);
      const topDir = rel.split('/')[0];
      const forceUpload = ALWAYS_UPLOAD_DIRS.has(topDir) || ALWAYS_UPLOAD_FILES.has(rel);

      let needUpload = true;
      if (!forceUpload) {
        try {
          const localStat = fs.statSync(localPath);
          const remoteStat = await sftp.stat(remotePath);
          const localMtimeSec = Math.floor(localStat.mtimeMs / 1000);
          if (remoteStat.size === localStat.size && localMtimeSec <= remoteStat.modifyTime + 2) {
            needUpload = false;
          }
        } catch {
          needUpload = true;
        }
      }

      if (needUpload) {
        try {
          await sftp.mkdir(remoteDir, true);
        } catch {
          // Directory already exists
        }
        await sftp.fastPut(localPath, remotePath);
        uploaded++;
        console.log(`  ✔ ${rel}`);
      } else {
        skipped++;
      }
    }

    console.log(`\n🎉 Deploy voltooid! ${uploaded} geüpload, ${skipped} ongewijzigd overgeslagen.`);
  } finally {
    await sftp.end();
  }
}

deploy().catch((err) => {
  console.error('❌ Deploy mislukt:', err);
  process.exit(1);
});
