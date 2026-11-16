import express, { RequestHandler } from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config();
}

const ALLOWED_COLLECTIONS = new Set(["agenda", "sessions", "daily_summaries", "newsletter"]);
const LOCAL_DB_DIR = path.resolve(process.cwd(), ".local_db");

function ensureLocalDb() {
  if (!fs.existsSync(LOCAL_DB_DIR)) {
    fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
  }
}

function readLocalCollection(collection: string): any[] {
  ensureLocalDb();
  const filePath = path.join(LOCAL_DB_DIR, `${collection}.json`);
  if (!fs.existsSync(filePath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeLocalCollection(collection: string, items: any[]) {
  ensureLocalDb();
  const filePath = path.join(LOCAL_DB_DIR, `${collection}.json`);
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2), "utf-8");
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const projectRoot = process.cwd();
  const distPath = path.resolve(projectRoot, "dist");
  const isProd = process.env.NODE_ENV === "production";
  const transipApiUrl = process.env.TRANSIP_API_URL?.trim();

  app.use(express.json({ limit: "2mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      mode: isProd ? "prod" : "dev",
      backend: transipApiUrl ? "transip-proxy" : "local-json",
    });
  });

  // Dev bridge voor /api/database.php (proxyt naar TransIP indien TRANSIP_API_URL gezet is, anders lokaal)
  app.all("/api/database.php", (async (req, res) => {
    const collection = String(req.query.collection || "");
    const id = req.query.id ? String(req.query.id) : "";

    if (req.query.health) {
      res.json({ status: "ok", backend: transipApiUrl ? "transip-proxy" : "local-json" });
      return;
    }

    if (!ALLOWED_COLLECTIONS.has(collection)) {
      res.status(400).json({ error: "Ongeldige collectie." });
      return;
    }

    if (transipApiUrl) {
      try {
        const target = new URL(transipApiUrl);
        target.searchParams.set("collection", collection);
        if (id) target.searchParams.set("id", id);

        const upstream = await fetch(target.toString(), {
          method: req.method,
          headers: { "Content-Type": "application/json" },
          body: req.method === "POST" ? JSON.stringify(req.body) : undefined,
        });
        const text = await upstream.text();
        res.status(upstream.status).type("application/json").send(text);
      } catch (err: any) {
        res.status(502).json({ error: `TransIP proxy fout: ${err.message}` });
      }
      return;
    }

    // Lokale dev-opslag in .local_db/
    if (req.method === "GET") {
      res.json(readLocalCollection(collection));
      return;
    }

    if (req.method === "POST") {
      const data = req.body || {};
      const docId = id || data.id || `doc_${Date.now()}`;
      const items = readLocalCollection(collection);
      const record = { ...data, id: docId };
      const idx = items.findIndex((item) => item.id === docId);
      if (idx >= 0) {
        items[idx] = record;
      } else {
        items.push(record);
      }
      writeLocalCollection(collection, items);
      res.json({ success: true, id: docId });
      return;
    }

    if (req.method === "DELETE") {
      if (!id) {
        res.status(400).json({ error: "Document id ontbreekt." });
        return;
      }
      const items = readLocalCollection(collection).filter((item) => item.id !== id);
      writeLocalCollection(collection, items);
      res.json({ success: true, id });
      return;
    }

    res.status(405).json({ error: "Methode niet toegestaan." });
  }) as RequestHandler);

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath, { index: false }));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api/")) {
        res.status(404).json({ error: "API route niet gevonden" });
        return;
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server gestart op http://localhost:${PORT} [${isProd ? "PROD" : "DEV"}]`);
  });
}

startServer();
