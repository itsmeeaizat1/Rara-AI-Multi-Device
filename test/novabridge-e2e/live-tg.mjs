// LIVE TEST novabridge — jalanin bridge Telegram NYATA dari sandbox.
// Owner DM bot → pesan masuk → adapter → messageHandler asli → balasan ke Telegram.
// Run (dari root repo): node test/novabridge-e2e/live-tg.mjs
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
const R = path.resolve(".");
const url = (p) => pathToFileURL(path.join(R, p)).href;

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) { console.error("TELEGRAM_BOT_TOKEN gak ada di env"); process.exit(1); }

const { initDatabase } = await import(url("src/lib/nova-database.js"));
await initDatabase(path.join(os.tmpdir(), "novabridge-live-" + Date.now()));
const { loadPlugins } = await import(url("src/lib/nova-plugins.js"));
const n = await loadPlugins(path.join(R, "plugins"));
console.log(`[live] ${n} plugin loaded`);
const adapter = await import(url("src/lib/novabridge/adapter.js"));
const { messageHandler } = await import(url("src/handler.js"));
const { getDatabase } = await import(url("src/lib/nova-database.js"));
const db = getDatabase();
adapter.ensureBridgeState(db);
try { db.setting("botMode", "public"); db.db.write(); } catch {}

const manager = await import(url("src/lib/novabridge/manager.js"));
const r = await manager.startTelegramBridge();
if (!r.ok) { console.error("[live] start gagal:", r.error); process.exit(1); }
console.log(`[live] bridge aktif sebagai @${r.me?.username} — tunggu DM dari owner...`);

process.on("SIGINT", async () => {
  console.log("[live] stop");
  manager.stopTelegramBridge();
  process.exit(0);
});
