# Queens & Ko.nl

Website en beheerdashboard voor **Queens & Ko** (Queen-tributeband), geport vanuit Google AI Studio naar Antigravity met TransIP hosting & MySQL-database.

## Lokaal draaien

1. Installeer dependencies:
   ```bash
   npm install
   ```
2. Start de ontwikkelserver (`http://localhost:3000`):
   ```bash
   npm run dev
   ```
   Standaard gebruikt de dev-server lokale JSON-opslag in `.local_db/`. Wil je lokaal direct tegen de live TransIP-database werken, vul dan `TRANSIP_API_URL` in `.env.local` in.
3. Typecheck en productie-build:
   ```bash
   npm run lint
   npm run build
   ```

## TransIP MySQL & Hosting

1. Importeer [sql/schema.sql](sql/schema.sql) in je TransIP MySQL-database (via phpMyAdmin).
2. Kopieer `public/api/config.example.php` naar `public/api/config.php` en vul je TransIP MySQL-gegevens in (`config.php` staat in `.gitignore` en wordt nooit naar GitHub gepusht).
3. Upload de inhoud van `dist/` (inclusief `.htaccess` en `api/`) naar de webroot op TransIP.
