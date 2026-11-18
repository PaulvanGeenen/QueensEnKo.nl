import SftpClient from 'ssh2-sftp-client';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

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

async function syncDir(sftp, remoteDir, localDir) {
  let downloadedCount = 0;
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  let remoteItems = [];
  try {
    remoteItems = await sftp.list(remoteDir);
  } catch {
    return 0; // Remote map bestaat nog niet
  }

  for (const item of remoteItems) {
    if (item.name === '.' || item.name === '..') continue;
    const remoteItemPath = `${remoteDir}/${item.name}`;
    const localItemPath = path.join(localDir, item.name);

    if (item.type === 'd') {
      downloadedCount += await syncDir(sftp, remoteItemPath, localItemPath);
    } else if (item.type === '-') {
      let needDownload = true;
      if (fs.existsSync(localItemPath)) {
        const localStat = fs.statSync(localItemPath);
        if (localStat.size === item.size) {
          needDownload = false;
        }
      }

      if (needDownload) {
        await sftp.fastGet(remoteItemPath, localItemPath);
        console.log(`  📥 Download: ${path.relative(process.cwd(), localItemPath)}`);
        downloadedCount++;
      }
    }
  }

  return downloadedCount;
}

export async function syncMedia() {
  console.log('🔄 Uploads & mediabestanden synchroniseren vanaf TransIP...');

  if (!SFTP_CONFIG.password) {
    console.error('❌ TRANSIP_SFTP_PASS ontbreekt in .env.local.');
    return 0;
  }

  const sftp = new SftpClient();
  try {
    await sftp.connect(SFTP_CONFIG);

    const uploadsLocal = path.join(process.cwd(), 'public', 'uploads');
    const storageLocal = path.join(process.cwd(), 'public', 'storage');

    const countUploads = await syncDir(sftp, `${REMOTE_ROOT}/uploads`, uploadsLocal);
    const countStorage = await syncDir(sftp, `${REMOTE_ROOT}/storage`, storageLocal);

    const total = countUploads + countStorage;
    if (total > 0) {
      console.log(`✅ ${total} nieuw(e) geüpload(e) bestand(en) binnengehaald vanaf TransIP!`);
    } else {
      console.log('✅ Alle media is al up-to-date met TransIP.');
    }
    return total;
  } catch (err) {
    console.warn('⚠️ Waarschuwing bij synchroniseren van uploads:', err.message);
    return 0;
  } finally {
    await sftp.end();
  }
}

// Direct uitvoeren indien als standalone script aangeroepen
if (process.argv[1]?.endsWith('sync-media.js')) {
  syncMedia();
}
