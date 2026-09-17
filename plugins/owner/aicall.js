// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .aicall — Panggilan suara WhatsApp kesambung AI (service aicall/ Go)
// Request owner 17 Sep 2026: "gmna supaya bot aku support tlpon kesambung ai
// pakai fitur ini: github.com/krsna081/assisten-ai-call"
//
// KENAPA SERVICE TERPISAH: panggilan suara WhatsApp (VOIP + codec MLow) gak
// didukung Baileys/Node.js — makanya service Go (whatsmeow + meowcaller,
// folder aicall/) jalan berdampingan sebagai device WA ke-2 di nomor yang
// sama. Plugin ini cuma PEMICU via HTTP lokal 127.0.0.1:8788.
//
// Alur: owner ".aicall 62xxx" → POST /call → service Go menelepon → AI
// bicara (rekam 6 dtk → Groq Whisper STT → Gemini → TTS → MLow).
// Panggilan MASUK ke nomor bot dijawab AI otomatis (nomor di OWNER .env).
//
//   .aicall <nomor>       — bot AI menelepon nomor tujuan
//   .aicall status        — status service AI Call
//   .aicall engine <nama> — TTS engine live (edgetts/geminitts/elevenlabs/openai/animetts/google)
//   .aicall voice <nama>  — suara live (id-ID-GadisNeural, id-ID-ArdiNeural, ms-MY-YasminNeural, Puck...)
//
// Key Gemini + Groq diambil dari PUSAT apikeys.json (aturan 17 Sep) dan
// dikirim per-request — service Go pakai itu, .env-nya cuma fallback.
// Deploy/aturan lengkap: aicall/INTEGRATION.md
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getApiKey } from "../../src/lib/nova-api-keys.js";

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
function pusatKey(name) {
  try {
    const v = getApiKey(name);
    return typeof v === "string" && v.trim() ? v.trim() : "";
  } catch {
    return "";
  }
}

const pluginConfig = {
  name: "aicall",
  alias: ["aicall", "aicaller"],
  category: "owner",
  description: "Panggilan suara AI — telepon kesambung AI (service aicall)",
  usage: ".aicall <nomor> — bot AI menelepon nomor tujuan\n.aicall status — status service AI Call\n.aicall engine <edgetts|geminitts|elevenlabs|openai|animetts> — ganti TTS engine live\n.aicall voice <nama_suara> — ganti suara live\n\nNomor format internasional tanpa + (contoh: 628123456789). Panggilan masuk ke nomor bot juga dijawab AI.",
  example: ".aicall 628123456789\n.aicall status",
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
      return m.reply(claraWrap("aicall", "Perintah ini khusus Owner bot."));
    }
    const args = (m.text || "").trim().split(/\s+/).filter(Boolean);
    const sub = (args[0] || "").toLowerCase();

    // ── .aicall status ──
    if (sub === "status") {
      try { await m.react("🛠️"); } catch {}
      const r = await apiCall("/health");
      const j = r.json || {};
      if (r.status !== 200 || j.ok !== true) {
        try { await m.react("❌"); } catch {}
        return m.reply(claraWrap("aicall", `Service AI Call tidak merespons${j.error ? " — " + j.error : ""}. Jalankan dulu di VPS: pm2 start ./ai-call --name nova-aicall (lihat aicall/INTEGRATION.md).`));
      }
      try { await m.react("🐣"); } catch {}
      return m.reply(claraWrap("aicall", [
        "AI Call Service — Status",
        "",
        "Sesi WA: " + (j.connected ? "terhubung" : "BELUM TERTAUT — cek pm2 logs nova-aicall (pairing code)"),
        "Uptime: " + (j.uptime || "-"),
        "Model AI: " + (j.model || "-"),
        "TTS Engine: " + (j.engine || "-"),
        "Suara: " + (j.voice || "-"),
        "Owner terdaftar: " + (j.owners ?? "-"),
        "",
        "Ganti suara: .aicall voice id-ID-GadisNeural",
      ].join("\n")));
    }

    // ── .aicall engine <nama> ──
    if (sub === "engine") {
      const engine = (args[1] || "").toLowerCase();
      if (!ENGINES.includes(engine)) {
        return m.reply(claraWrap("aicall", "Pilihan engine: " + ENGINES.join(" / ") + "\nContoh: .aicall engine edgetts"));
      }
      try { await m.react("🛠️"); } catch {}
      const r = await apiCall("/config", { method: "POST", body: { engine } });
      const j = r.json || {};
      if (r.status !== 200 || j.ok !== true) {
        try { await m.react("❌"); } catch {}
        return m.reply(claraWrap("aicall", `Gagal ganti engine${j.error ? " — " + j.error : ""}.`));
      }
      try { await m.react("🐣"); } catch {}
      return m.reply(claraWrap("aicall", "TTS engine diganti ke " + (j.engine || engine) + ", suara aktif: " + (j.voice || "-") + "."));
    }

    // ── .aicall voice <nama> ──
    if (sub === "voice") {
      const voice = (args.slice(1).join(" ") || "").trim();
      if (!voice) {
        return m.reply(claraWrap("aicall", "Pilihan suara: " + VOICE_HINT + "\nContoh: .aicall voice id-ID-GadisNeural"));
      }
      try { await m.react("🛠️"); } catch {}
      const r = await apiCall("/config", { method: "POST", body: { voice } });
      const j = r.json || {};
      if (r.status !== 200 || j.ok !== true) {
        try { await m.react("❌"); } catch {}
        return m.reply(claraWrap("aicall", `Gagal ganti suara${j.error ? " — " + j.error : ""}.`));
      }
      try { await m.react("🐣"); } catch {}
      return m.reply(claraWrap("aicall", "Suara diganti ke " + (j.voice || voice) + "."));
    }

    // ── .aicall <nomor> ──
    // ambil TEKS PENUH (bukan args[0]) — nomor bisa ditulis pakai spasi/tanda minus
    // "+62 812-3456-789" → dinormalisasi jadi 628123456789
    const numRaw = (m.text || "").trim();
    const num = normalizeNumber(numRaw);
    if (!num || num.length < 8 || !/^\d+$/.test(num)) {
      return m.reply(claraWrap("aicall", [
        "Cara pakai AI Call:",
        ".aicall <nomor> — bot AI menelepon (contoh: .aicall 628123456789)",
        ".aicall status — status service",
        ".aicall engine / .aicall voice — ganti suara live",
        "",
        "Panggilan masuk ke nomor bot juga otomatis dijawab AI.",
      ].join("\n")));
    }
    try { await m.react("🛠️"); } catch {}
    const body = { number: num };
    const gk = pusatKey("gemini");
    const qk = pusatKey("groq");
    if (gk) body.gemini_api = gk;
    if (qk) body.groq_api = qk;
    const r = await apiCall("/call", { method: "POST", body, timeoutMs: 60000 });
    const j = r.json || {};
    if (r.status !== 200 || j.ok !== true) {
      try { await m.react("❌"); } catch {}
      const reason = j.error || (r.status ? "HTTP " + r.status : "service tidak merespons");
      return m.reply(claraWrap("aicall", [
        "Panggilan AI gagal: " + reason,
        "",
        r.status === 0 || !r.json ? "Service AI Call belum jalan di VPS — pm2 start ./ai-call --name nova-aicall (lihat aicall/INTEGRATION.md)" : "Cek .aicall status untuk detail.",
      ].join("\n")));
    }
    try { await m.react("🐣"); } catch {}
    return m.reply(claraWrap("aicall", "Bot AI sedang menelepon " + num + " — tunggu tersambung, AI akan menyapa duluan."));
  } catch (e) {
    console.error("[AICALL] error:", e.message);
    try { await m.react("❌"); } catch {}
    return m.reply(claraWrap("aicall", "Service AI Call tidak bisa dihubungi — pastikan service jalan di VPS (pm2 start nova-aicall). Detail: aicall/INTEGRATION.md"));
  }
}

export { pluginConfig as config, handler };
export default { pluginConfig, handler, command: ["aicall", "aicaller"] };
