// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .aicall2 — Panggilan suara WhatsApp kesambung AI (service aicall/ Go)
// RENAME 1 Okt 2026 (owner: "fitur .aicall ubah jadi .aicall2 krna btuh
// konfigurasi — ibaratkan voip ini fitur aicall bawaan"): command .aicall
// diserahkan ke plugin VOIP (plugins/owner/voipcall.js, telepon WA + media),
// plugin ini (butuh service Go aicall/ berjalan) pindah ke .aicall2.
// Request owner 17 Sep 2026: "gmna supaya bot aku support tlpon kesambung ai
// pakai fitur ini: github.com/krsna081/assisten-ai-call"
//
// KENAPA SERVICE TERPISAH: panggilan suara WhatsApp (VOIP + codec MLow) gak
// didukung Baileys/Node.js — makanya service Go (whatsmeow + meowcaller,
// folder aicall/) jalan berdampingan sebagai device WA ke-2 di nomor yang
// sama. Plugin ini cuma PEMICU via HTTP lokal 127.0.0.1:8788.
//
// Alur: owner ".aicall2 62xxx" → POST /call → service Go menelepon → AI
// bicara (rekam 6 dtk → Groq Whisper STT → Gemini → TTS → MLow).
// Panggilan MASUK ke nomor bot dijawab AI otomatis (nomor di OWNER .env).
//
//   .aicall2 <nomor>       — bot AI menelepon nomor tujuan
//   .aicall2 status        — status service AI Call
//   .aicall2 engine <nama> — TTS engine live (edgetts/geminitts/elevenlabs/openai/animetts/google)
//   .aicall2 voice <nama>  — suara live (id-ID-GadisNeural, id-ID-ArdiNeural, ms-MY-YasminNeural, Puck...)
//
// Key Gemini + Groq + GROK (xAI) diambil dari PUSAT apikeys.json dan
// dikirim per-request — service Go pakai itu, .env cuma fallback.
// Otak percakapan: GROK (xai) kalau key-nya ada, kalau tidak AGENT
// (gateway 9router — otak AI agent bot utama, request owner 26 Sep:
// "key Grok mahal gak dipasang, fallback tembak ke ai agent"), kalau
// tidak GROQ (key owner 17 Sep, model gpt-oss-20b super cepat), kalau
// tidak Gemini.
// Ganti otak live: .aicall2 ai grok / agent / groq / gemini.
// Deploy/aturan lengkap: aicall/INTEGRATION.md
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getApiKey } from "../../src/lib/nova-api-keys.js";
import { getAicallAutostartStatus } from "../../src/lib/nova-aicall-autostart.js";
import { getTioEndpoint, getTioKey } from "../../src/lib/config/env-loader.js";

const AICALL_BASE = process.env.AICALL_HTTP_BASE || "http://127.0.0.1:8788";

// 🔹 seam e2e — function = mock; null = error path (service down);
// undefined = fetch asli
let _fetchImpl;
export function _setAicallFetchForTest(fn) { _fetchImpl = fn; }
export function _clearAicallFetchForTest() { _fetchImpl = undefined; }

async function apiCall(path, { method = "GET", body, timeoutMs = 30000 } = {}) {
  const key = process.env.AICALL_HTTP_KEY || "";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const doFetch = typeof _fetchImpl === "function" ? _fetchImpl : (_fetchImpl === null ? async () => { throw new Error("service down"); } : fetch);
    const res = await doFetch(AICALL_BASE + path, {
      method,
      headers: { "Content-Type": "application/json", ...(key ? { "X-Api-Key": key } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    let json = null;
    try { json = await res.json(); } catch {}
    return { status: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

function normalizeNumber(raw) {
  return String(raw || "").trim().replace(/^\+/, "").replace(/[-\s]/g, "");
}

// key dari pusat (tiap akses try-catch sendiri — db error gak boleh ngeblok)
let _pusatKeyImpl;
export function _setAicallPusatKeyForTest(fn) { _pusatKeyImpl = fn; }
export function _clearAicallPusatKeyForTest() { _pusatKeyImpl = undefined; }

function pusatKey(name) {
  if (typeof _pusatKeyImpl === "function") return _pusatKeyImpl(name);
  try {
    const v = getApiKey(name);
    return typeof v === "string" && v.trim() ? v.trim() : "";
  } catch {
    return "";
  }
}

// 🔹 seam e2e — function = mock {key,url,model}; undefined = baca pusat asli
let _agentInfoImpl;
export function _setAicallAgentForTest(fn) { _agentInfoImpl = fn; }
export function _clearAicallAgentForTest() { _agentInfoImpl = undefined; }

// info gateway 9router (otak AI agent) — endpoint + key dari pusat, sama
// dengan provider tio_* bot utama. Gagal baca pusat → dianggap gak ada.
function agentInfo() {
  if (typeof _agentInfoImpl === "function") return _agentInfoImpl();
  try {
    const key = String(getTioKey() || "").trim();
    const url = String(getTioEndpoint() || "").trim();
    return { key, url, model: "ag/gemini-pro-agent" };
  } catch {
    return { key: "", url: "", model: "ag/gemini-pro-agent" };
  }
}

// persona Aina versi panggilan suara — request owner 26 Sep: "fallback ke
// ai biasa, tembak ke ai agent, jadi seolah-olah telepon interaksi bicara
// dengan ai agent". Sopan, saya/kamu, SINGKAT (suara telepon).
const AINA_CALL_PROMPT = [
  "Kamu adalah Aina, asisten AI wanita Indonesia yang sedang berbicara lewat panggilan telepon WhatsApp.",
  "Aturan penting:",
  "1. Jawab dengan SINGKAT, SOPAN, dan ALAMI (maksimal 1-2 kalimat pendek, maksimal 25 kata).",
  "2. Gunakan kata 'saya' untuk dirimu dan 'kamu' untuk lawan bicara. Jangan pakai bahasa gaul atau slang.",
  "3. JANGAN jawaban panjang, bertele-tele, atau berbentuk daftar agar suara tidak terpotong.",
  "4. JANGAN gunakan format markdown (bintang, pagar, bullet) atau emoji — kamu berbicara, bukan menulis.",
  "5. Basa-basi secukupnya: sapa manis, tanya kabar sekali di awal, lalu fokus bantu kebutuhannya.",
].join("\n");

const pluginConfig = {
  name: "aicall2",
  alias: ["aicall2", "aicaller"],
  category: "owner",
  description: "Panggilan suara AI — telepon kesambung AI (service aicall)",
  usage: ".aicall2 <nomor> — bot AI menelepon nomor tujuan\n.aicall2 status — status service AI Call\n.aicall2 engine <edgetts|geminitts|elevenlabs|openai|animetts> — ganti TTS engine live\n.aicall2 voice <nama_suara> — ganti suara live\n.aicall2 ai <grok|agent|groq|gemini> — ganti otak percakapan live\n\nNomor format internasional tanpa + (contoh: 628123456789). Panggilan masuk ke nomor bot juga dijawab AI.",
  example: ".aicall2 628123456789\n.aicall2 status",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const ENGINES = ["edgetts", "geminitts", "elevenlabs", "openai", "animetts", "google"];
const VOICE_HINT = "id-ID-GadisNeural (wanita ID), id-ID-ArdiNeural (pria ID), ms-MY-YasminNeural, Puck, Kore, nova";

async function handler(m) {
  try {
    if (!m.isOwner) {
      try { await m.react("🚫"); } catch {}
      return m.reply(claraWrap("aicall2", "Perintah ini khusus Owner bot."));
    }
    const args = (m.text || "").trim().split(/\s+/).filter(Boolean);
    const sub = (args[0] || "").toLowerCase();

    // ── .aicall2 status ──
    if (sub === "status") {
      try { await m.react("🛠️"); } catch {}
      const r = await apiCall("/health");
      const j = r.json || {};
      if (r.status !== 200 || j.ok !== true) {
        try { await m.react("❌"); } catch {}
        // hasil auto-run boot terakhir — nunjukin KENAPA service gak jalan
        const auto = getAicallAutostartStatus();
        return m.reply(claraWrap("aicall2", `Service AI Call tidak merespons${j.error ? " — " + j.error : ""}. Auto-run saat boot: ${auto ? auto.reason : "belum ada catatan (bot baru start?)"}${auto && auto.reason.includes("belum merespon") ? " — cek pm2 logs nova-aicall (sesi mungkin belum pairing)" : ""}`));
      }
      try { await m.react("🐣"); } catch {}
      return m.reply(claraWrap("aicall2", [
        "AI Call Service — Status",
        "",
        "Sesi WA: " + (j.connected ? "terhubung" : "BELUM TERTAUT — cek pm2 logs nova-aicall (pairing code)"),
        "Uptime: " + (j.uptime || "-"),
        "Otak AI: " + (j.provider ? j.provider + (j.provider === "grok" ? " (" + (j.grok_model || "grok-3-mini") + ")" : j.provider === "agent" ? " (" + (j.agent_model || "ag/gemini-pro-agent") + " — AI agent)" : j.provider === "groq" ? " (" + (j.groq_chat_model || "openai/gpt-oss-20b") + ")" : "") : "-"),
        "Model AI: " + (j.model || "-"),
        "TTS Engine: " + (j.engine || "-"),
        "Suara: " + (j.voice || "-"),
        "Owner terdaftar: " + (j.owners ?? "-"),
        "Auto-run: aktif — bot otomatis menyalakan service ini saat boot",
        "",
        "Ganti suara: .aicall2 voice id-ID-GadisNeural",
      ].join("\n")));
    }

    // ── .aicall2 engine <nama> ──
    if (sub === "engine") {
      const engine = (args[1] || "").toLowerCase();
      if (!ENGINES.includes(engine)) {
        return m.reply(claraWrap("aicall2", "Pilihan engine: " + ENGINES.join(" / ") + "\nContoh: .aicall2 engine edgetts"));
      }
      try { await m.react("🛠️"); } catch {}
      const r = await apiCall("/config", { method: "POST", body: { engine } });
      const j = r.json || {};
      if (r.status !== 200 || j.ok !== true) {
        try { await m.react("❌"); } catch {}
        return m.reply(claraWrap("aicall2", `Gagal ganti engine${j.error ? " — " + j.error : ""}.`));
      }
      try { await m.react("🐣"); } catch {}
      return m.reply(claraWrap("aicall2", "TTS engine diganti ke " + (j.engine || engine) + ", suara aktif: " + (j.voice || "-") + "."));
    }

    // ── .aicall2 voice <nama> ──
    if (sub === "voice") {
      const voice = (args.slice(1).join(" ") || "").trim();
      if (!voice) {
        return m.reply(claraWrap("aicall2", "Pilihan suara: " + VOICE_HINT + "\nContoh: .aicall2 voice id-ID-GadisNeural"));
      }
      try { await m.react("🛠️"); } catch {}
      const r = await apiCall("/config", { method: "POST", body: { voice } });
      const j = r.json || {};
      if (r.status !== 200 || j.ok !== true) {
        try { await m.react("❌"); } catch {}
        return m.reply(claraWrap("aicall2", `Gagal ganti suara${j.error ? " — " + j.error : ""}.`));
      }
      try { await m.react("🐣"); } catch {}
      return m.reply(claraWrap("aicall2", "Suara diganti ke " + (j.voice || voice) + "."));
    }

    // ── .aicall2 ai <grok|groq|gemini> — ganti otak percakapan live ──
    if (sub === "ai" || sub === "otak" || sub === "provider") {
      const provider = (args[1] || "").toLowerCase();
      if (provider !== "grok" && provider !== "agent" && provider !== "groq" && provider !== "gemini") {
        return m.reply(claraWrap("aicall2", "Pilihan otak AI: grok (xAI) / agent (AI agent 9router) / groq (super cepat) / gemini\nContoh: .aicall2 ai agent"));
      }
      try { await m.react("🛠️"); } catch {}
      const body = { ai_provider: provider };
      if (provider === "grok") body.grok_api = pusatKey("grok") || pusatKey("xai");
      if (provider === "agent") {
        const ag = agentInfo();
        body.agent_url = ag.url;
        body.agent_key = ag.key;
        body.agent_model = ag.model;
        body.system_prompt = AINA_CALL_PROMPT;
      }
      if (provider === "groq") body.groq_api = pusatKey("groq");
      const r = await apiCall("/config", { method: "POST", body });
      const j = r.json || {};
      if (r.status !== 200 || j.ok !== true) {
        try { await m.react("❌"); } catch {}
        return m.reply(claraWrap("aicall2", "Gagal ganti otak AI" + (j.error ? " — " + j.error : "") + "."));
      }
      try { await m.react("🐣"); } catch {}
      let keyNote = "";
      if (provider === "grok" && !(pusatKey("grok") || pusatKey("xai"))) {
        keyNote = "\n⚠️ Key Grok (xAI) belum ada di pusat apikeys.json (bagian xai/grok — key xAI diawali xai-). Sementara pakai .aicall2 ai groq dulu ya.";
      }
      if (provider === "groq" && !pusatKey("groq")) {
        keyNote = "\n⚠️ Key Groq belum ada di pusat apikeys.json (bagian groq).";
      }
      if (provider === "agent" && !agentInfo().key) {
        keyNote = "\n⚠️ Key gateway 9router belum ada di pusat apikeys.json (bagian tioApiKey). Sementara pakai .aicall2 ai groq dulu ya.";
      }
      if (provider === "agent" && agentInfo().key) {
        keyNote = "\nPersona panggilan: Aina (sopan, saya/kamu) — seolah-olah telepon dengan AI agent.";
      }
      return m.reply(claraWrap("aicall2", "Otak AI panggilan diganti ke " + provider + "." + keyNote));
    }

    // ── .aicall2 <nomor> ──
    // ambil TEKS PENUH (bukan args[0]) — nomor bisa ditulis pakai spasi/tanda minus
    // "+62 812-3456-789" → dinormalisasi jadi 628123456789
    const numRaw = (m.text || "").trim();
    const num = normalizeNumber(numRaw);
    if (!num || num.length < 8 || !/^\d+$/.test(num)) {
      return m.reply(claraWrap("aicall2", [
        "Cara pakai AI Call:",
        ".aicall2 <nomor> — bot AI menelepon (contoh: .aicall2 628123456789)",
        ".aicall2 status — status service",
        ".aicall2 engine / .aicall2 voice — ganti suara live",
        "",
        "Panggilan masuk ke nomor bot juga otomatis dijawab AI.",
      ].join("\n")));
    }
    try { await m.react("🛠️"); } catch {}
    const body = { number: num };
    const gk = pusatKey("gemini");
    const qk = pusatKey("groq");
    const xk = pusatKey("grok") || pusatKey("xai");
    if (gk) body.gemini_api = gk;
    if (qk) body.groq_api = qk;
    // Otak percakapan: grok (xAI) kalau key-nya ada, kalau tidak groq (key
    // owner 17 Sep — model gpt-oss-20b), kalau tidak gemini
    if (xk) {
      body.grok_api = xk;
      body.ai_provider = "grok";
    } else {
      // owner 26 Sep: key Grok gak dipasang (mahal) → tembak ke AI agent
      // (gateway 9router, persona Aina) SEBELUM groq/gemini
      const ag = agentInfo();
      if (ag.key && ag.url) {
        body.ai_provider = "agent";
        body.agent_url = ag.url;
        body.agent_key = ag.key;
        body.agent_model = ag.model;
        body.system_prompt = AINA_CALL_PROMPT;
      } else if (qk) {
        body.ai_provider = "groq";
      }
    }
    const r = await apiCall("/call", { method: "POST", body, timeoutMs: 60000 });
    const j = r.json || {};
    if (r.status !== 200 || j.ok !== true) {
      try { await m.react("❌"); } catch {}
      const reason = j.error || (r.status ? "HTTP " + r.status : "service tidak merespons");
      return m.reply(claraWrap("aicall2", [
        "Panggilan AI gagal: " + reason,
        "",
        r.status === 0 || !r.json ? "Service AI Call belum jalan di VPS — pm2 start ./ai-call --name nova-aicall (lihat aicall/INTEGRATION.md)" : "Cek .aicall2 status untuk detail.",
      ].join("\n")));
    }
    try { await m.react("🐣"); } catch {}
    return m.reply(claraWrap("aicall2", "Bot AI sedang menelepon " + num + " — tunggu tersambung, AI akan menyapa duluan."));
  } catch (e) {
    console.error("[AICALL] error:", e.message);
    try { await m.react("❌"); } catch {}
    return m.reply(claraWrap("aicall2", "Service AI Call tidak bisa dihubungi — pastikan service jalan di VPS (pm2 start nova-aicall). Detail: aicall/INTEGRATION.md"));
  }
}

export { pluginConfig as config, handler };
export default { pluginConfig, handler, command: ["aicall2", "aicaller"] };
