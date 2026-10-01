// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 RARA DOCTOR — Self-Healing Bot (request owner 12 Sep 2026,
//   ide fitur no 7)
// 🔹 Bot yang benerin dirinya sendiri pas owner tidur:
//   error ke-record → AI baca stack trace → tulis patch → syntax
//   test → backup → apply. Yang bahaya (AI nulis kode) OWNER-GATE,
//   yang aman (log cleanup, monitoring) jalan otomatis.
// 🔹 DEFAULT OFF — pas pairing pertama mati total, harus owner yang
//   aktifin manual lewat .doctor on (request owner 12 Sep).
// ============================================================
import path from "path";
import fs from "fs";
import { execFileSync } from "child_process";
import { aiChainChat } from "./rara-ai-fallback.js";
import { getDatabase } from "./rara-database.js";

const DATA_KEY = "doctor"; // { on, auto, notifyJid, errors[], lastNotified }
const ERR_CAP = 50;        // ring buffer maksimal entri
const ERR_TTL_MS = 7 * 24 * 3600 * 1000; // log cleanup otomatis (AMAN)
const CHECK_DEFAULT_MS = 10 * 60 * 1000; // monitor tiap 10 menit
const FILE_CAP = 60000;   // maksimal ukuran file yang dibaca AI
const CONTEXT_LINES = 60; // slice sekitar baris error (±60 baris)

// ── seams (e2e: setDoctorDeps) ───────────────────────────────
let _aiChat = aiChainChat;
let _fs = fs;
let _checkSyntax = async (absPath) => {
  execFileSync("node", ["--check", absPath], { timeout: 15000, stdio: "pipe" });
  return true;
};
let _repoRoot = null;
let _now = () => Date.now();

export function setDoctorDeps(deps = {}) {
  if (deps.aiChat) _aiChat = deps.aiChat;
  if (deps.fs) _fs = deps.fs;
  if (deps.checkSyntax) _checkSyntax = deps.checkSyntax;
  if (deps.repoRoot !== undefined) _repoRoot = deps.repoRoot;
  if (deps.now) _now = deps.now;
}

export function resetDoctorDeps() {
  _aiChat = aiChainChat;
  _fs = fs;
  _checkSyntax = async (absPath) => {
    execFileSync("node", ["--check", absPath], { timeout: 15000, stdio: "pipe" });
    return true;
  };
  _repoRoot = null;
  _now = () => Date.now();
}

function repoRoot() {
  if (_repoRoot) return _repoRoot;
  return path.resolve(process.cwd());
}

// ── data ────────────────────────────────────────────────────
export function getDoctorData(db) {
  try {
    const d = db?.setting?.(DATA_KEY);
    if (d && typeof d === "object" && Array.isArray(d.errors)) return d;
  } catch {}
  return { on: false, auto: false, notifyJid: "", errors: [], lastNotified: 0 };
}

function saveDoctor(db, d) {
  try { db?.setting?.(DATA_KEY, d); } catch {}
}

export function isDoctorOn(db) {
  try { return getDoctorData(db).on === true; } catch { return false; }
}

export function isDoctorAuto(db) {
  try { return getDoctorData(db).auto === true; } catch { return false; }
}

// Owner aktifin manual — default pairing pertama OFF
export function setDoctorOn(db, on, notifyJid) {
  const d = getDoctorData(db);
  d.on = on === true;
  if (notifyJid) d.notifyJid = notifyJid;
  if (!on) d.auto = false; // off total → auto-heal ikut mati
  saveDoctor(db, d);
  return d.on;
}

export function setDoctorAuto(db, auto) {
  const d = getDoctorData(db);
  if (!d.on) return { ok: false, msg: "doctor masih OFF — .doctor on dulu" };
  d.auto = auto === true;
  saveDoctor(db, d);
  return { ok: true, auto: d.auto };
}

// ── STACK PARSER — ambil frame pertama yang file-nya di repo ─
export function extractRepoFrame(stack) {
  const s = String(stack || "");
  const root = repoRoot();
  const re = /at\s+.*?\(?((?:\/|[A-Za-z]:[\\/])[^\s()]+?):(\d+):\d+\)?/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const file = m[1];
    // harus file di dalem repo + folder src/ atau plugins/ (whitelist)
    const norm = path.normalize(file);
    if (norm.startsWith(root)) {
      const rel = path.relative(root, norm);
      if (/^(src|plugins)[\\/]/.test(rel)) {
        return { file: rel.split(path.sep).join("/"), line: parseInt(m[2], 10) || 0 };
      }
    }
  }
  return null;
}

// ── RECORD — dipanggil dari anti-crash index.js + handler ──
export function recordDoctorError(db, context, err) {
  try {
    const d = getDoctorData(db);
    const message = String(err?.message || err || "unknown error").slice(0, 300);
    const stack = String(err?.stack || err || "").slice(0, 4000);
    const frame = extractRepoFrame(stack) || { file: null, line: 0 };
    const sig = `${context}|${message}|${frame.file || "-"}`;
    const now = _now();
    const existing = d.errors.find((e) => e.sig === sig);
    if (existing) {
      existing.count++;
      existing.lastSeen = now;
      existing.stack = stack;
    } else {
      d.errors.unshift({
        sig, context, message, stack,
        file: frame.file, line: frame.line,
        count: 1, firstSeen: now, lastSeen: now, healed: false,
      });
      if (d.errors.length > ERR_CAP) d.errors.length = ERR_CAP;
    }
    saveDoctor(db, d);
    return d.errors[0];
  } catch { return null; }
}

// Anti-crash index.js manggil ini (dynamic import) — db diambil sendiri,
// gak nyimpen kalau database belum siap (pairing pertama = aman, default off).
export function recordDoctorErrorAuto(context, err, db) {
  try {
    const target = db || getDatabase();
    if (!target) return null; // database belum siap (boot awal) — skip aman
    return recordDoctorError(target, context, err);
  } catch { return null; }
}

// ── SCAN (AMAN — cuma lapor) ───────────────────────────────
export function doctorScan(db) {
  const d = getDoctorData(db);
  return { on: d.on, auto: d.auto, total: d.errors.length, errors: d.errors };
}

// ── CLEANUP (AMAN — jalan otomatis di monitor) ──────────────
export function doctorClean(db) {
  try {
    const d = getDoctorData(db);
    const cutoff = _now() - ERR_TTL_MS;
    const before = d.errors.length;
    d.errors = d.errors.filter((e) => e.lastSeen > cutoff);
    saveDoctor(db, d);
    return { removed: before - d.errors.length, total: d.errors.length };
  } catch { return { removed: 0, total: 0 }; }
}

// ── HEAL (BAHAYA — owner-gate: .doctor heal / auto=opt-in) ──
const SYS_DOCTOR = `Kamu Rara Doctor — engineer AI yang ngerusak perbaikan bug di repo bot WhatsApp Node.js (ESM).
Kamu dikasih: pesan error + stack trace + potongan kode file yang error.
TUGAS: tulis patch PERBAIKAN MINIMAL yang paling mungkin bener (null-check, try-catch, guard array, fix nama method, dll). JANGAN refactor besar, JANGAN ubah fitur, cukup hentikan error-nya.

WAJIB balas OBJEK JSON MURNI (tanpa kalimat lain, tanpa markdown):
{
  "find": "potongan kode PERSIS dari file yang mau diganti (harus SAMA KARAKTER per karakter, cukup unik, 1-4 baris)",
  "replace": "kode pengganti hasil perbaikanmu",
  "reason": "penjelasan singkat bahasa Indonesia kenapa ini benerin errornya"
}

ATURAN:
- "find" WAJIB string yang persis ada di potongan kode yang dikasih — SALIN persis termasuk spasi/indentasi.
- Perbaikan minimal & aman. Kalo error-nya bukan bug kode (misal API down/network), balas {"find":"","replace":"","reason":"<kenapa gak bisa dipatch>"}.
- Jangan pernah megang hal sensitif (apikeys, owner gate, billing).`;

export async function doctorHeal(db, index = 0) {
  const d = getDoctorData(db);
  const entry = d.errors[index] || d.errors[0];
  if (!entry) return { ok: false, msg: "Belum ada error yang tercatat" };
  if (entry.healed) return { ok: false, msg: `Error "${entry.message.slice(0, 40)}" sudah pernah diheal` };
  if (!entry.file) return { ok: false, msg: "Stack trace gak nunjukin file repo (kemungkinan error eksternal/API) — gak bisa dipatch" };

  // 1. baca file target (whitelist src/ + plugins/ udah dicek pas extract)
  const root = repoRoot();
  const abs = path.resolve(root, entry.file);
  if (!abs.startsWith(root)) return { ok: false, msg: "Path file di luar repo — ditolak" };
  let content;
  try { content = _fs.readFileSync(abs, "utf-8"); } catch { return { ok: false, msg: `File ${entry.file} gak kebaca` }; }
  if (content.length > FILE_CAP) return { ok: false, msg: `File ${entry.file} kegedean (${Math.round(content.length / 1000)}KB) — skip biar aman` };

  // 2. slice konteks sekitar baris error biar AI fokus
  const lines = content.split("\n");
  const center = Math.min(Math.max(entry.line - 1, 0), lines.length - 1);
  const from = Math.max(0, center - CONTEXT_LINES);
  const to = Math.min(lines.length, center + CONTEXT_LINES);
  const context = lines.slice(from, to).map((l, i) => `${from + i + 1}| ${l}`).join("\n");

  // 3. AI diagnosis
  const prompt = `ERROR (${entry.context}, ${entry.count}x): ${entry.message}
STACK TRACE:
${entry.stack}

FILE: ${entry.file} (baris error ±${entry.line})
POTONGAN KODE (nomor|isi):
${context}`;

  let patch;
  try {
    const raw = await _aiChat(prompt, { systemPrompt: SYS_DOCTOR });
    patch = extractJson(raw);
  } catch (e) {
    return { ok: false, msg: `Otak AI doctor gagal: ${e?.message || e}` };
  }
  if (!patch || typeof patch.find !== "string" || typeof patch.replace !== "string") {
    return { ok: false, msg: "AI gak ngasih patch JSON yang valid" };
  }
  if (!patch.find.trim()) {
    return { ok: false, msg: `AI: ${patch.reason || "gak bisa dipatch (bukan bug kode)"}` };
  }

  // 4. validasi: find HARUS persis 1 kemunculan
  const occurrences = content.split(patch.find).length - 1;
  if (occurrences === 0) return { ok: false, msg: "Potongan kode dari AI gak ketemu di file (find gak persis) — ditolak" };
  if (occurrences > 1) return { ok: false, msg: `Potongan kode gak unik (${occurrences} kemunculan) — ditolak biar gak salah tambal` };

  // 5. backup → apply → syntax check → revert kalau rusak
  const backupDir = path.resolve(root, "backups", "doctor");
  try { _fs.mkdirSync(backupDir, { recursive: true }); } catch {}
  const ts = new Date(_now()).toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `${entry.file.replace(/[\\/]/g, "__")}.${ts}.bak`);
  _fs.writeFileSync(backupPath, content);

  const patched = content.replace(patch.find, patch.replace);
  _fs.writeFileSync(abs, patched);
  try {
    await _checkSyntax(abs);
  } catch (e) {
    _fs.writeFileSync(abs, content); // revert!
    return { ok: false, msg: `Patch gagal syntax check — file DIREVERT utuh. (${e?.message?.slice(0, 80) || e})` };
  }

  // 6. tandai healed
  entry.healed = true;
  entry.healedAt = _now();
  saveDoctor(db, d);

  return {
    ok: true, file: entry.file, backupPath: path.relative(root, backupPath),
    reason: patch.reason || "-", message: entry.message,
  };
}

// JSON parser (pola think() — strip code fence, ambil blok {})
function extractJson(text) {
  const s = String(text || "").replace(/```(?:json)?/gi, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a === -1 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

// ── MONITOR SCHEDULER (AMAN: cleanup + notif; auto-heal opt-in) ─
let monitorTimer = null;

export async function initDoctorMonitor(sock, dbOverride = null) {
  if (monitorTimer) clearInterval(monitorTimer);
  // db diambil LAZY tiap run — database mungkin belum siap pas init
  const getDb = () => {
    if (dbOverride) return dbOverride;
    try { return getDatabase(); } catch { return null; }
  };
  const run = async () => {
    try {
      const db = getDb();
      if (!db) return;
      const d = getDoctorData(db);
      if (!d.on) return;
      doctorClean(db); // aman — jalan otomatis
      const fresh = d.errors.filter((e) => !e.healed && e.lastSeen > (d.lastNotified || 0));
      if (!fresh.length) return;
      const target = d.notifyJid;
      if (target && sock) {
        const total = fresh.length;
        let body = `🩺 *Rara Doctor* — ${total} error baru terdeteksi:\n`;
        for (const e of fresh.slice(0, 5)) {
          body += `• ${e.message.slice(0, 80)}${e.file ? `\n   ↳ ${e.file}:${e.line}` : ""} (${e.count}x)\n`;
        }
        body += `\nPerbaikan otomatis: .doctor heal | Laporan lengkap: .doctor scan`;
        try { await sock.sendMessage(target, { text: body }); } catch {}
      }
      // AUTO-HEAL (opt-in eksplisit owner: .doctor auto on)
      if (d.auto && sock) {
        for (const e of fresh.slice(0, 3)) {
          const idx = d.errors.findIndex((x) => x.sig === e.sig);
          const res = await doctorHeal(db, idx);
          const line = res.ok
            ? `✅ ${res.file} diheal — ${res.reason}`
            : `⚠️ "${e.message.slice(0, 50)}" — ${res.msg}`;
          if (target) { try { await sock.sendMessage(target, { text: `🩺 *Auto-heal*\n${line}\n\n_Restart PM2 biar patch kepake._` }); } catch {} }
        }
      }
      d.lastNotified = _now();
      saveDoctor(db, d);
    } catch {}
  };
  run().catch(() => {}); // langsung cek sekali pas start
  const ms = parseInt(process.env.DOCTOR_CHECK_MS || String(CHECK_DEFAULT_MS), 10);
  monitorTimer = setInterval(run, Math.max(60000, ms));
  return true;
}
