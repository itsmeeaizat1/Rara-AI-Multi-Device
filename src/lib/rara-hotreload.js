// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Engine hot-reload: watch folder plugins/ — file .js berubah/ditambah → auto reload TANPA restart bot.
// Catatan jujur: cuma PLUGIN yang di-reload; perubahan di src/lib atau src/handler.js tetap butuh restart.
import fs from "fs";
import path from "path";
import { hotReloadPlugin } from "./rara-plugins.js";
import { getDatabase } from "./rara-database.js";

let watcher = null;
let debounceTimer = null;
const pending = new Map();
let notifyFn = null;
const DEBOUNCE_MS = 1500;

function db() {
  const database = getDatabase();
  if (!database.data.hotreload) {
    database.data.hotreload = { on: false, notifyTo: "", lastReload: null, count: 0, log: [] };
  }
  return database;
}

export function setHotreloadNotifier(fn) { notifyFn = fn; }
export function isHotreloadActive() { return !!watcher; }

export function startHotreload() {
  if (watcher) return { ok: true, already: true };
  const pluginsDir = path.resolve("plugins");
  if (!fs.existsSync(pluginsDir)) return { ok: false, error: "folder plugins/ gak ketemu" };
  try {
    watcher = fs.watch(pluginsDir, { recursive: true, persistent: false }, (event, filename) => {
      if (!filename || !String(filename).endsWith(".js")) return;
      const abs = path.join(pluginsDir, String(filename));
      if (!fs.existsSync(abs)) return;
      pending.set(abs, Date.now());
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { processPending().catch(() => {}); }, DEBOUNCE_MS);
    });
    watcher.on("error", () => { watcher = null; });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e.message).slice(0, 120) };
  }
}

export function stopHotreload() {
  if (debounceTimer) clearTimeout(debounceTimer);
  if (watcher) { watcher.close(); watcher = null; }
  return { ok: true };
}

async function processPending() {
  const files = [...pending.keys()];
  pending.clear();
  if (!files.length) return [];
  const results = [];
  for (const f of files) {
    try {
      const r = await hotReloadPlugin(f);
      results.push({ file: path.basename(f), ok: !!(r && r.success), name: (r && (r.name || r.error)) || "?" });
    } catch (e) {
      results.push({ file: path.basename(f), ok: false, name: String(e.message).slice(0, 120) });
    }
  }
  const d = db().data.hotreload;
  d.lastReload = new Date().toISOString();
  d.count += results.length;
  d.log = [{ when: d.lastReload, results }, ...(d.log || [])].slice(0, 20);
  if (notifyFn && d.notifyTo && results.length) {
    const okCount = results.filter((r) => r.ok).length;
    const lines = results.map((r) => (r.ok ? "✅ " : "❌ ") + r.file + (r.ok ? "" : " — " + r.name)).join("\n");
    try { await notifyFn(d.notifyTo, "♻️ HOT RELOAD\n" + okCount + "/" + results.length + " plugin dimuat ulang:\n" + lines); } catch {}
  }
  return results;
}

export async function manualReload(relPath) {
  const abs = path.resolve(relPath);
  if (!abs.startsWith(path.resolve("plugins"))) return { ok: false, error: "path harus di dalam plugins/ (contoh: plugins/main/menu.js)" };
  if (!fs.existsSync(abs)) return { ok: false, error: "file gak ketemu: " + relPath };
  try {
    const r = await hotReloadPlugin(abs);
    return { ok: !!(r && r.success), name: (r && (r.name || r.error)) || "?" };
  } catch (e) {
    return { ok: false, error: String(e.message).slice(0, 160) };
  }
}

export function enableHotreload(chatId) {
  const d = db().data.hotreload;
  d.on = true;
  if (chatId) d.notifyTo = chatId;
  return startHotreload();
}

export function disableHotreload() {
  const d = db().data.hotreload;
  d.on = false;
  return stopHotreload();
}

export function hotreloadStatus() {
  const d = db().data.hotreload;
  return { active: !!watcher, on: d.on, notifyTo: d.notifyTo, count: d.count, lastReload: d.lastReload, log: (d.log || []).slice(0, 5) };
}

// dipanggil schedulerInits pas boot: kalau flag on → lanjut watch
export async function resumeHotreload(sock) {
  const d = db().data.hotreload;
  if (!d.on) return { resumed: false };
  if (sock) {
    setHotreloadNotifier(async (to, text) => { try { await sock.sendMessage(to, { text }); } catch {} });
  }
  const r = await startHotreload();
  return { resumed: true, ...r };
}

// seam test
export async function _processPendingForTest() { return processPending(); }
