// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-voice-reply.js — SATU PINTU balasan suara (Inworld TTS-2 neural → fallback msedge-tts → ogg → PTT)
// (owner 29 Sep 2026: suara utama Inworld biar gak pecah; Inworld down → voice pertama msedge-tts)
// Dipakai BANYAK FITUR (mode suara per chat, per fitur):
//   • .novaagent pakai suara / .novaagent suara <id> (request owner 18 Sep)
//   • .aisuperagent pakai suara (upgrade owner 18 Sep: "fitur suaraa ini jg
//     bsa di aisuperagent dan autonovaagent")
//   • .anovaagent / .setanovaagent pakai suara (idem)
// Storage PER FITUR: db.setting(KEY) = { [chatJid]: { on, voice } }
//   KEY = "novaAgentVoice" | "aisuperagentVoice" | "anovaagentVoice"
// Satu chat bisa beda mode per fitur — cfg gak nyampur.
import { exec } from "child_process";
import { getInworldKey } from "./nova-inworld.js";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}
function tempPath(prefix, ext) {
  ensureTmp();
  return path.join(TMP_DIR, `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

// === NEURAL VOICES (Microsoft Edge TTS — GRATIS, natural) ===
export const VOICE_OPTIONS = [
  { id: "gadis",  name: "Gadis (Wanita ID, natural ceria)",  lang: "id-ID-GadisNeural" },
  { id: "ardi",   name: "Ardi (Pria ID, natural hangat)",    lang: "id-ID-ArdiNeural" },
  { id: "ava",    name: "Ava (Wanita EN, natural modern)",   lang: "en-US-AvaNeural" },
  { id: "andrew", name: "Andrew (Pria EN, natural hangat)", lang: "en-US-AndrewNeural" },
  { id: "emma",   name: "Emma (Wanita EN, natural lembut)",  lang: "en-US-EmmaNeural" },
  { id: "brian",  name: "Brian (Pria EN, gaya BBC)",         lang: "en-US-BrianNeural" },
  { id: "jenny",  name: "Jenny (Wanita EN, friendly)",      lang: "en-US-JennyNeural" },
];

export function defaultVoice() { return VOICE_OPTIONS[0].id; }

// ═══════════ SEAM E2E: function = mock; null = gagal; undefined = asli ═══════════
let _ttsImpl;
export function _setVoiceTtsForTest(fn) { _ttsImpl = fn; }

// ═══════════ CFG per chat per fitur (db.setting(KEY)) ═══════════
export const VOICE_KEYS = {
  novaagent: "novaAgentVoice",
  aisuperagent: "aisuperagentVoice",
  anovaagent: "anovaagentVoice",
};
export function getVoiceCfg(db, chat, key = VOICE_KEYS.novaagent) {
  try {
    const cur = db?.setting?.(key) || {};
    const c = cur[chat] || {};
    return { on: c.on === true, voice: c.voice || defaultVoice() };
  } catch { return { on: false, voice: defaultVoice() }; }
}
export function setVoiceCfg(db, chat, patch, key = VOICE_KEYS.novaagent) {
  try {
    if (!db?.setting) return;
    const cur = db.setting(key) || {};
    const c = cur[chat] || {};
    cur[chat] = { ...c, ...patch };
    db.setting(key, cur);
  } catch {}
}

// mode ON per chat ATAU user minta "pakai suara" di teks request ini
const VOICE_REQ = /\b(pakai suara|pake suara|pakai vn|pake vn|jawab pakai suara|jawab pake suara|suara aja|vn aja|via suara|via vn|voice note|dengan suara|dgn suara)\b/i;
export function wantsVoice(db, chat, userText, key = VOICE_KEYS.novaagent) {
  const cfg = getVoiceCfg(db, chat, key);
  if (cfg.on) return true;
  try { return VOICE_REQ.test(String(userText || "")); } catch { return false; }
}

// ═══════════ SUBCOMMAND SUARA BERSAMA ═══════════
// `low` = teks perintah user (sudah lowercase, tanpa nama command).
// return: array baris reply kalau `low` adalah subcommand suara
// (pemanggil bungkus claraWrap sendiri); null kalau BUKAN → lanjut flow biasa.
// Daftar exact-match (sama kaya .novaagent) — pertanyaan biasa yang
// kebetulan mengandung kata "suara" TIDAK ditelan subcommand.
const VOICE_ON = ["pakai suara", "pake suara", "suara on", "suara aktif", "suara aktifkan", "suara nyala", "mode suara", "mode suara on", "mode suara aktif"];
const VOICE_OFF = ["suara off", "suara mati", "suara matikan", "suara nonaktif", "jangan pakai suara", "jangan pake suara", "tanpa suara", "mode suara off"];
const VOICE_STATUS = ["suara", "suara status", "suara info", "suara list"];
// 🔹 STATUS SUMBER SUARA (owner 29 Sep: kartu "suara saat ini: gadis"
// bikin bingung — gadis itu cuma fallback bawaan; sumber UTAMA Inworld.
// Baris ini jujur: mana yang utama, mana yang bawaan.
function voiceSourceLine() {
  let hasKey = false;
  try { hasKey = !!getInworldKey(); } catch {}
  return hasKey
    ? "Sumber utama: Inworld TTS-2 (neural) ✓ — voice custom owner prioritas"
    : "Sumber utama: Inworld TTS-2 ✗ — key belum di-set (.setkey inworld <key>) → jadi pakai bawaan";
}

export function voiceSubReply(db, chat, low, key = VOICE_KEYS.novaagent) {
  low = String(low || "").toLowerCase().trim();
  const vm = low.match(/^suara\s+([a-z]+)$/);
  const isVoiceId = vm && VOICE_OPTIONS.some(v => v.id === vm[1]);
  const isOn = VOICE_ON.includes(low);
  const isOff = VOICE_OFF.includes(low);
  const isStatus = VOICE_STATUS.includes(low);
  if (!isOn && !isOff && !isStatus && !isVoiceId) return null;
  if (isOn) {
    setVoiceCfg(db, chat, { on: true }, key);
    const cfg = getVoiceCfg(db, chat, key);
    return [
      "🎙️ Mode suara AKTIF",
      "Semua jawabanku akan dibacakan jadi voice note",
      voiceSourceLine(),
      "Fallback bawaan: " + (VOICE_OPTIONS.find(v => v.id === cfg.voice)?.name || cfg.voice) + " (dipakai kalau Inworld down)",
    ];
  }
  if (isOff) {
    setVoiceCfg(db, chat, { on: false }, key);
    return [
      "🔇 Mode suara NONAKTIF",
      "Jawabanku balik ke teks biasa",
    ];
  }
  if (isVoiceId) {
    const v = VOICE_OPTIONS.find(x => x.id === vm[1]);
    setVoiceCfg(db, chat, { voice: v.id, on: true }, key);
    return [
      "🎙️ Suara fallback diganti: " + v.name,
      "Mode suara ikut AKTIF",
      voiceSourceLine(),
      "Catatan: suara ini kepakai kalau Inworld down/tanpa key (Inworld tetap utama)",
    ];
  }
  // status
  const cfg = getVoiceCfg(db, chat, key);
  return [
    "🎙️ Status mode suara: " + (cfg.on ? "AKTIF — jawabanku dibacakan jadi voice note" : "NONAKTIF — jawaban teks biasa"),
    voiceSourceLine(),
    "Fallback bawaan: " + (VOICE_OPTIONS.find(v => v.id === cfg.voice)?.name || cfg.voice),
    "",
    "Ganti fallback: " + VOICE_OPTIONS.map(v => v.id).join(", "),
  ];
}

// ═══════════ TTS — edge-tts npm (GRATIS, tanpa python) ═══════════
async function edgeTTSBuffer(text, voiceLang) {
  if (_ttsImpl !== undefined) {
    if (_ttsImpl === null) return null;
    return _ttsImpl(text, voiceLang);
  }
  try {
    // 🔹 FIX 18 Sep 2026: paket npm "edge-tts" GAK JALAN — Microsoft
    // wajibin header Sec-MS-GEC (anti-abuse token) sejak medio 2024,
    // paket lama balikin 403 tanpa itu. "msedge-tts" v2.0.7+ udah
    // implementasi generateSecMsGec() — INI YANG BENERAN NYAMBUNG.
    const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
    const clean = String(text).replace(/["`']/g, "").replace(/\n/g, " ").slice(0, 500);
    const tts = new MsEdgeTTS({});
    // 🔹 FIX 19 Sep 2026 (owner: "suaranya pecah kayak tts android biasa,
    // bkn suara neural"): 48kbps mono = bitrate serendah TTS murahan —
    // naik ke 96kbps biar suara neural beneran terdengar HD.
    await tts.setMetadata(voiceLang, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(clean);
    const buf = await new Promise((resolve, reject) => {
      const chunks = [];
      audioStream.on("data", (c) => chunks.push(c));
      audioStream.on("end", () => resolve(Buffer.concat(chunks)));
      audioStream.on("error", reject);
    });
    return buf && buf.length > 500 ? buf : null;
  } catch (e) {
    console.error("[VoiceReply] Edge TTS error:", e?.message || e);
    return null;
  }
}

async function convertToOgg(inputBuffer) {
  const inFile = tempPath("vrin", ".mp3");
  const outFile = tempPath("vrout", ".ogg");
  try {
    fs.writeFileSync(inFile, inputBuffer);
    // opus 32k → 64k (FIX 19 Sep: 32k bikin suara pecah pas diputar WA)
    await execAsync("ffmpeg -y -i " + inFile + " -codec:a libopus -b:a 64k -ar 48000 " + outFile + " 2>/dev/null", { timeout: 30000 });
    if (fs.existsSync(outFile) && fs.statSync(outFile).size > 500) return fs.readFileSync(outFile);
    return null;
  } catch (e) {
    console.error("[VoiceReply] Convert ogg error:", e?.message || e);
    return null;
  } finally {
    try { fs.unlinkSync(inFile); } catch {}
    try { fs.unlinkSync(outFile); } catch {}
  }
}

// ═══════════ DIAGNOSA — kenapa VN gak jadi (owner 19 Sep: mode suara ON
// tapi jawaban balik teks SENYAP — sekarang penyebabnya keliatan di chat)
// return array string masalah; kosong = semua dependensi sehat.
let _diagImpl; // seam: function = mock; undefined = asli
export function _setVoiceDiagForTest(fn) { _diagImpl = fn; }

export async function diagnoseVoiceTts() {
  if (typeof _diagImpl === "function") return _diagImpl();
  const issues = [];
  try {
    await import("msedge-tts");
  } catch {
    issues.push("package msedge-tts gak kebaca — jalankan npm install di folder bot lalu pm2 restart");
  }
  try {
    await execAsync("ffmpeg -version", { timeout: 8000 });
  } catch {
    issues.push("ffmpeg gak ketemu — apt-get install ffmpeg");
  }
  return issues;
}

// teks catatan kegagalan VN — dipakai pemanggil (novaai voiceAnswer) biar
// kegagalan TTS gak senyap: jawaban tetep dikirim teks + penyebab jelas.
export function voiceFailHint(issues) {
  const why = (issues && issues.length)
    ? issues.join(" · ")
    : "Microsoft TTS gagal dijangkau dari VPS (cek log console bot — kemungkinan jaringan diblokir/403)";
  return "🎙️ ⚠️ Mode suara aktif tapi jawaban gak bisa dibacakan VN.\nPenyebab: " + why;
}

// ═══════════ INWORLD TTS-2 — SUARA UTAMA (owner 29 Sep 2026: "apa bsa
// diimplementasikan suara voice agent yg suaranya pecah kyk tts baku ke
// stt generate buatan dr ai inworld ai?") — Inworld TTS-2 neural nggantian
// msedge-tts sebagai suara PERTAMA yang dicoba (voice custom workspace
// owner prioritas, cross-lingual). Kalau Inworld DOWN/tanpa key/error →
// FALLBACK ke voice pertama yang asli (msedge-tts) — owner: "klo nanti
// inworld ai down falback ke voice prtama yg buatan".
// ═══════════ seam e2e: undefined = asli; null = simulate Inworld down;
// function = mock(text) → buffer ═══════════
let _inworldTtsImpl;
export function _setInworldVoiceTtsForTest(fn) { _inworldTtsImpl = fn; }

// teks → MP3 buffer via Inworld TTS-2; return null kalau down/tanpa key
// (PENTING: null BUKAN throw — biar speakVoiceNote lanjut ke fallback)
async function inworldTTSBuffer(text) {
  if (_inworldTtsImpl !== undefined) {
    if (_inworldTtsImpl === null) return null; // simulate Inworld down
    try { return await _inworldTtsImpl(text); } catch { return null; }
  }
  try {
    const { getInworldKey, resolveDefaultVoice, inworldSynthesize } = await import("./nova-inworld.js");
    // tanpa key → gak usah nyobain API, langsung fallback (hemat latency VN)
    if (!getInworldKey()) return null;
    // voice custom workspace (mis. "Aizat" buatan owner) > katalog Inworld
    const voiceId = await resolveDefaultVoice();
    const r = await inworldSynthesize({ text, voiceId, encoding: "MP3" });
    return r?.buffer || null;
  } catch (e) {
    console.log("[VoiceReply] Inworld TTS gagal (" + (e?.message || e) + ") — fallback ke voice pertama (msedge-tts)");
    return null;
  }
}

// ═══════════ SATU PINTU: ucapkan teks jadi voice note (PTT) ═══════════
// return true kalau VN sukses terkirim, false kalau gagal (pemanggil wajib
// fallback ke balasan teks biasa).
export async function speakVoiceNote(sock, jid, text, voiceId, { quoted } = {}) {
  try {
    if (!sock || typeof sock.sendMessage !== "function") return false;
    const voice = VOICE_OPTIONS.find(v => v.id === voiceId) || VOICE_OPTIONS[0];
    // bersihkan buat suara: buang markdown/simbol box/link gak enak diucap
    const spoken = String(text || "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // [teks](url) → teks
      .replace(/https?:\/\/\S+/g, "tonton linknya di chat ya") // URL diucap natural
      .replace(/[*#_~`]/g, "")
      .replace(/[╭╰│├└─「」✦•]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);
    if (!spoken) return false;

    // 🔹 SUARA UTAMA: Inworld TTS-2 neural; kalau down/tanpa key → fallback
    // ke voice pertama yang asli (msedge-tts) — permintaan owner 29 Sep.
    let engine = "inworld";
    let mp3 = await inworldTTSBuffer(spoken);
    if (!mp3) {
      engine = "edge"; // fallback: voice pertama yang asli
      mp3 = await edgeTTSBuffer(spoken, voice.lang);
      if (!mp3) mp3 = await edgeTTSBuffer(spoken, VOICE_OPTIONS[1].lang); // fallback ardi
    }
    if (!mp3) return false;
    const ogg = await convertToOgg(mp3);
    const opts = quoted ? { quoted } : {};
    const sent = ogg
      ? await sock.sendMessage(jid, { audio: ogg, mimetype: "audio/ogg; codecs=opus", ptt: true }, opts)
      : await sock.sendMessage(jid, { audio: mp3, mimetype: "audio/mpeg" }, opts);
    if (!sent) return false;

    // 🔹 NOTIFIKASI SUMBER SUARA (owner 29 Sep: "gak bisa bedain mana suara
    // dari inworld mana yang fallback saat anovaagent suara on") — 1 baris
    // kecil smallcaps nempel di VN, jelas asalnya tanpa perlu nebak.
    let tag;
    if (engine === "inworld") {
      let vName = "";
      try { const { getLastInworldVoice } = await import("./nova-inworld.js"); vName = getLastInworldVoice()?.name || ""; } catch {}
      tag = "🎙️ sᴜᴀʀᴀ ɪɴᴡᴏʀʟᴅ ᴛᴛs-2" + (vName ? " — ɴᴀᴍᴀ: " + vName : "");
    } else {
      tag = "🔊 sᴜᴀʀᴀ ʙᴀᴡᴀᴀɴ — ɪɴᴡᴏʀʟᴅ ᴏꜰꜰ/ᴅᴏᴡɴ, ꜰᴀʟʟʙᴀᴄᴋ ᴍsᴇᴅɢᴇ-ᴛᴛs";
    }
    try {
      await sock.sendMessage(jid, { text: tag }, { quoted: sent.key ? { key: sent.key } : undefined });
    } catch {}
    return true;
  } catch (e) {
    console.error("[VoiceReply] speak error:", e?.message || e);
    return false;
  }
}
