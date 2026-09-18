// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-voice-reply.js — SATU PINTU balasan suara (TTS edge-tts npm → ogg → PTT)
// Dipakai: .novaagent pakai suara / .novaagent suara <id> (request owner
// 18 Sep 2026: "apa g bsa gini aja .novaagent pakai suara (mode n aktif)" +
// ".novaagent suara ardi" + "jd cmd ttep nova agent gt") — jawaban nova
// agent DIBACAKAN jadi voice note, command tetap .novaagent.
// Storage: db.setting("novaAgentVoice") = { [chatJid]: { on, voice } }
import { exec } from "child_process";
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

// ═══════════ CFG per chat (db.setting("novaAgentVoice")) ═══════════
export function getVoiceCfg(db, chat) {
  try {
    const cur = db?.setting?.("novaAgentVoice") || {};
    const c = cur[chat] || {};
    return { on: c.on === true, voice: c.voice || defaultVoice() };
  } catch { return { on: false, voice: defaultVoice() }; }
}
export function setVoiceCfg(db, chat, patch) {
  try {
    if (!db?.setting) return;
    const cur = db.setting("novaAgentVoice") || {};
    const c = cur[chat] || {};
    cur[chat] = { ...c, ...patch };
    db.setting("novaAgentVoice", cur);
  } catch {}
}

// mode ON per chat ATAU user minta "pakai suara" di teks request ini
const VOICE_REQ = /\b(pakai suara|pake suara|pakai vn|pake vn|jawab pakai suara|jawab pake suara|suara aja|vn aja|via suara|via vn|voice note|dengan suara|dgn suara)\b/i;
export function wantsVoice(db, chat, userText) {
  const cfg = getVoiceCfg(db, chat);
  if (cfg.on) return true;
  try { return VOICE_REQ.test(String(userText || "")); } catch { return false; }
}

// ═══════════ TTS — edge-tts npm (GRATIS, tanpa python) ═══════════
async function edgeTTSBuffer(text, voiceLang) {
  if (_ttsImpl !== undefined) {
    if (_ttsImpl === null) return null;
    return _ttsImpl(text, voiceLang);
  }
  try {
    const { tts } = await import("edge-tts");
    const clean = String(text).replace(/["`']/g, "").replace(/\n/g, " ").slice(0, 500);
    const buf = await tts(clean, { voice: voiceLang });
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
    await execAsync("ffmpeg -y -i " + inFile + " -codec:a libopus -b:a 32k -ar 48000 " + outFile + " 2>/dev/null", { timeout: 30000 });
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

    let mp3 = await edgeTTSBuffer(spoken, voice.lang);
    if (!mp3) mp3 = await edgeTTSBuffer(spoken, VOICE_OPTIONS[1].lang); // fallback ardi
    if (!mp3) return false;
    const ogg = await convertToOgg(mp3);
    const opts = quoted ? { quoted } : {};
    const sent = ogg
      ? await sock.sendMessage(jid, { audio: ogg, mimetype: "audio/ogg; codecs=opus", ptt: true }, opts)
      : await sock.sendMessage(jid, { audio: mp3, mimetype: "audio/mpeg" }, opts);
    return !!sent;
  } catch (e) {
    console.error("[VoiceReply] speak error:", e?.message || e);
    return false;
  }
}
