// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-9router-local.js — 9ROUTER LOKAL NATIVE (v1)
//
// 9Router (npm: 9router) jalan BENERAN di Node.js bareng bot ini:
//   1. Boot bot → ensure9RouterRunning() spawn `node_modules/9router/cli.js`
//      headless di 127.0.0.1:20128 (run bareng, satu mesin, satu dependensi).
//   2. Self-heal sql-wasm.wasm: npm publish 9router nyabut file wasm dari
//      sql.js NESTED (node_modules/9router/app/node_modules/sql.js/dist).
//      Bot pasang sql.js sebagai dependensi sendiri (gak di-strip) lalu
//      copy wasm-nya ke path bundled — tanpa ini semua query DB 9router 500
//      ("No SQLite driver available").
//   3. Gateway key: otomatis dibikin via API manajemen internal 9router
//      (POST /api/keys, auth x-9r-cli-token dari ~/.9router) lalu disimpan
//      ke src/lib/apikey/9routerapikey.json (gateway.apikey).
//   4. Provider key berbayar/butuh apikey: owner isi di 9routerapikey.json
//      (providers[]), bot sync ke 9router (POST /api/providers) saat boot /
//      .9router sync — key gak pernah keluar dari server sendiri.
//   5. Chat: OpenAI SDK → http://127.0.0.1:20128/v1/chat/completions.
//      TANPA FALLBACK ke AI API lain (nexai/ikyy/zhipu/dll) — kalau 9router
//      bermasalah, bot jawab jujur. 747 model hidup via /v1/models.
//
// GOTCHA (pelajaran sandbox 25 Sep): server Next-nya 9router ganti process
// title jadi "next-server" — pkill pola "9router" GAK nembak dia; bunuh via
// pemilik port. Token CLI = sha256(machine-id + "9r-cli-auth" + cli-secret)
// hex[0:16] — file di ~/.9router/{machine-id, auth/cli-secret}.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROUTER9_REPO_ROOT = path.resolve(__dirname, "..", "..");

// ── konfigurasi (env bisa dioverride — dipakai e2e buat arahin ke mock) ──
// ⚠️ ATURAN OWNER (25 Sep 2026): 9Router LOKAL ini DILARANG nyambung ke
// 9RouterV2 (.ai9v2 — 9router.cloudku.us.kg, API endpoint milik orang lain).
// Engine ini CUMA boleh ngomong ke 127.0.0.1 (spawn bareng bot). JANGAN
// import router9v2.js / env-loader / getTioBase, JANGAN baca env ROUTER_API_*.
export function getRouter9Port() {
  return Number(process.env.ROUTER9_PORT || 20128);
}
export function getRouter9Base() {
  return (process.env.ROUTER9_URL || `http://127.0.0.1:${getRouter9Port()}`).replace(/\/+$/, "");
}
// PUSATISASI 10 Okt 2026 (request owner: semua key satu jalur): config 9router
// dilebur ke src/lib/apikey/apikeys.json → section "router". File dedicated
// 9routerapikey.json DIHAPUS. ROUTER9_CONFIG = override file dedicated
// (schema lama {gateway, providers}) — dipertahankan buat seam test & env VPS.
function getRouter9ConfigPath() {
  return process.env.ROUTER9_CONFIG || path.join(ROUTER9_REPO_ROOT, "src", "lib", "apikey", "apikeys.json");
}
function getRouter9DataDir() {
  return process.env.ROUTER9_DATA_DIR || path.join(os.homedir(), ".9router");
}
// REVISI 6 Okt 2026: default diganti alicode-intl/glm-4.7 (MATI — provider
// tanpa kredensial, error "No active credentials" tiap request) →
// gemini/gemini-3.8-flash (provider gemini kecolok dari apikeys.json
// raraai.google, TERVERIFIKASI live 6 Okt). Override tetap bisa via env
// ROUTER9_DEFAULT_MODEL / AGENT_BRAIN_MODEL / .9router otak model.
export const ROUTER9_DEFAULT_MODEL = process.env.ROUTER9_DEFAULT_MODEL || "gemini/gemini-3.8-flash";

// ── state runtime ──
const _state = {
  child: null,          // proses cli.js yang kita spawn (bisa null kalau 9router hidup duluan)
  upSince: 0,           // kapan terakhir dipastikan hidup
  startingPromise: null,// single-flight: gak spawn dobel (skill 5.4)
  stats: { requests: 0, ok: 0, fail: 0, lastLatencyMs: null, lastError: null, lastModel: null },
};

export function router9Stats() {
  return { ..._state.stats, upSince: _state.upSince || null };
}

// ── http kecil tanpa dependensi tambahan ──
async function httpJson(url, { method = "GET", headers = {}, body = null, timeoutMs = 8000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method, headers: body ? { "Content-Type": "application/json", ...headers } : headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* body bukan json — biarkan null */ }
    return { ok: res.ok, status: res.status, json, text: json ? undefined : text.slice(0, 500) };
  } catch (e) {
    return { ok: false, status: 0, json: null, error: e?.name === "AbortError" ? "timeout" : (e?.code || e?.message) };
  } finally {
    clearTimeout(timer);
  }
}

// ── health & spawn ──
export async function router9IsUp({ force = false } = {}) {
  if (!force && _state.upSince && Date.now() - _state.upSince < 3000) return true; // cache 3 dtk
  const r = await httpJson(`${getRouter9Base()}/api/health`, { timeoutMs: 3000 });
  if (r.ok) { _state.upSince = Date.now(); return true; }
  _state.upSince = 0;
  return false;
}

// Self-heal: copy sql-wasm.wasm dari sql.js dependensi bot → bundled 9router.
// npm publish 9router strip wasm nested; tanpa wasm semua akses DB 500.
function healSqlWasm() {
  try {
    const bundledDir = path.join(ROUTER9_REPO_ROOT, "node_modules", "9router", "app", "node_modules", "sql.js", "dist");
    const bundled = path.join(bundledDir, "sql-wasm.wasm");
    if (fs.existsSync(bundled)) return true;
    const ours = path.join(ROUTER9_REPO_ROOT, "node_modules", "sql.js", "dist", "sql-wasm.wasm");
    if (!fs.existsSync(ours)) return false;
    fs.mkdirSync(bundledDir, { recursive: true });
    fs.copyFileSync(ours, bundled);
    return true;
  } catch {
    return false;
  }
}

export async function ensure9RouterRunning({ waitMs = 30000, log = () => {} } = {}) {
  if (await router9IsUp({ force: true })) return { up: true, spawned: false };
  if (_state.startingPromise) return _state.startingPromise; // single-flight

  // mode tanpa-spawn: 9router dikelola terpisah (systemd) / keperluan tes
  if (process.env.ROUTER9_NO_SPAWN === "1") {
    return { up: false, spawned: false, error: "spawn dinonaktifkan (ROUTER9_NO_SPAWN=1) — 9router dianggap dikelola terpisah" };
  }

  _state.startingPromise = (async () => {
    const cliJs = path.join(ROUTER9_REPO_ROOT, "node_modules", "9router", "cli.js");
    if (!fs.existsSync(cliJs)) {
      return { up: false, spawned: false, error: "paket 9router belum terpasang — jalankan npm install" };
    }
    healSqlWasm(); // sebelum spawn biar server pertama langsung dapet db sehat
    ensureRouter9AuthFiles(); // server pertama langsung memakai secret yang sama dengan kita

    const port = getRouter9Port();
    const logDir = path.join(ROUTER9_REPO_ROOT, "logs");
    try { fs.mkdirSync(logDir, { recursive: true }); } catch { /* best effort */ }
    const out = (() => {
      try { return fs.openSync(path.join(logDir, "9router-local.log"), "a"); } catch { return "ignore"; }
    })();
    try {
      _state.child = spawn(process.execPath, [
        cliJs, "-p", String(port), "-H", "127.0.0.1", "-n", "--skip-update",
      ], { detached: true, stdio: ["ignore", out, out], env: { ...process.env }, cwd: ROUTER9_REPO_ROOT });
      _state.child.unref();
    } catch (e) {
      _state.child = null;
      return { up: false, spawned: true, error: `gagal spawn 9router: ${e?.message || e}` };
    }

    const deadline = Date.now() + waitMs;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 600));
      if (await router9IsUp({ force: true })) {
        log(`[9router-lokal] hidup di ${getRouter9Base()} (port ${port})`);
        return { up: true, spawned: true };
      }
    }
    return { up: false, spawned: true, error: `9router belum juga hidup setelah ${waitMs}ms — cek logs/9router-local.log` };
  })();

  try {
    return await _state.startingPromise;
  } finally {
    _state.startingPromise = null;
  }
}

// ── token manajemen internal 9router ──
// ── BOOTSTRAP FILE AUTH (3 Okt 2026, report owner: "machine-id HILANG,
// cli-secret HILANG ... HTTP 401" di VPS /home/container, padahal npm install
// sukses dan model live terbaca 637) ──
// AKAR (dibaca dari kode server 9router 0.5.75, api/keys/route.js): 9router
// membuat ~/.9router/machine-id dan ~/.9router/auth/cli-secret SECARA LAZY —
// hanya saat sebuah request manajemen SUDAH terautentikasi. Kalau kedua file itu
// belum ada, getRouter9CliToken() balik "" → kita kirim request TANPA token →
// server menolak 401 SEBELUM sempat membuat file → file tetap tidak ada → 401
// selamanya. Self-heal lama (kill → respawn) tidak menolong karena file memang
// tidak pernah dibuat, bukan cuma proses basi.
// FIX: kita buat sendiri file itu, dengan format PERSIS sama dengan server
// (machine-id = uuid, cli-secret = randomBytes(32).hex, mode 0600). Server
// membaca file yang sudah ada lebih dulu, jadi token kita = token server.
// Idempoten & TIDAK PERNAH menimpa file yang sudah ada (menimpa saat server
// hidup akan memutus sinkronisasi secret yang sudah ada di memorinya).
export function ensureRouter9AuthFiles() {
  const dir = getRouter9DataDir();
  const created = [], errors = [];
  const readTrim = (f) => { try { return fs.readFileSync(f, "utf8").trim(); } catch { return ""; } };
  const write = (f, content, label) => {
    try {
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, content, { mode: 0o600 });
      try { fs.chmodSync(f, 0o600); } catch { /* best effort (umask) */ }
      created.push(label);
    } catch (e) {
      errors.push(`${label}: ${e?.code || e?.message || e}`);
    }
  };
  const midFile = path.join(dir, "machine-id");
  const secretFile = path.join(dir, "auth", "cli-secret");
  if (!readTrim(midFile)) write(midFile, crypto.randomUUID(), "machine-id");
  if (!readTrim(secretFile)) write(secretFile, crypto.randomBytes(32).toString("hex"), "cli-secret");
  return { dir, created, errors };
}

export function getRouter9CliToken() {
  if (process.env.ROUTER9_CLI_TOKEN) return process.env.ROUTER9_CLI_TOKEN;
  try {
    ensureRouter9AuthFiles(); // file hilang → buat (lihat komentar bootstrap di atas)
    const dir = getRouter9DataDir();
    const mid = fs.readFileSync(path.join(dir, "machine-id"), "utf8").trim();
    const secret = fs.readFileSync(path.join(dir, "auth", "cli-secret"), "utf8").trim();
    if (!mid || !secret) return "";
    return crypto.createHash("sha256").update(mid + "9r-cli-auth" + secret).digest("hex").slice(0, 16);
  } catch {
    return "";
  }
}

// ── DIAGNOSTIK AUTH FILE (2 Okt 2026, report owner ".9router restart" 401
// terus-terusan walau PID ganti tiap restart — bukan "proses basi" lagi,
// kemungkinan file ~/.9router/machine-id atau auth/cli-secret gak ada/gak
// konsisten SAMA SEKALI, bukan cuma proses lama). Dipakai buat kasih pesan
// error yang NUNJUK akar beneran (file mana yang kosong, HOME dir apa)
// daripada cuma "HTTP 401" generik yang gak kebantu diagnosis dari WA.
export function router9AuthDiag() {
  const dir = getRouter9DataDir();
  const midPath = path.join(dir, "machine-id");
  const secretPath = path.join(dir, "auth", "cli-secret");
  let mid = "", secret = "";
  try { mid = fs.readFileSync(midPath, "utf8").trim(); } catch { /* belum ada */ }
  try { secret = fs.readFileSync(secretPath, "utf8").trim(); } catch { /* belum ada */ }
  return {
    dataDir: dir,
    home: os.homedir(),
    midExists: Boolean(mid),
    secretExists: Boolean(secret),
    tokenReady: Boolean(mid && secret),
  };
}

async function mgmtApi(method, apiPath, body = null) {
  const token = getRouter9CliToken();
  return httpJson(`${getRouter9Base()}${apiPath}`, {
    method, body,
    headers: token ? { "x-9r-cli-token": token } : {},
    timeoutMs: 15000,
  });
}

// ── SELF-HEAL: proses 9router "basi" di port tapi auth-nya gak sinkron ──
// GOTCHA (1 Okt 2026, bug nyata report owner "padahal katanya udah jalan"):
// server 9router (Next.js) GANTI PROCESS TITLE jadi "next-server" — jadi
// kalau proses LAMA dari boot sebelumnya masih nyangkut (gagal dibunuh pas
// restart bot, port 20128 masih dia pegang), /api/health TETAP 200 (proses
// itu beneran hidup) TAPI secret di memorinya BEDA dari ~/.9router/auth/
// cli-secret yang baru ditulis ulang (misal 9router regenerate pas upgrade
// versi) → token x-9r-cli-token yang rara hitung dari file gak match →
// POST /api/keys balik 401 TERUS walau health check hijau. ensure9RouterRunning()
// gak nolong karena dia cuma cek health, bukan identitas proses.
// FIX: cari PID pemilik port 20128 (BUKAN pattern "9router" — gagal karena
// nama proses udah ganti), bunuh paksa, baru spawn proses segar yang auth-nya
// pasti nyambung sama file ~/.9router terbaru.
// ── FALLBACK PORTABLE /proc (6 Okt 2026, report owner VPS Pterodactyl:
// "gagal pidnya" — image yolks nodejs_20 SUPER MINIMAL: lsof/fuser/ss gak
// ada → 3 cara di bawah semua miss → "gak ketemu proses di port" → proses
// basi gak pernah kebunuh → respawn gagal terus). /proc itu filesystem
// kernel, ADA di semua container Linux walau nol tool terpasang — baca
// /proc/net/tcp (port hex + state 0A = LISTEN) → socket inode → scan
// /proc/*/fd buat nemuin PID pemiliknya.
// Format baris: sl local_address rem_address st ... inode (kolom 10).
export function parseProcNetPort(content, port) {
  const lines = String(content || "").split("\n");
  for (const line of lines.slice(1)) { // baris pertama = header
    const cols = line.trim().split(/\s+/);
    if (cols.length < 10 || !cols[1]) continue;
    const pHex = cols[1].split(":")[1];
    if (!pHex) continue;
    // WAJIB state 0A (LISTEN) — koneksi ESTABLISHED ke port yang sama
    // (state 01) juga muncul dengan local_address:port → jangan bunuh
    // proses yang cuma PUNYA KONEKSI, cuma PEMILIK LISTENER yang dibunuh.
    if (parseInt(pHex, 16) === port && cols[3] === "0A") return cols[9] || null;
  }
  return null;
}

export function findPidBySocketInode(procDir, inode) {
  if (!inode) return null;
  try {
    for (const ent of fs.readdirSync(procDir)) {
      if (!/^\d+$/.test(ent)) continue;
      const fdDir = path.join(procDir, ent, "fd");
      let fds;
      try { fds = fs.readdirSync(fdDir); } catch { continue; } // bukan milik kita / udah mati
      for (const fd of fds) {
        try {
          if (fs.readlinkSync(path.join(fdDir, fd)) === `socket:[${inode}]`) return Number(ent);
        } catch {}
      }
    }
  } catch {}
  return null;
}

export async function findPidOnPort(port, { procDir = "/proc" } = {}) {
  // 1-3: tool klasik (kalau ada) — tetap paling cepet & akurat
  const attempts = [
    { cmd: "lsof", args: ["-ti", `:${port}`] },
    { cmd: "fuser", args: [`${port}/tcp`] },
    { cmd: "ss", args: ["-ltnp"] },
  ];
  for (const a of attempts) {
    try {
      const { stdout } = await execFileAsync(a.cmd, a.args, { timeout: 5000 });
      if (a.cmd === "ss") {
        // ss -ltnp output: ... LISTEN 0 128 127.0.0.1:20128 ... users:(("node",pid=1234,fd=5))
        const line = stdout.split("\n").find((l) => l.includes(`:${port} `));
        const match = line && line.match(/pid=(\d+)/);
        if (match) return Number(match[1]);
        continue;
      }
      const pids = stdout.trim().split(/\s+/).map(Number).filter((n) => Number.isInteger(n) && n > 0);
      if (pids.length) return pids[0];
    } catch {
      // tool gak ada / gak nemu apa-apa — coba cara berikutnya
    }
  }
  // 4: /proc langsung — container minimal (Pterodactyl yolks DSB) gak punya
  // 3 tool di atas sama sekali; /proc selalu ada. Cek tcp (IPv4) + tcp6.
  try {
    for (const f of ["tcp", "tcp6"]) {
      const content = fs.readFileSync(path.join(procDir, "net", f), "utf8");
      const pid = findPidBySocketInode(procDir, parseProcNetPort(content, port));
      if (pid) return pid;
    }
  } catch { /* /proc gak terbaca (bukan linux?) — nyerah */ }
  return null;
}

export async function killStalePort9Router({ port = getRouter9Port() } = {}) {
  // SAFETY: kalau ROUTER9_URL di-override (mock e2e / endpoint eksternal),
  // kita gak mengelola proses 9router lokal mana pun — JANGAN bunuh apa pun
  // yang kebetulan pegang port itu. Kill-by-port cuma sah saat engine
  // jalan mode default (spawn bareng bot di 127.0.0.1:20128).
  if (process.env.ROUTER9_URL) {
    return { killed: false, reason: "mode eksternal/mock (ROUTER9_URL di-set) — engine gak mengelola proses lokal" };
  }
  const pid = await findPidOnPort(port);
  if (!pid) return { killed: false, reason: "gak ketemu proses di port — mungkin memang belum jalan" };
  try {
    process.kill(pid, "SIGTERM");
    await new Promise((r) => setTimeout(r, 1200));
    try { process.kill(pid, 0); process.kill(pid, "SIGKILL"); } catch { /* udah mati duluan dari SIGTERM — bagus */ }
  } catch (e) {
    return { killed: false, reason: `gagal kill PID ${pid}: ${e.message}` };
  }
  _state.upSince = 0; // paksa health check berikutnya cek ulang, jangan percaya cache
  _state.child = null;
  return { killed: true, pid };
}

// ── konfigurasi apikey (src/lib/apikey/9routerapikey.json) ──
function readRouter9Config() {
  const DEFAULT_CFG = { gateway: { apikey: "" }, providers: [] };
  try {
    if (process.env.ROUTER9_CONFIG) {
      // override dedicated: schema lama {gateway, providers} polos
      return JSON.parse(fs.readFileSync(process.env.ROUTER9_CONFIG, "utf8")) || DEFAULT_CFG;
    }
    // default: section "router" di apikeys.json (satu jalur pusat)
    const raw = JSON.parse(fs.readFileSync(getRouter9ConfigPath(), "utf8"));
    return raw?.router || DEFAULT_CFG;
  } catch {
    return DEFAULT_CFG;
  }
}
function writeRouter9Config(cfg) {
  if (process.env.ROUTER9_CONFIG) {
    fs.mkdirSync(path.dirname(process.env.ROUTER9_CONFIG), { recursive: true });
    fs.writeFileSync(process.env.ROUTER9_CONFIG, JSON.stringify(cfg, null, 2) + "\n");
    return;
  }
  // default: tulis HANYA section router — section key lain di apikeys.json
  // (aiSatuan/fitur/scraper/dll) gak boleh tersentuh sama sekali
  const p = getRouter9ConfigPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  let raw = {};
  try { raw = JSON.parse(fs.readFileSync(p, "utf8")); } catch {}
  raw.router = cfg;
  fs.writeFileSync(p, JSON.stringify(raw, null, 2) + "\n");
}

// Gateway key: otomatis dibikin kalau belum ada — user gak perlu buka dashboard
// cuma buat copy key. Disimpan balik ke 9routerapikey.json biar persist.
export async function ensureRouter9GatewayKey({ create = true, _retried = false } = {}) {
  const cfg = readRouter9Config();
  const existing = cfg?.gateway?.apikey?.trim();
  if (existing) return existing;
  if (!create) return "";
  const r = await mgmtApi("POST", "/api/keys", { name: "rara-bot" });
  const key = r.ok && r.json?.key;
  if (!key) {
    // 🔹 SELF-HEAL 1 Okt 2026: 401/403 di sini SELALU berarti proses 9router
    // yang lagi hidup di port itu auth-nya gak sinkron sama file ~/.9router
    // terbaru (proses basi — lihat komentar killStalePort9Router). Health
    // check doang gak bisa bedain ini, jadi coba benerin OTOMATIS sekali:
    // bunuh proses di port → spawn ulang segar → ulang request SEKALI.
    // Gagal lagi → baru nyerah jujur (jangan infinite retry).
    if ((r.status === 401 || r.status === 403) && !_retried) {
      await killStalePort9Router();
      const up = await ensure9RouterRunning({ waitMs: 20000 });
      if (up.up) return ensureRouter9GatewayKey({ create, _retried: true });
    }
    const diag = router9AuthDiag();
    const diagMsg = diag.tokenReady
      ? "file auth lengkap tapi token masih ditolak server — proses basi, coba .9router restart"
      : `file auth 9router BELUM lengkap di ${diag.dataDir} (machine-id: ${diag.midExists ? "ada" : "HILANG"}, cli-secret: ${diag.secretExists ? "ada" : "HILANG"}, HOME=${diag.home}) — kemungkinan folder ini kehapus/kereset tiap restart container, cek persistensi HOME di VPS`;
    throw new Error(`gagal bikin gateway key 9router (HTTP ${r.status}) — ${diagMsg}`);
  }
  cfg.gateway = { ...(cfg.gateway || {}), apikey: key };
  writeRouter9Config(cfg);
  return key;
}

// ── SELF-HEAL GATEWAY KEY BASI (fix 1 Okt 2026 malam, report owner:
// ".9router restart ttep g bsa gagal") — akar: gateway.apikey di
// 9routerapikey.json bisa BASI (DB server 9router di-reset / machine-id
// ganti / key dari boot lain), tapi ensureRouter9GatewayKey() DULU
// PERCAYA BLIND key lama itu, dan .9router restart cuma respawn proses
// TANPA nyentuh key basi → kartu restart bilang "gateway ok" padahal
// chat tetap 401 selamanya. Sekarang: key divalidasi & diprovisi ulang
// otomatis di 3 titik (restart, chat, error message gak suruh manual lagi).

/** Buang gateway key basi dari 9routerapikey.json (dipakai sebelum re-provision). */
export async function invalidateRouter9GatewayKey() {
  const cfg = readRouter9Config();
  if (cfg?.gateway?.apikey) {
    cfg.gateway.apikey = "";
    writeRouter9Config(cfg);
    return true;
  }
  return false;
}

/** Validasi gateway key yang ada sekarang — dipakai .9router restart
 *  biar kartunya JUJUR (key lama ditolak = diprovisi baru, bukan "ok" palsu). */
export async function router9ValidateGatewayKey() {
  let key = "";
  try { key = await ensureRouter9GatewayKey(); } catch (e) { return { ok: false, error: e.message }; }
  if (!key) return { ok: false, error: "belum ada gateway key" };
  const r = await httpJson(`${getRouter9Base()}/v1/models`, {
    timeoutMs: 10000,
    headers: { Authorization: `Bearer ${key}` },
  });
  return { ok: r.ok, status: r.status, key };
}

// Sync provider key berbayar dari 9routerapikey.json → 9Router lokal.
// Skip yang kosong / gak aktif; skip yang udah ada (dedupe by name) biar gak dobel.
export async function syncRouter9ProviderKeys() {
  const cfg = readRouter9Config();
  const entries = (cfg?.providers || []).filter(p => p?.apikey?.trim() && p.aktif !== false);
  if (!entries.length) return { synced: 0, skipped: 0, errors: [] };

  const list = await mgmtApi("GET", "/api/providers");
  const existing = new Set((list.json?.connections || []).map(c => c?.name).filter(Boolean));
  const errors = [];
  let synced = 0, skipped = 0;

  for (const p of entries) {
    const name = p.label || p.provider;
    if (existing.has(name)) { skipped++; continue; }
    const r = await mgmtApi("POST", "/api/providers", {
      provider: p.provider, name,
      apiKey: p.apikey.trim(),
      ...(p.model ? { defaultModel: p.model } : {}),
    });
    if (r.ok && r.json?.connection) synced++;
    else errors.push(`${name}: HTTP ${r.status}${r.json?.error ? ` (${r.json.error})` : ""}`);
  }
  return { synced, skipped, errors };
}

// ── katalog model LIVE dari 9router (747 model) ──
export async function router9Models() {
  // /v1/models butuh Bearer gateway key (sejak 9router bikin key pertama)
  let key = "";
  try { key = await ensureRouter9GatewayKey(); } catch { /* belum ada → biar 401 jujur */ }
  const r = await httpJson(`${getRouter9Base()}/v1/models`, {
    timeoutMs: 10000,
    headers: key ? { Authorization: `Bearer ${key}` } : {},
  });
  if (!r.ok || !Array.isArray(r.json?.data)) {
    throw new Error(`gagal ambil daftar model 9router (HTTP ${r.status || "gak kejangkau"})`);
  }
  return r.json.data.map(m => ({
    id: m.id,
    owner: m.owned_by || m.id.split("/")[0],
    vision: Boolean(m.capabilities?.vision),
    imageOutput: Boolean(m.capabilities?.imageOutput),
    reasoning: Boolean(m.capabilities?.reasoning),
    tools: Boolean(m.capabilities?.tools),
    search: Boolean(m.capabilities?.search),
    ctx: m.capabilities?.contextWindow || null,
    maxOut: m.capabilities?.maxOutput || null,
  }));
}

export async function router9FindModel(id) {
  if (!id) return null;
  const needle = id.toLowerCase();
  const all = await router9Models();
  return all.find(m => m.id.toLowerCase() === needle)
    || all.find(m => m.id.toLowerCase().endsWith("/" + needle))
    || null;
}

// Model yang bisa BIKIN gambar (imageOutput) — dipakai .9router gambar
export async function router9ImageModels() {
  const all = await router9Models();
  return all.filter(m => m.imageOutput);
}

// Model yang bisa BACA gambar (vision) — dipakai jalur multimodal .9router
export async function router9VisionModels() {
  const all = await router9Models();
  return all.filter(m => m.vision);
}

// ── IMAGE GENERATION via /v1/images/generations (native 9router) ──
// Catatan: pool gratis gak punya model imageOutput — fitur gambar butuh
// koneksi provider image (poe:nano-banana / nvidia:flux / openai dall-e).
export async function router9ImageGen({ model, prompt, n = 1, size = "1024x1024", timeoutMs = 180000 } = {}) {
  if (!prompt?.trim()) throw new Error("prompt gambar kosong");
  const up = await ensure9RouterRunning();
  if (!up.up) throw new Error(`9Router lokal belum jalan${up.error ? ` — ${up.error}` : ""}. Coba lagi atau .9router status`);
  const key = await ensureRouter9GatewayKey();
  const client = new OpenAI({ baseURL: `${getRouter9Base()}/v1`, apiKey: key, timeout: timeoutMs, maxRetries: 0 });
  try {
    const res = await client.images.generate({
      model: model || undefined, // kosong → 9router pilih default image model
      prompt: prompt.trim(),
      n, size,
    });
    const d = res?.data?.[0];
    if (!d) throw new Error("9router gak balas data gambar");
    return { b64: d.b64_json || null, url: d.url || null, model: model || "default" };
  } catch (e) {
    const raw = String(e?.error?.message || e?.message || "");
    if (e?.status === 404 || /no active credentials|no credentials/i.test(raw)) {
      throw new Error("belum ada provider image-gen yang aktif di 9Router (mis. poe:nano-banana / nvidia:flux / openai dall-e) — isi key di src/lib/apikey/9routerapikey.json lalu .9router sync");
    }
    if (e?.status === 401 || e?.status === 403) throw new Error("gateway key 9router ditolak — cek gateway.apikey di 9routerapikey.json");
    if (e?.status === 429) throw new Error("9router kena rate limit — tunggu sebentar");
    throw new Error(raw || "gagal generate gambar via 9router");
  }
}

// ── CHAT — jantung 9router lokal. TANPA FALLBACK ke API AI lain. ──
export async function router9Chat({
  model, system, user, history = [], maxTokens = 1024, temperature = 0.7,
  timeoutMs = 120000, apiKey = null, _retried = false, _keyTries = 0,
} = {}) {
  const t0 = Date.now();
  _state.stats.requests++;

  const up = await ensure9RouterRunning();
  if (!up.up) {
    _state.stats.fail++;
    _state.stats.lastError = up.error || "9router mati";
    throw new Error(`9Router lokal belum jalan${up.error ? ` — ${up.error}` : ""}. Coba lagi atau .9router status`);
  }

  let key = apiKey;
  if (!key) {
    try { key = await ensureRouter9GatewayKey(); }
    catch (e) { _state.stats.fail++; _state.stats.lastError = e.message; throw e; }
  }

  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  for (const h of history) messages.push(h);
  // user: string ATAU array multimodal [{type:"text"},{type:"image_url",...}] (vision)
  if (user) messages.push({ role: "user", content: user });

  const client = new OpenAI({
    baseURL: `${getRouter9Base()}/v1`,
    apiKey: key,
    timeout: timeoutMs,
    maxRetries: 0, // jujur & cepat gagal — gak nyamar sukses lewat retry panjang
  });

  try {
    const res = await client.chat.completions.create({
      model: model || ROUTER9_DEFAULT_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
    });
    const text = res?.choices?.[0]?.message?.content || "";
    if (!text.trim()) {
      throw new Error("9router balas kosong — kemungkinan belum ada provider AI aktif. Buka dashboard 9router atau isi src/lib/apikey/9routerapikey.json lalu .9router sync");
    }
    const latencyMs = Date.now() - t0;
    _state.stats.ok++;
    _state.stats.lastLatencyMs = latencyMs;
    _state.stats.lastModel = res?.model || model;
    _state.stats.lastError = null;
    return { text: text.trim(), model: res?.model || model, latencyMs };
  } catch (e) {
    // ── RETRY KEY ROTASI (fix 6 Okt 2026 sore): upstream gemini sering cuma
    // kena SATU key yang kuotanya habis (429→503) ATAU ngehang; attempt
    // berikutnya biasanya dapet key lain yang masih hidup (bukti: curl
    // sukses beneran di menit yang sama). Ulang max 2x (timeout cuma 1x)
    // + backoff kecil — jangan nyerah di percobaan pertama.
    const rawErr = String(e?.error?.message || e?.message || "");
    const isTimeout = /timed ?out|timeout/i.test(rawErr);
    const retryable = e?.status === 503 || e?.status === 429 || isTimeout;
    const maxTries = isTimeout ? 1 : 2;
    if (retryable && _keyTries < maxTries) {
      const wait = 1200 * (_keyTries + 1) + Math.floor(Math.random() * 600);
      await new Promise((r) => setTimeout(r, wait));
      return await router9Chat({
        model, system, user, history, maxTokens, temperature, timeoutMs,
        apiKey, _retried, _keyTries: _keyTries + 1,
      });
    }

    // ── SELF-HEAL CHAT (fix 1 Okt 2026 malam): gateway key basi ditolak
    // server → buang key lama, provisi ulang, ULANG CHAT SEKALI. Tanpa ini
    // user dipaksa bersihin key manual + restart — dan .9router
    // restart pun gak nolong karena key basi gak pernah divalidasi.
    if ((e?.status === 401 || e?.status === 403) && !apiKey && !_retried) {
      try {
        await invalidateRouter9GatewayKey();
        const fresh = await ensureRouter9GatewayKey({ create: true });
        if (fresh) {
          return await router9Chat({
            model, system, user, history, maxTokens, temperature, timeoutMs,
            apiKey: fresh, _retried: true,
          });
        }
      } catch (e2) {
        console.error("[9router-lokal] self-heal gateway key gagal:", e2?.message || e2);
        // jatuh ke error jujur di bawah (jangan ngabarin sukses palsu)
      }
    }
    const latencyMs = Date.now() - t0;
    _state.stats.fail++;
    const msg = mapRouter9Error(e, model);
    _state.stats.lastError = msg;
    _state.stats.lastLatencyMs = latencyMs;
    const err = new Error(msg);
    err.status = e?.status || 0;
    throw err;
  }
}

// Error mapping — selalu jujur, gak pernah "sukses palsu".
function mapRouter9Error(e, model) {
  const status = e?.status;
  const raw = String(e?.error?.message || e?.message || "");
  if (status === 401 || status === 403) return `gateway key 9router ditolak (${status}) — key baru sudah otomatis dicoba; kalau masih gagal, ketik .9router restart (owner)`;
  if (status === 404 && /no active credentials/i.test(raw)) {
    return `belum ada provider aktif untuk model "${model}" — hubungkan provider di dashboard 9router (http://127.0.0.1:${getRouter9Port()}/dashboard) atau isi src/lib/apikey/9routerapikey.json lalu .9router sync`;
  }
  if (status === 404) return `model "${model}" gak ditemukan di 9Router — lihat .9router model`;
  if (status === 429) return "9router kena rate limit — tunggu sebentar";
  if (status === 402) return `provider untuk model "${model}" berbayar dan kuotanya gak cukup — cek dashboard 9router`;
  if (status >= 500 && /quota|exceeded|429/i.test(raw)) {
    return `key provider upstream kuotanya habis (429) — ganti/tambah key di src/lib/apikey/9routerapikey.json lalu .9router sync, atau ganti model (.9routeragent model <id>)`;
  }
  if (status >= 500) return `9router error internal (HTTP ${status}) — udah dicoba ulang, masih gagal; cek logs/9router-local.log`;
  if (e?.code === "ECONNREFUSED" || /fetch failed|networkerror/i.test(raw)) {
    return "9router lokal gak kejangkau — pastikan jalan (.9router status)";
  }
  return raw || "9router gagal tanpa keterangan";
}

// ── boot hook (dipanggil schedulerInits index.js — idempotent) ──
export async function initRouter9Boot({ log = console.log } = {}) {
  try {
    const up = await ensure9RouterRunning({ log });
    if (!up.up) {
      log(`[9router-lokal] ❌ belum jalan: ${up.error || "unknown"}`);
      return { up: false };
    }
    let gateway = "";
    try { gateway = await ensureRouter9GatewayKey(); } catch (e) { log(`[9router-lokal] ⚠️ ${e.message}`); }
    const sync = await syncRouter9ProviderKeys().catch(e => ({ synced: 0, skipped: 0, errors: [e.message] }));
    let modelCount = 0;
    try { modelCount = (await router9Models()).length; } catch { /* katalog bisa telat */ }
    log(`[9router-lokal] ✅ ${getRouter9Base()} • ${modelCount} model • gateway ${gateway ? "ok" : "belum"} • sync +${sync.synced} key`);
    return { up: true, gateway, sync, modelCount };
  } catch (e) {
    log(`[9router-lokal] ❌ ${e?.message || e}`);
    return { up: false, error: e?.message };
  }
}
