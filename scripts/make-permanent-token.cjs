const https = require('https');
const fs = require('fs');
const path = require('path');
const SftpClient = require('ssh2-sftp-client');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const appId = '1119301770863724';
const appSecret = '4f438989673ad4b1dc8c9df465c80cc8';
const pageId = '1543311408856205';
const igId = '17841406119652341';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function run(shortLivedUserToken) {
  if (!shortLivedUserToken || !shortLivedUserToken.startsWith('EAA')) {
    console.error('Gebruik: node scripts/make-permanent-token.cjs <USER_TOKEN>');
    process.exit(1);
  }

  console.log('1. Stap 1: Short-lived token omwisselen naar Long-Lived User Token (60 dagen)...');
  const longLivedRes = await get(`https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedUserToken}`);

  if (!longLivedRes.body?.access_token) {
    console.error('❌ Fout bij omwisselen token:', JSON.stringify(longLivedRes.body, null, 2));
    process.exit(1);
  }

  const longLivedUserToken = longLivedRes.body.access_token;
  console.log('✅ Long-lived User Token verkregen!');

  console.log('2. Stap 2: Permanent Page Token opvragen voor Queens & Ko...');
  const pagesRes = await get(`https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedUserToken}`);

  let permanentPageToken = null;
  if (pagesRes.body?.data) {
    const page = pagesRes.body.data.find(p => p.id === pageId) || pagesRes.body.data[0];
    if (page) {
      permanentPageToken = page.access_token;
      console.log(`✅ Gevonden pagina: ${page.name} (${page.id})`);
    }
  }

  if (!permanentPageToken) {
    // Probeer direct via page endpoint
    const directPageRes = await get(`https://graph.facebook.com/v21.0/${pageId}?fields=access_token&access_token=${longLivedUserToken}`);
    if (directPageRes.body?.access_token) {
      permanentPageToken = directPageRes.body.access_token;
    }
  }

  if (!permanentPageToken) {
    console.error('❌ Kon geen Page Token ophalen:', JSON.stringify(pagesRes.body, null, 2));
    process.exit(1);
  }

  console.log('3. Stap 3: Geldigheid en vervaldatum controleren van Page Token...');
  const debugRes = await get(`https://graph.facebook.com/debug_token?input_token=${permanentPageToken}&access_token=${appId}|${appSecret}`);
  const data = debugRes.body?.data;
  console.log('Token Type:', data?.type);
  console.log('Verloopt op (expires_at):', data?.expires_at === 0 ? 'NEVER (Verloopt NOOIT! ✅)' : new Date(data?.expires_at * 1000).toLocaleString());
  console.log('Scopes:', data?.scopes);

  console.log('4. Stap 4: social_config.php lokaal bijwerken...');
  const configContent = `<?php
/**
 * Queens & Ko.nl - Live Social Media Credentials
 * Bevat de permanente, nooit-verlopende Page Token voor Facebook & Instagram.
 */
return [
    'fb_page_id' => '${pageId}',
    'ig_user_id' => '${igId}',
    'meta_access_token' => '${permanentPageToken}',
    'site_url' => 'https://queensenko.nl',
];
`;

  const configPath = path.join(__dirname, '..', 'public', 'api', 'social_config.php');
  fs.writeFileSync(configPath, configContent, 'utf8');
  console.log('✅ social_config.php lokaal opgeslagen.');

  console.log('5. Stap 5: social_config.php direct uploaden naar TransIP via SFTP...');
  const sftp = new SftpClient();
  try {
    await sftp.connect({
      host: process.env.TRANSIP_SFTP_HOST || 'paulw6.ssh.transip.me',
      port: parseInt(process.env.TRANSIP_SFTP_PORT || '22', 10),
      username: process.env.TRANSIP_SFTP_USER || 'paulvangeenennl',
      password: process.env.TRANSIP_SFTP_PASS,
    });

    const remoteRoot = process.env.TRANSIP_REMOTE_ROOT || '/data/sites/web/paulvangeenennl/subsites/queensenko.nl';
    await sftp.put(Buffer.from(configContent, 'utf8'), `${remoteRoot}/api/social_config.php`);
    console.log('🎉 SUCCES! Permanent Page Token is live gezet op TransIP!');
  } finally {
    await sftp.end();
  }
}

const inputToken = process.argv[2];
run(inputToken);
