// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// nova-ocode-agent.js — OPENCODE 9ROUTER: AI CODING AGENT DI DALAM BOT
// (request owner 21 Sep 2026 — "asisten coding bsa coding bot kode js
// kayak asisten edit fix fitur atau ganti fitur cm dr perintah chat",
// versi 9router dari guide integrasi OpenCode)
//
// Konsep sama kayak guide OpenCode (agent baca file → analisa → edit →
// lapor) TAPI TANPA install OpenCode CLI + key Groq/GLM terpisah:
// otak = 9router (satu pintu router9v2 — cloudku ATAU lokal :20128),
// loop agent-nya native di sini. Jadi gak ada dependency baru sama sekali.
//
// Protokol: model balas dengan blok ```ocode {json}``` (SATU aksi per
// blok) — lebih tahan banting ketimbang tool-calling OpenAI (model
// gateway 9router campur aduk, tool_calls gak selalu konsisten).
// Aksi: list / read / search / write / edit / done.
// Shell TIDAK ADA (mode aman — padan "bash":"deny" di guide OpenCode).
//
// KEAMANAN (padan sanksi keamanan guide):
// - path jail: semua aksi dikunci di dalam repoRoot (dilarang ../ keluar)
// - blacklist: .env*, apikey (apikeys.json), storage/, .git/, node_modules/,
//   auth_info*, session* — TIDAK BOLEH dibaca/ditulis agent
// - backup otomatis tiap write/edit → storage/ocode/backups/<ts>/
// - satu tugas sekaligus (lock), timeout total, max iterasi
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { router9v2Chat, ROUTER9V2_DEFAULT_MODEL } from "../scraper/router9v2.js";

// ── state global (lock 1 tugas + abort) ──
const state = { running: false, abort: false, task: "", startedAt: 0 };

// ── config internal ──
const MAX_ITERATIONS = 14;        // batas loop agent
const TIMEOUT_MS = 8 * 60 * 1000; // 8 menit per tugas (padan guide)
const MAX_READ_CHARS = 60000;     // potongan per aksi read (biar context gak meledak)
const MAX_READ_LINES = 400;
const MAX_WRITE_CHARS = 500000;
const MAX_SEARCH_RESULTS = 30;

// folder/file yang DILARANG disentuh agent (rahasia + sistem)
const FORBIDDEN = [
  /^\.env/i,
  /(^|[\\/])\.git([\\/]|$)/i,
  /(^|[\\/])node_modules([\\/]|$)/i,
  /(^|[\\/])storage([\\/]|$)/i,
  /apikey/i,
  /apikeys\.json$/i,
  /auth_info/i,
  /(^|[\\/])session/i,
];

// ── seams buat e2e ──
const __oc = { chat: null, root: null, backupDir: null, mcpCall: null, mcpTools: null };
export function _setOcodeChatForTest(fn) { __oc.chat = fn; }
export function _setOcodePathsForTest({ root, backupDir }) { __oc.root = root; __oc.backupDir = backupDir; }
export function _setOcodeMcpForTest({ call, tools } = {}) { __oc.mcpCall = call || null; __oc.mcpTools = tools || null; }
export function _resetOcodeForTest() { for (const k of Object.keys(__oc)) delete __oc[k]; state.running = false; state.abort = false; }

// ── MCP (request owner 25 Sep 2026: "mcp di github bsa diakses ai agent dan
// ── opencode") — server MCP terpasang via .mcp kebaca ocode juga. Lazy
// ── import biar modul tetap ringan & e2e tanpa database gak kena.
async function defaultMcpCall(server, tool, args) {
  const { mcpCallTool } = await import("./nova-mcp.js");
  return mcpCallTool(server, tool, args);
}
async function defaultMcpTools() {
  try {
    const { getMcpTools } = await import("./nova-mcp.js");
    return await getMcpTools();
  } catch { return []; } // db belum init / server mati gak boleh matiin agent
}
const MAX_MCP_OUT_CHARS = 12000; // hasil tool MCP dipotong biar context gak meledak
export function _ocodeState() { return { ...state }; }

// ── util ──
function resolveIn(root, rel) {
  const clean = String(rel || "").replace(/^["']|["']$/g, "").trim();
  const normRoot = path.resolve(root);
  const abs = path.resolve(normRoot, clean);
  if (abs !== normRoot && !abs.startsWith(normRoot + path.sep)) {
    return { blocked: "di luar repo (path jail)" };
  }
  // GOTCHA (ketangkep e2e): blacklist WAJIB diuji terhadap path RELATIF dari
  // root — regex ^\.env gak pernah cocok di path absolut (/tmp/xxx/.env),
  // sempat bocor 1 hari sebelum fix ini.
  const relFromRoot = path.relative(normRoot, abs);
  for (const re of FORBIDDEN) if (re.test(relFromRoot)) return { blocked: "dilarang (rahasia/sistem)" };
  return { abs };
}

function backDir(root) {
  const d = __oc.backupDir || path.join(root, "storage", "ocode", "backups");
  fs.mkdirSync(d, { recursive: true });
  return d;
}

// backup file sebelum ditulis/diedit
function backupFile(root, abs) {
  const rel = path.relative(path.resolve(root), abs);
  const ts = state.startedAt || Date.now();
  const dest = path.join(backDir(root), String(ts), rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(abs)) fs.copyFileSync(abs, dest);
  return dest;
}

// restore backup TERBARU → daftar file yang di-restore
export function undoLast(root) {
  const base = __oc.backupDir || path.join(root, "storage", "ocode", "backups");
  if (!fs.existsSync(base)) return { ok: false, error: "belum ada backup" };
  const dirs = fs.readdirSync(base).filter((d) => fs.statSync(path.join(base, d)).isDirectory())
    .map((d) => ({ d, n: Number(d) || 0 })).sort((a, b) => b.n - a.n);
  if (!dirs.length) return { ok: false, error: "belum ada backup" };
  const src = path.join(base, dirs[0].d);
  const restored = [];
  const walk = (dir) => {
    for (const f of fs.readdirSync(dir)) {
      const fp = path.join(dir, f);
      if (fs.statSync(fp).isDirectory()) { walk(fp); continue; }
      const rel = path.relative(src, fp);
      const dest = path.join(path.resolve(root), rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(fp, dest);
      restored.push(rel);
    }
  };
  walk(src);
  return { ok: true, restored, from: dirs[0].d };
}

// daftar backup tersedia (buat .ocode info)
export function listBackups(root) {
  const base = __oc.backupDir || path.join(root, "storage", "ocode", "backups");
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base).filter((d) => fs.statSync(path.join(base, d)).isDirectory())
    .map((d) => ({ d, n: Number(d) || 0 })).sort((a, b) => b.n - a.n).slice(0, 10).map((x) => x.d);
}

// cek path tanpa eksekusi — buat gate izin (cuma tanya kalau path lolos jail+blacklist)
export function ocodePathCheck(root, rel) {
  const p = resolveIn(root, rel);
  return p.blocked ? { blocked: p.blocked } : { ok: true };
}

// ── eksekusi satu aksi → string hasil untuk model ──
// async: aksi mcp panggil server eksternal (tool MCP dari .mcp).
async function execAction(root, a) {
  const act = String(a.action || "").toLowerCase();
  if (act === "done") return null; // sinyal selesai (ditangani caller)
  if (act === "list") {
    const p = resolveIn(root, a.path || ".");
    if (p.blocked) return "ERROR: " + p.blocked;
    if (!fs.existsSync(p.abs)) return "ERROR: folder gak ada: " + a.path;
    if (!fs.statSync(p.abs).isDirectory()) return "ERROR: bukan folder: " + a.path;
    const items = fs.readdirSync(p.abs).slice(0, 120)
      .map((f) => (fs.statSync(path.join(p.abs, f)).isDirectory() ? f + "/" : f));
    return "ISI " + (a.path || ".") + " (" + items.length + "):\n" + items.join("\n");
  }
  if (act === "read") {
    const p = resolveIn(root, a.path);
    if (p.blocked) return "ERROR: " + p.blocked;
    if (!fs.existsSync(p.abs)) return "ERROR: file gak ada: " + a.path;
    const raw = fs.readFileSync(p.abs, "utf8");
    const lines = raw.split("\n");
    const start = Math.max(1, Number(a.start) || 1);
    const end = Math.min(lines.length, start - 1 + MAX_READ_LINES, Number(a.end) || lines.length);
    let out = lines.slice(start - 1, end).join("\n");
    if (out.length > MAX_READ_CHARS) out = out.slice(0, MAX_READ_CHARS) + "\n…(dipotong — lanjut baca bagian berikut)";
    return "FILE " + a.path + " (baris " + start + "-" + end + " dari " + lines.length + "):\n" + out;
  }
  if (act === "search") {
    const from = resolveIn(root, a.path || ".");
    if (from.blocked) return "ERROR: " + from.blocked;
    if (!fs.existsSync(from.abs)) return "ERROR: path gak ada: " + a.path;
    let re;
    try { re = new RegExp(a.pattern || "", "i"); } catch { return "ERROR: regex gak valid"; }
    const hits = [];
    const walk = (dir) => {
      if (hits.length >= MAX_SEARCH_RESULTS) return;
      for (const f of fs.readdirSync(dir)) {
        if (hits.length >= MAX_SEARCH_RESULTS) return;
        const fp = path.join(dir, f);
        if (FORBIDDEN.some((x) => x.test(fp))) continue;
        let st; try { st = fs.statSync(fp); } catch { continue; }
        if (st.isDirectory()) { walk(fp); continue; }
        if (!/\.(js|mjs|cjs|json|md|txt|sh|yml|yaml)$/i.test(f)) continue;
        const txt = fs.readFileSync(fp, "utf8");
        const ls = txt.split("\n");
        for (let i = 0; i < ls.length && hits.length < MAX_SEARCH_RESULTS; i++) {
          if (re.test(ls[i])) hits.push(path.relative(path.resolve(root), fp) + ":" + (i + 1) + ": " + ls[i].trim().slice(0, 160));
        }
      }
    };
    walk(from.abs);
    return hits.length ? "HASIL CARI (max " + MAX_SEARCH_RESULTS + "):\n" + hits.join("\n") : "HASIL CARI: gak ketemu";
  }
  if (act === "write" || act === "edit") {
    const p = resolveIn(root, a.path);
    if (p.blocked) return "ERROR: " + p.blocked;
    let content;
    if (act === "write") {
      content = String(a.content ?? "");
      if (content.length > MAX_WRITE_CHARS) return "ERROR: file kegedean (>500KB)";
    } else {
      if (!fs.existsSync(p.abs)) return "ERROR: file gak ada: " + a.path;
      const cur = fs.readFileSync(p.abs, "utf8");
      const find = String(a.find ?? "");
      if (!find) return "ERROR: field find kosong";
      if (!cur.includes(find)) return "ERROR: teks find gak ketemu di file (cek ulang pakai read)";
      content = cur.replace(find, String(a.replace ?? ""));
    }
    backupFile(root, p.abs);
    fs.mkdirSync(path.dirname(p.abs), { recursive: true });
    fs.writeFileSync(p.abs, content, "utf8");
    return "OK: " + a.path + " ditulis (" + content.split("\n").length + " baris) — backup otomatis dibuat";
  }
  if (act === "mcp") {
    const server = String(a.server || "").toLowerCase();
    const tool = String(a.tool || "");
    if (!server || !tool) return "ERROR: aksi mcp butuh field server & tool (lihat daftar TOOL MCP di prompt)";
    const call = __oc.mcpCall || defaultMcpCall;
    try {
      const out = await call(server, tool, a.args && typeof a.args === "object" ? a.args : {});
      return "MCP " + server + "." + tool + " OK:\n" + String(out).slice(0, MAX_MCP_OUT_CHARS);
    } catch (e) {
      return "ERROR: MCP " + server + "." + tool + " gagal: " + (e?.message || e);
    }
  }
  if (act === "run" || act === "bash" || act === "shell") {
    return "ERROR: shell DIMATIKAN (mode aman). Aksi yang ada: list, read, search, mcp, write, edit, done.";
  }
  return "ERROR: aksi gak dikenal: " + act + " (yang ada: list, read, search, mcp, write, edit, done)";
}

// ── parse blok ```ocode {json}``` dari jawaban model ──
function parseActions(text) {
  const out = [];
  const re = /```(?:ocode)?\s*\n?(\s*\{[\s\S]*?\})\s*\n?```/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    try { out.push(JSON.parse(m[1])); } catch { /* blok rusak → skip */ }
  }
  // fallback: object JSON telanjang satu-satunya di jawaban
  if (!out.length) {
    const bare = text.trim().match(/^\s*(\{[\s\S]*\})\s*$/);
    if (bare) { try { out.push(JSON.parse(bare[1])); } catch { /* bukan JSON */ } }
  }
  return out;
}

const SYSTEM_PROMPT = `Kamu adalah agent coding yang bekerja langsung di repo server bot WhatsApp NOVA (Node.js, ESM).
Balas HANYA dengan satu atau lebih blok aksi berikut — JSON murni dalam fence \`\`\`ocode, TANPA teks lain:

\`\`\`ocode
{"action":"list","path":"plugins/ai"}
\`\`\`
→ daftar isi folder.

\`\`\`ocode
{"action":"read","path":"plugins/ai/ai9v2.js","start":1,"end":200}
\`\`\`
→ baca file (maks 400 baris per kali — file panjang dibaca bertahap).

\`\`\`ocode
{"action":"search","pattern":"namaFungsi|teks yang dicari","path":"src","glob":"*.js"}
\`\`\`
→ cari kode di semua file (regex, max 30 hasil).

\`\`\`ocode
{"action":"edit","path":"src/lib/xxx.js","find":"kode lama PERSIS","replace":"kode baru"}
\`\`\`
→ ganti teks PERTAMA yang cocok. WAJIB baca file dulu, find harus persis baris yang ada (termasuk indentasi).

\`\`\`ocode
{"action":"write","path":"plugins/baru/fitur.js","content":"isi file penuh"}
\`\`\`
→ tulis ulang/buat file penuh (semua newline ditulis \\n dalam string JSON).

\`\`\`ocode
{"action":"mcp","server":"context7","tool":"resolve-library-id","args":{"libraryName":"react"}}
\`\`\`
→ panggil tool MCP eksternal (baca docs, data GitHub, memory, dll — daftar tool MCP yang TERPASANG ada di bagian paling bawah prompt; kalau kosong = tidak ada server MCP, jangan pake aksi ini).

\`\`\`ocode
{"action":"done","summary":"ringkas perubahan & cara pakai (bahasa Indonesia)","files":["yang diubah/dibuat"]}
\`\`\`
→ TUGAS SELESAI (WAJIB diakhiri ini).

ATURAN:
- Setelah tiap aksi kamu menerima hasilnya sebagai balasan user. Kerjakan BERTAHAP: cari → baca → edit → verifikasi ulang → done.
- Shell TIDAK ADA. Kamu TIDAK bisa install dependency — hanya edit file yang ada / buat file baru dari dependency yang sudah terpasang.
- Tool MCP eksternal (aksi mcp) BOLEH dipakai buat baca dokumentasi/data eksternal — hasilnya cuma konteks, TIDAK mengubah file server.
- Area DILARANG (otomatis diblokir): .env, apikey/apikeys.json, storage/, .git/, node_modules/ — jangan buang aksi kesana.
- Utamakan edit presisi (aksi edit) ketimbang write penuh. Jaga gaya kode file yang sedang diedit.
- Setelah done, tulis ringkasan perubahan + file yang disentuh + apakah perlu pm2 restart.`;

// system prompt + daftar tool MCP terpasang (dinamis per tugas)
function buildSystemPrompt(mcpTools) {
  let p = SYSTEM_PROMPT;
  if (mcpTools && mcpTools.length) {
    const lines = mcpTools.slice(0, 60).map((t) => `- mcp.${t.server}.${t.tool} — ${(t.desc || "").slice(0, 120)}`);
    p += "\n\nTOOL MCP TERPASANG (aksi mcp, field server/tool HARUS persis):\n" + lines.join("\n")
      + (mcpTools.length > 60 ? `\n(…+${mcpTools.length - 60} tool lagi — .mcp tools <nama> di chat owner)` : "");
  }
  return p;
}

/**
 * Jalankan tugas coding agent.
 * @param {object} o
 * @param {string} o.task — instruksi dari owner
 * @param {string} [o.model] — model 9router (default ROUTER9V2_DEFAULT_MODEL)
 * @param {string} [o.repoRoot] — root repo (default cwd)
 * @param {(ev:{type:string,text:string})=>void} [o.onEvent] — progress (phase)
 * @param {(o:{path:string,action:string,task:string,detail:object})=>Promise<{allowed:boolean,reason?:string}|null>} [o.onApproval]
 *        — GATE IZIN PER FILE (request owner 21 Sep 2026: "ada allow deny tiap
 *          dia eksekusi 1 file kyk ai agent pd umumnya"). Dipanggil SEBELUM
 *          tiap write/edit; keputusan di-cache per file per tugas (tanya 1x).
 * @returns {Promise<{summary:string,files:string[],changed:string[],denied:string[],iterations:number,aborted:boolean,error?:string}>}
 */
export async function runOcodeAgent({ task, model, repoRoot, onEvent, onApproval }) {
  if (state.running) return { error: "masih ada tugas berjalan" };
  state.running = true; state.abort = false; state.task = task; state.startedAt = Date.now();
  const root = __oc.root || path.resolve(repoRoot || process.cwd());
  const chat = __oc.chat || ((o) => router9v2Chat(o));
  const mcpToolList = __oc.mcpTools !== null ? __oc.mcpTools : await defaultMcpTools();
  const messages = [
    { role: "system", content: buildSystemPrompt(mcpToolList) },
    { role: "user", content: "Tugas: " + task + "\n\nKerjakan sekarang, mulai dari aksi pertama." },
  ];
  const changed = [];
  const denied = [];           // file yang DITOLAK owner
  const decisions = new Map();  // izin per file per tugas (rel → boolean)
  let summary = "", files = [], iterations = 0, aborted = false, error = "";
  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      if (state.abort) { aborted = true; break; }
      if (Date.now() - state.startedAt > TIMEOUT_MS) { error = "timeout 8 menit"; break; }
      iterations++;
      let resp;
      try {
        resp = await chat({ messages, model: model || ROUTER9V2_DEFAULT_MODEL, maxTokens: 4096, temperature: 0.2 });
      } catch (e) {
        error = "gagal panggil 9router: " + (e?.message || e);
        break;
      }
      const text = resp?.text || "";
      const actions = parseActions(text);
      if (!actions.length) {
        // model jawab teks polos (gak pake protokol) → anggap ringkasan akhir
        summary = text.slice(0, 3000);
        break;
      }
      if (actions.length === 1 && actions[0].action === "done") {
        summary = String(actions[0].summary || "(tanpa ringkasan)");
        files = (actions[0].files || []).map(String);
        break;
      }
      // eksekusi aksi satu-satu, kumpulkan hasil
      const results = [];
      let doneHere = false;
      for (const a of actions) {
        if (state.abort) { aborted = true; break; }
        if (a.action === "done") { doneHere = true; summary = String(a.summary || ""); files = (a.files || []).map(String); break; }
        const rel = a.path ? String(a.path) : (a.action === "mcp" ? `mcp ${a.server}.${a.tool}` : "");
        // ── GATE IZIN PER FILE (allow/deny ala AI agent umum) ──
        // tanya owner SEBELUM nulis; 1x per file per tugas; tanpa callback →
        // auto-izin (backward-compat pemanggil lama / non-ownerless flow)
        if (a.action === "write" || a.action === "edit") {
          const chk = ocodePathCheck(root, rel);
          if (!chk.blocked) {
            if (!decisions.has(rel)) {
              let ap = { allowed: true };
              if (onApproval) {
                try {
                  ap = (await onApproval({ path: rel, action: a.action, task, detail: a })) || { allowed: true };
                } catch (e) {
                  ap = { allowed: false, reason: "approval error: " + (e?.message || e) };
                }
              }
              decisions.set(rel, !!ap?.allowed);
            }
            if (!decisions.get(rel)) {
              results.push("\u2192 " + rel + "\nDITOLAK oleh owner \u2014 file TIDAK diubah. Jangan tulis file ini lagi dalam tugas ini; lanjutkan tanpa file ini atau akhiri dengan done.");
              denied.push(rel);
              continue;
            }
          }
        }
        const r = await execAction(root, a);
        results.push("→ " + rel + "\n" + r);
        if ((a.action === "write" || a.action === "edit") && !/^ERROR/.test(r) && !changed.includes(rel)) changed.push(rel);
        if (onEvent) onEvent({ type: "phase", text: (a.action === "write" || a.action === "edit" ? "\u270f\ufe0f " : "\U0001f4d6 ") + rel });
      }
      if (aborted) break;
      if (doneHere) break;
      messages.push({ role: "assistant", content: text });
      messages.push({ role: "user", content: "HASIL AKSI:\n" + results.join("\n\n") + "\n\nLanjutkan — kalau tugas sudah tuntas, akhiri dengan aksi done." });
    }
    if (!summary && !error && !aborted) error = "iterasi habis tanpa done — coba tugas yang lebih spesifik";
  } finally {
    state.running = false; state.abort = false;
  }
  return { summary, files: files.length ? files : changed, changed, denied, iterations, aborted, error: error || undefined };
}

/** abort tugas yang sedang jalan (.ocode stop) */
export function stopOcode() {
  if (!state.running) return { ok: false, error: "gak ada tugas berjalan" };
  state.abort = true;
  return { ok: true };
}
