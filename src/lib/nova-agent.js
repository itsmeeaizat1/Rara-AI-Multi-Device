// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-agent.js — AI AGENT OTONOM MULTI-LANGKAH (request owner 11 Sep 2026:
// "buatkan no 1" — ide fitur paling canggih + revisi "biar ai agentnya bisa
// browsing dan automation kayak kick org cm dari nama, tutup grup dll").
//
// TIGA MODE — dipilih AI saat fase PLAN (serba bisa):
// TIGA MODE — dipilih AI saat fase PLAN (request owner 11 Sep 2026: "hrs serba
// bisa agar berbeda dr bot lain bsa apa aja perintahkan fitur, cmd, buat fitur,
// pasang fitur, scan gambar, generate gambar, nggobrol pakai vn, inget jejak
// histori aktivitas, ingat percakapan sblmnya"):
//  • mode "research" — browsing/riset web: plan → search → pick → read → compose
//  • mode "act"      — otomasi WhatsApp grup (kick dari NAMA, tutup grup, dll):
//                      plan → act (eksekusi via callback plugin) → laporan.
//    Executor + gate admin ada di plugin (agent.js) — lib cuma orkestrasi,
//    biar tetap gampang di-e2e (seam `act`).
//
// Alur research 5 fase:
//   1. PLAN    — AI bikin rencana: pecah tugas jadi query pencarian (max 3)
//   2. SEARCH  — jalankan tiap query lewat nova-websearch (bing + fallback chain)
//   3. PICK    — AI milih halaman paling relevan dari pool hasil (max 3)
//   4. READ    — buka halaman terpilih, ekstrak isi plain text (cap 3500 char/halaman)
//   5. COMPOSE — AI susun jawaban akhir dari BUKTI nyata + cantumin sumber
//
// AI dipanggil lewat aiChainChat (rantai internal — fitur internal boleh,
// beda sama command satuan yang strict per owner). Semua langkah punya
// fallback degradasi: plan gagal → tugas jadi query; pick gagal → 3 teratas;
// read gagal → pakai snippet pool; compose gagal → digest lokal (tetep ada
// jawaban + sumber, gak perlu batal total).
//
// Seams buat e2e: setAgentDeps({ aiChat, search, preview }).

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import { aiChainChat } from "./nova-ai-fallback.js";
import { searchWeb, fetchPagePreview } from "./nova-websearch.js";

const __libFilename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__libFilename), "..", "..");

const MAX_QUERIES = 3;
const MAX_PICKS = 3;
const POOL_OFFER = 12;
const PAGE_TEXT_CAP = 3500;

let _aiChat = aiChainChat;
let _search = searchWeb;
let _preview = fetchPagePreview;

export function setAgentDeps({ aiChat, search, preview } = {}) {
  if (aiChat) _aiChat = aiChat;
  if (search) _search = search;
  if (preview) _preview = preview;
}
export function resetAgentDeps() {
  _aiChat = aiChainChat;
  _search = searchWeb;
  _preview = fetchPagePreview;
}

// ── util ──
function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return String(url); }
}

// JSON extractor lokal — tahan code fence / kalimat pembuka (pola autonovaai)
function parseJsonLocal(raw) {
  if (!raw) return null;
  let s = String(raw).replace(/```json|```/gi, "").trim();
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a === -1 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

const MAX_ACTS = 3;
const ACT_ACTIONS = [
  "kick", "add", "promote", "demote", "open", "close", "lockedit", "unlockedit",
  "rename", "desc", "tagall", "link",
];
const MAX_TOOLS = 4;
const TOOL_LIST = [
  "command", // jalanin command bot lain (sticker, quotes, dll)
  "image",   // generate gambar (callImageGen)
  "vision",  // scan gambar yang di-reply/attach (visionScan)
  "activity",// statistik aktivitas grup (activity tracker)
  "memory",  // ingat percakapan agent sebelumnya
  "create",  // BUAT FITUR BARU + pasang (owner only — codegen + hot-load)
];

const SYS_PLAN = `Kamu adalah perencana aksi AI agent. Balas HANYA objek JSON murni tanpa kalimat pembuka/penjelas/markdown. Karakter PERTAMA harus { dan TERAKHIR }.

Pilih SALAH SATU mode:

1. Riset/browsing web (tugas butuh mencari/menganalisis informasi: perbandingan, berita, resep, harga, tutorial, dll):
{"mode": "research", "queries": ["query 1", "query 2", "angle": "sudut pandang singkat"}
Maksimal ${MAX_QUERIES} query — pendek, spesifik, kata kunci ala google (bukan kalimat tanya), bahasa ikut tugas user.

2. AKSI WhatsApp grup (tugas meminta otomasi grup: kick member, tutup grup, ubah nama grup, dll):
{"mode": "act", "actions": [{"action": "kick", "target": "nama persis yang ditulis user", "value": null}]}
Action valid: kick (keluarkan member), add (tambah member), promote (jadikan admin), demote (turunkan admin), open (buka grup — semua member bisa chat), close (tutup grup — cuma admin bisa chat), lockedit (kunci edit info grup), unlockedit (buka edit info grup), rename (ubah nama grup, value = nama baru), desc (ubah deskripsi grup, value = deskripsi baru), tagall (tag semua member), link (ambil link invite grup).
Maksimal ${MAX_ACTS} action. Target = nama orang persis seperti ditulis user (atau nomor 62xxx kalau user kasih nomor); action yang gak butuh target isi null. Rename/desc isi value.

3. TOOLS serba bisa (tugas minta AI ngerjain pakai kemampuan bot: bikin gambar, scan gambar, jalanin fitur/command bot, cek aktivitas grup, inget percakapan, bikin fitur baru):
{"mode": "tools", "tools": [{"tool": "command", "cmd": "sticker", "args": "kucing"}, {"tool": "image", "prompt": "kucing astronot di bulan"}, {"tool": "vision", "question": "apa yang ada di gambar ini?"}, {"tool": "activity", "query": "siapa paling aktif"}, {"tool": "memory", "query": "tadi nanya apa"}, {"tool": "create", "name": "namafitur", "spec": "deskripsi lengkap fitur baru yang diminta user"}], "voice": false}
Tool valid: command (jalanin command bot lain, cmd TANPA titik + args), image (generate gambar dari prompt), vision (analisis gambar yang user reply/attach), activity (statistik aktivitas grup), memory (ingat riwayat percakapan agent di chat), create (BUAT FITUR BARU + pasang otomatis — hanya owner). Maksimal ${MAX_TOOLS} tool. "voice": true kalau user minta dijawab pakai voice note (vn/suara).
Kalau ragu ATAU tugasnya nyari informasi → pilih research.`;

const SYS_PICK = `Kamu adalah kurator riset. Balas HANYA objek JSON murni. Karakter PERTAMA harus { dan TERAKHIR }.
Format: {"picks": [nomor1, nomor2, nomor3]}
Aturan: pilih ${MAX_PICKS} halaman paling relevan & berbobot buat tugas user (hindari halaman login/agregator kosong), nomor sesuai daftar kandidat.`;

const SYS_ANSWER = `Kamu adalah analis riset. Jawab tugas user berdasarkan BUKTI dari halaman web yang diberikan (ditandai [S1], [S2], dst).
Aturan jawaban: bahasa yang sama dengan tugas user (default Indonesia), terstruktur dan padat (poin/heading boleh), sebut sumber dengan [S1]/[S2] di kalimat yang pakai info itu, jangan mengarang data yang gak ada di bukti, jangan pakai markdown table, akhiri tanpa sapaan basa-basi.`;

// deteksi aksi lokal — fallback kalau LLM plan down (biar "tutup grup" dll
// tetep jalan tanpa AI) — heuristik kata kunci Indonesia
function detectActLocal(task) {
  const raw = String(task);
  const s = raw.toLowerCase();
  const acts = [];
  const targetAfter = (re) => {
    // match di teks ASLI biar kapitalisasi nama kejaga, flag case-insensitive
    const m = raw.match(new RegExp(re.source, "i"));
    return m ? m[1].replace(/\b(yang|itu|dong|ya|pls|please|nih|dari grup|keluar)\b/gi, "").trim() : null;
  };
  if (/\b(kick|keluarkan|keluarin|buang|usir|tendang|kicking)\b/.test(s))
    acts.push({ action: "kick", target: targetAfter(/\b(?:kick|keluarkan|keluarin|buang|usir|tendang|kicking)\s+(?:orang\s+)?(?:yang\s+)?(?:bernama\s+)?([a-z0-9 @_]{2,40})/) });
  if (/\b(promote|promotein|jadikan admin|jadiin admin)\b/.test(s)) acts.push({ action: "promote", target: targetAfter(/(?:promote|jadikan admin|jadiin admin)\s+(?:orang\s+)?(?:yang\s+)?(?:bernama\s+)?([a-z0-9 @_]{2,40})/) });
  if (/\b(demote|demotein|turunkan admin|lepas admin)\b/.test(s)) acts.push({ action: "demote", target: targetAfter(/(?:demote|turunkan admin|lepas admin)\s+(?:orang\s+)?(?:yang\s+)?(?:bernama\s+)?([a-z0-9 @_]{2,40})/) });
  if (/\btutup\s+(?:grup|group|gc)\b/.test(s)) acts.push({ action: "close" });
  if (/\bbuka\s+(?:grup|group|gc)\b/.test(s) && !/link|tautan/.test(s)) acts.push({ action: "open" });
  if (/\b(kunci|lock)\s+(?:edit|info)\b/.test(s)) acts.push({ action: "lockedit" });
  if (/\b(buka kunci|unlock)\s+(?:edit|info)\b/.test(s)) acts.push({ action: "unlockedit" });
  if (/\b(ubah|ganti|rename)\s+nama\s+(?:grup|group)/.test(s))
    acts.push({ action: "rename", value: (s.match(/(?:jadi|menjadi|:|-)\s*(.+)$/) || [])[1] || null });
  if (/\b(ubah|ganti)\s+(?:deskripsi|desc)\s+(?:grup|group)/.test(s))
    acts.push({ action: "desc", value: (s.match(/(?:jadi|menjadi|:|-)\s*(.+)$/) || [])[1] || null });
  if (/\btag\s?all|tag\s+semua\b/.test(s)) acts.push({ action: "tagall" });
  if (/\blink\s+(?:grup|group|invite)|\binvite\b/.test(s)) acts.push({ action: "link" });
  return acts.map(a => ({ action: a.action, target: a.target || null, value: a.value || null })).slice(0, MAX_ACTS);
}

/**
 * runAgent — jalankan tugas kompleks multi-langkah.
 * @param {string} task tugas user, mis. "cari hp terbaik di bawah 5 juta, bandingkan, kasih rekomendasi"
 * @param {Object} [opts]
 * @param {(phase:string, info:string) => void} [opts.onPhase] progress callback:
 *        "plan" | "act" (info=action) | "search" (info=query) | "pick" | "read" (info=domain) | "compose"
 * @param {(action:{action,target,value}, ctx:any) => Promise<{ok:boolean,msg:string}>} [opts.act]
 *        executor aksi grup — wajib buat mode act (gate admin + resolve nama ada di plugin)
 * @param {Object.<string, Function>} [opts.execTools] executor per-tool mode tools
 *        ({tool, ...payload}, ctx) => {ok, msg, evidence?} — implementasi di plugin
 * @param {string[]} [opts.history] riwayat percakapan agent di chat ini (biar ingat konteks)
 * @param {Object} [opts.context] info grup (isGroup/isAdmin/isOwner/isBotAdmin/chat/sender) — dikirim ke LLM plan + executor
 * @returns {Promise<{mode,answer,queries,sources,steps,results,viaLocal,voice}|{error}>}
 */
export async function runAgent(task, { onPhase, act, execTools, history, context } = {}) {
  const phase = (p, info) => { try { onPhase?.(p, info); } catch {} };
  const steps = [];

  // ── FASE 1: PLAN — AI milih mode (research/act) + susun rencana ──
  phase("plan");
  let plan = null;
  const ctxLine = context
    ? `\nKonteks: ${context.isGroup === false ? "chat pribadi (BUKAN grup)" : "di grup"}${context.isAdmin ? ", user admin grup" : context.isOwner ? ", user owner bot" : ", user bukan admin"}${context.isBotAdmin ? ", bot admin grup" : ", bot bukan admin grup"}${context.mediaAttached ? ", user reply/attach gambar (bisa dipakai tool vision)" : ""}.`
    : "";
  const histLine = Array.isArray(history) && history.length
    ? `\nRiwayat percakapan agent di chat ini (ingat konteks ini):\n${history.slice(-5).join("\n")}`
    : "";
  try {
    plan = parseJsonLocal(await _aiChat(`Tugas user: ${task}${ctxLine}${histLine}`, { systemPrompt: SYS_PLAN }));
  } catch {}

  // normalisasi rencana act (dari LLM atau deteksi lokal)
  let actions = null;
  if (Array.isArray(plan?.actions) && plan.actions.length) {
    actions = plan.actions
      .map(a => ({ action: String(a?.action || "").toLowerCase().trim(), target: a?.target ? String(a.target).trim() : null, value: a?.value ? String(a.value).trim() : null }))
      .filter(a => ACT_ACTIONS.includes(a.action))
      .slice(0, MAX_ACTS);
  }

  // fallback: LLM plan gagal → deteksi lokal; LLM jawab act tapi gak ada action valid → deteksi lokal juga
  if (!actions || !actions.length) {
    if (plan?.mode !== "research") {
      const local = detectActLocal(task);
      if (local.length && typeof act === "function") actions = local;
    }
  }

  // ── MODE TOOLS — serba bisa: command bot, gambar, vision, aktivitas, memory, buat fitur ──
  if (Array.isArray(plan?.tools) && plan.tools.length && execTools && Object.keys(execTools).length) {
    const tools = plan.tools
      .map(x => {
        const tool = String(x?.tool || "").toLowerCase().trim();
        return {
          tool,
          cmd: x?.cmd ? String(x.cmd).replace(/^[.\/#!]/, "").toLowerCase() : null,
          args: x?.args != null ? String(x.args) : null,
          prompt: x?.prompt != null ? String(x.prompt) : null,
          question: x?.question != null ? String(x.question) : null,
          query: x?.query != null ? String(x.query) : null,
          name: x?.name ? String(x.name).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) : null,
          spec: x?.spec != null ? String(x.spec) : null,
        };
      })
      .filter(x => TOOL_LIST.includes(x.tool) && execTools[x.tool])
      .slice(0, MAX_TOOLS);
    if (tools.length) {
      steps.push({ phase: "plan", mode: "tools", ok: true, tools: tools.map(x => x.tool) });
      const results = [];
      const evidences = [];
      for (const tl of tools) {
        phase("tool", tl.tool + (tl.prompt ? ": " + tl.prompt.slice(0, 40) : tl.cmd ? ": ." + tl.cmd : ""));
        let r = null;
        try { r = await execTools[tl.tool](tl, context || {}); } catch (e) { r = { ok: false, msg: `Gagal: ${e?.message || "error eksekusi"}` }; }
        const row = { tool: tl.tool, ok: !!r?.ok, msg: String(r?.msg || (r?.ok ? "Berhasil" : "Gagal")) };
        results.push(row);
        if (r?.evidence) evidences.push(String(r.evidence));
      }
      steps.push({ phase: "tools", ok: results.some(r => r.ok), jumlah: results.length });

      // evidence (vision/activity/memory) → compose jawaban natural; selebihnya laporan per tool
      let answer = "";
      let viaLocal = false;
      if (evidences.length) {
        phase("compose");
        try {
          answer = await _aiChat(`Tugas user: ${task}\n\nBUKTI/HASIL TOOLS:\n${evidences.join("\n\n").slice(0, 12000)}`, { systemPrompt: SYS_ANSWER });
        } catch {}
        if (!answer || !String(answer).trim()) {
          viaLocal = true;
          answer = evidences.join("\n\n");
        }
      }
      const report = results.map(r => `${r.ok ? "✅" : "❌"} ${r.msg}`).join("\n");
      answer = (evidences.length ? String(answer).trim() : "") || report;
      if (evidences.length && report) answer += `\n\n${report}`;
      return { mode: "tools", answer, results, evidences: evidences.length, steps, voice: !!plan.voice, viaLocal, queries: [], sources: [] };
    }
  }

  // ── MODE ACT — otomasi grup (request owner: "kick org cm dari nama, tutup grup dll") ──
  if (actions && actions.length && typeof act === "function") {
    steps.push({ phase: "plan", mode: "act", ok: true, actions });
    const results = [];
    for (const a of actions) {
      phase("act", a.action + (a.target ? ": " + a.target : ""));
      let r = null;
      try { r = await act(a, context || {}); } catch (e) { r = { ok: false, msg: `Gagal: ${e?.message || "error eksekusi"}` }; }
      results.push({ action: a.action, target: a.target || null, ok: !!r?.ok, msg: String(r?.msg || (r?.ok ? "Berhasil" : "Gagal")) });
    }
    const answer = results.map(r => `${r.ok ? "✅" : "❌"} ${r.msg}`).join("\n");
    steps.push({ phase: "act", ok: results.some(r => r.ok), aksi: results.length });
    return { mode: "act", answer, results, steps, voice: !!plan?.voice, queries: [], sources: [] };
  }

  // ── MODE RESEARCH — browsing/riset web (alur 5 fase) ──
  const queries = (Array.isArray(plan?.queries) && plan.queries.length
    ? plan.queries.map(String).filter(q => q.trim())
    : [task]).slice(0, MAX_QUERIES);
  steps.push({ phase: "plan", mode: "research", ok: !!plan, queries });

  // ── FASE 2: SEARCH — kumpulkan pool hasil ──
  const pool = [];
  const seen = new Set();
  for (const q of queries) {
    phase("search", q);
    let r = null;
    try { r = await _search(q, { engine: "bing", limit: 8 }); } catch {}
    if (r?.items?.length) {
      for (const it of r.items) {
        const url = String(it?.url || "");
        if (!url || seen.has(url)) continue;
        seen.add(url);
        pool.push({
          title: String(it?.title || "").slice(0, 120),
          url,
          snippet: String(it?.snippet || "").slice(0, 200),
          domain: domainOf(url),
        });
      }
    }
  }
  steps.push({ phase: "search", ok: pool.length > 0, hasil: pool.length });
  if (!pool.length) {
    return { error: "hasil pencarian kosong — semua mesin search sibuk, coba lagi bentar" };
  }

  // ── FASE 3: PICK — AI milih halaman paling relevan ──
  phase("pick");
  const offer = pool.slice(0, POOL_OFFER);
  const listText = offer.map((p, i) => `${i + 1}. [${p.domain}] ${p.title} — ${p.snippet.slice(0, 120)}`).join("\n");
  let pick = null;
  try {
    pick = parseJsonLocal(await _aiChat(`Tugas user: ${task}\n\nKandidat halaman:\n${listText}`, { systemPrompt: SYS_PICK }));
  } catch {}
  let idxs = Array.isArray(pick?.picks) && pick.picks.length
    ? pick.picks.map(n => parseInt(n, 10) - 1).filter(i => Number.isInteger(i) && i >= 0 && i < offer.length)
    : [0, 1, 2];
  if (!idxs.length) idxs = [0];
  idxs = [...new Set(idxs)].slice(0, MAX_PICKS);
  steps.push({ phase: "pick", ok: !!pick, pilihan: idxs.map(i => offer[i].domain) });

  // ── FASE 4: READ — buka halaman terpilih ──
  const reads = [];
  for (const i of idxs) {
    const p = offer[i];
    phase("read", p.domain);
    let pv = null;
    try { pv = await _preview(p.url); } catch {}
    if (pv?.text) {
      reads.push({ ...p, text: String(pv.text).slice(0, PAGE_TEXT_CAP) });
    }
  }
  steps.push({ phase: "read", ok: reads.length > 0, halaman: reads.length });

  // ── FASE 5: COMPOSE — AI susun jawaban dari bukti ──
  phase("compose");
  // bukti: isi halaman yang kebaca; gak ada → snippet pool (bukti tipis tapi tetep dipakai)
  const evidence = (reads.length
    ? reads.map((p, n) => `[S${n + 1} | ${p.domain} | ${p.title}]\n${p.text}`).join("\n\n")
    : offer.map((p, n) => `[S${n + 1} | ${p.domain} | ${p.title}]\n${p.snippet}`).join("\n\n")).slice(0, 12000);
  const sources = (reads.length ? reads : offer.slice(0, MAX_PICKS)).map((p, n) => ({
    tag: `S${n + 1}`, domain: p.domain, url: p.url, title: p.title,
  }));

  let answer = "";
  let viaLocal = false;
  try {
    answer = await _aiChat(`Tugas user: ${task}\n\nBUKTI:\n${evidence}`, { systemPrompt: SYS_ANSWER });
  } catch {}
  if (!answer || !String(answer).trim()) {
    // fallback terakhir: digest lokal dari bukti (tetep informatif + sumber)
    viaLocal = true;
    answer = buildLocalDigest(task, reads.length ? reads : offer.slice(0, MAX_PICKS));
  }
  steps.push({ phase: "compose", ok: !viaLocal, viaLocal });

  return { mode: "research", answer: String(answer).trim(), queries, sources, steps, voice: !!plan?.voice, viaLocal };
}

// ═══════════════════════════════════════════════════════════════
// BUAT FITUR BARU — codegen plugin + pasang (request owner:
// "buat fitur, pasang fitur"). Dipanggil tool `create` (owner only).
// LLM nulis isi handler → dibungkus template plugin → node --check →
// disimpan ke plugins/custom/<name>.js (auto ke-scan loader sebagai
// kategori custom). Retry 1x kalau kode ditolak/syntax error.
// ═══════════════════════════════════════════════════════════════

const SYS_CODEGEN = `Kamu generator plugin bot WhatsApp (Node ESM). User mau fitur baru bernama command .{{NAME}}.
Balas HANYA isi fungsi handler (JavaScript murni, TANPA import/export/pluginConfig/markdown fence/komentar pembuka):
- isi body fungsi: async function handler(m, { sock }) { ... } — TULIS CUMA ISI DALAM KURUNG KURAWAL, tanpa "async function handler" dan tanpa kurung kurawal luar.
- m = pesan user: m.args (array kata setelah command), m.reply(teks), m.react("emoji"), m.prefix, m.pushName (nama user), m.chat (jid), m.sender (jid), m.isGroup, m.text.
- sock = koneksi WhatsApp: sock.sendMessage(jid, { text / image: {url} / audio: buffer ... }, { quoted: m }).
- DILARANG: fs, child_process, require, process.exit, eval, fetch ke API eksternal, operasi file/jaringan. Fitur harus self-contained (logika lokal: generator acak, kalkulasi, format pesan, interaksi user, menyimpan ke m.reply saja).
- Bahasa Indonesia untuk semua teks ke user. Pakai template literal/emoji sesuai tema.
- Awali dengan validasi input: if (!m.args.length) return m.reply("cara pakai ...").
Spesifikasi fitur user: "{{SPEC}}"`;

const CODE_BLOCKLIST = /child_process|require\(|process\.exit|eval\(|fs\.(write|unlink|rm|read)|\.writeFile|node-fetch|axios|import\s|export\s|__dirname/gi;

function wrapPluginCode(name, desc, body) {
  const d = new Date().toISOString().slice(0, 10);
  return `// NOVA AI WHATSAPP BOT — plugin dibuat otomatis oleh AI Agent (.agent create)
// Fitur: ${desc} | dibuat ${d}
// Template agent — self-contained, murni logika lokal, tanpa akses sistem.
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "${name}",
  alias: ["${name}"],
  category: "custom",
  description: ${JSON.stringify(desc.slice(0, 120))},
  usage: ".${name} <input>",
  example: ".${name}",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
${body}
}

export { pluginConfig as config, handler };
`;
}

/**
 * generatePlugin — bikin file plugin baru hasil codegen AI.
 * @param {{name:string, spec:string, targetDir?:string}} param
 * @returns {Promise<{path:string, code:string, attempts:number}>} throw kalau gagal 2x
 */
export async function generatePlugin({ name, spec, targetDir } = {}) {
  const nm = String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
  if (nm.length < 3) throw new Error("nama fitur minimal 3 huruf/angka");
  const sp = String(spec || "").trim();
  if (!sp) throw new Error("spesifikasi fitur kosong");
  const dir = targetDir || path.join(REPO_ROOT, "plugins", "custom");
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${nm}.js`);
  if (fs.existsSync(filePath)) throw new Error(`fitur .${nm} udah ada — hapus dulu atau pilih nama lain`);

  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    let body = "";
    try {
      const raw = await _aiChat(
        SYS_CODEGEN.replace(/\{\{NAME\}\}/g, nm).replace(/\{\{SPEC\}\}/g, sp.slice(0, 1000)),
        { systemPrompt: "Kamu code generator. Balas HANYA kode, tanpa penjelasan." },
      );
      body = String(raw || "")
        .replace(/```[a-z]*|```/gi, "")
        .replace(/^[\s\S]*?(?=\n|\S)/, (s) => s) // keep as-is
        .trim();
      // buang pembuka/penutup function kalau LLM tetap nulis
      body = body
        .replace(/^\s*(async\s+)?function\s+handler\s*\([^)]*\)\s*\{?/i, "")
        .replace(/\}\s*$/, "")
        .trim();
    } catch (e) {
      lastErr = `AI codegen gagal: ${e?.message || e}`;
      continue;
    }
    // blocklist keamanan — fitur hasil codegen gak boleh sentuh sistem
    if (CODE_BLOCKLIST.test(body)) {
      lastErr = "kode ngandung operasi terlarang (fs/jaringan/child_process)";
      continue;
    }
    const code = wrapPluginCode(nm, sp, body);
    try {
      // syntax check dulu SEBELUM nulis — file sementara di dir target
      const tmp = path.join(dir, `._chk_${nm}_${Date.now()}.js`);
      fs.writeFileSync(tmp, code);
      try {
        execFileSync("node", ["--check", tmp], { timeout: 15000 });
      } finally {
        try { fs.unlinkSync(tmp); } catch {}
      }
      fs.writeFileSync(filePath, code);
      return { path: filePath, code, attempts: attempt };
    } catch (e) {
      lastErr = `syntax error: ${String(e?.stderr || e?.message || e).slice(0, 200)}`;
    }
  }
  throw new Error(`gagal bikin fitur .${nm} — ${lastErr}`);
}

// digest lokal — dipakai kalau AI compose down: susun ringkasan bukti sendiri
function buildLocalDigest(task, pages) {
  const lines = [`📌 Hasil riset buat: ${task}`, ""];
  for (const p of pages.slice(0, MAX_PICKS)) {
    lines.push(`• ${p.title || p.domain} (${p.domain})`);
    if (p.text) lines.push(`  ${String(p.text).replace(/\s+/g, " ").slice(0, 400)}...`);
    else if (p.snippet) lines.push(`  ${p.snippet}`);
    lines.push(`  🔗 ${p.url}`);
    lines.push("");
  }
  lines.push("_Disusun otomatis dari isi halaman — mode digest (AI penyusun lagi sibuk)._");
  return lines.join("\n");
}
