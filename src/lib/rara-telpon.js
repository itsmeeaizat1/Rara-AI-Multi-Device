// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 TELPON MODE — Voice Agent ala telepon (request owner 12 Sep 2026)
// 🔹 User kirim VOICE NOTE → STT → otak raraai (think + memori + sesi)
//   → jawab pakai SUARA (VN natural haidarTTS) — ngobrol dua arah
// 🔹 Realita teknis: Baileys GAK BISA jawab telponan WhatsApp asli
//   (cuma bisa reject call) — jadi versi teleponnya via voice note,
//   hasil sama: ngomong → didengerin → dijawab suara
// ============================================================

import { think } from "./aiagent.js";
import { transcribeAudio } from "./rara-stt.js";
import { haidarTTS } from "../scraper/haidar-ai.js";
import { memoryBlock, relevantMemories, isMemoryOn, extractMemories } from "./rara-memory.js";
import { getSession, appendTurn } from "./rara-ai-session.js";

const MODE_KEY = "telponMode"; // { [chatId]: true }
const VOICE_KEY = "telponVoice"; // { [sender]: "Gadis" }
const DEFAULT_VOICE = "Gadis";

// ── mode ────────────────────────────────────────────────────
export function isTelponOn(db, chatId) {
  try {
    const all = db?.setting?.(MODE_KEY) || {};
    return all[chatId] === true;
  } catch {
    return false;
  }
}

export function setTelponMode(db, chatId, on) {
  try {
    const all = db?.setting?.(MODE_KEY) || {};
    if (on) all[chatId] = true;
    else delete all[chatId];
    db?.setting?.(MODE_KEY, all);
    return true;
  } catch {
    return false;
  }
}

export function getTelponVoice(db, sender) {
  try {
    const all = db?.setting?.(VOICE_KEY) || {};
    return all[sender] || DEFAULT_VOICE;
  } catch {
    return DEFAULT_VOICE;
  }
}

export function setTelponVoice(db, sender, voice) {
  try {
    const all = db?.setting?.(VOICE_KEY) || {};
    all[sender] = voice;
    db?.setting?.(VOICE_KEY, all);
    return true;
  } catch {
    return false;
  }
}

// ── TTS: teks → buffer VN (mp3 ptt — pola .suaraai) ─────────
export async function speakToBuffer(text, voice) {
  const clean = String(text || "").trim();
  if (!clean) throw new Error("teks kosong");
  const audioUrl = await haidarTTS(clean.slice(0, 900), voice || DEFAULT_VOICE);
  const res = await fetch(audioUrl);
  if (!res.ok) throw new Error("gagal unduh audio TTS (" + res.status + ")");
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf || buf.length < 3000) throw new Error("file audio TTS kosong");
  return buf;
}

// ── jalur utama: VN masuk → transkrip → otak AI → jawab VN ──
const cooldown = new Map();
function isOnCooldown(sender, ms = 4000) {
  const now = Date.now();
  const last = cooldown.get(sender) || 0;
  if (now - last < ms) return true;
  cooldown.set(sender, now);
  return false;
}

export async function handleTelponVn(m, sock, db, config) {
  try {
    // VN-nya sendiri
    const vn = m.isAudio ? m : m.quoted?.isAudio ? m.quoted : null;
    if (!vn) return false;
    if (isOnCooldown(m.sender)) return true; // anti spam-loop

    const prefix = config?.command?.prefix || ".";
    const botName = config?.bot?.name || "Rara AI";

    await m.react("🕒");
    try { await sock.sendPresenceUpdate("recording", m.chat); } catch {}

    // 1. STT — dengerin VN-nya
    const buffer = await vn.download();
    const mime = vn.mimetype || "audio/ogg; codecs=opus";
    const transcript = await transcribeAudio(buffer, mime);
    if (!transcript || transcript.trim().length < 2) {
      await m.react("❌");
      await m.reply(
        `📵 Gak kedengeran jelas nih ${m.pushName ? m.pushName : ""} — coba rekam ulang lagi ya.`
      );
      return true;
    }

    await m.react("🧠");

    // 2. sesi + memori — nyambung sama obrolan .raraai (sessionKey agent:<sender>)
    const sKey = "agent:" + m.sender;
    const history = getSession(sKey).slice(-12).map((h) => ({ role: h.role, content: h.content }));

    let memFacts = "";
    try {
      if (isMemoryOn(db, m.sender)) {
        const rel = relevantMemories(db, m.sender, transcript, 5);
        memFacts = rel.map((f) => `- ${f.text}`).join("\n");
      }
    } catch {}

    let reply = "";
    try {
      const decision = await think(transcript, {
        botname: botName,
        history,
        memory: memFacts,
      });
      // aksi grup/tool GAK dieksekusi di mode telepon (eksekusi+gate-nya
      // kompleks & butuh konfirmasi teks) — JANGAN ngaku udah jalan.
      if (decision?.tool || decision?.execCommand) {
        reply = `Buat aksi itu ketik aja ${prefix}raraagent plus perintahnya ya — di mode telepon aku fokus ngobrol.`;
      } else if (decision?.reply) reply = decision.reply;
    } catch (e) {
      console.error("[telpon] think gagal:", e.message);
    }

    // fallback ringan — jangan diem kalau otak JSON ngambek
    if (!reply) {
      reply = "Maaf, otaknya lagi ngadat — coba ulangi sebentar lagi ya.";
    }

    // 3. jawab pakai suara
    try { await sock.sendPresenceUpdate("recording", m.chat); } catch {}
    const voice = getTelponVoice(db, m.sender);
    const buf = await speakToBuffer(reply, voice);
    await sock.sendMessage(
      m.chat,
      { audio: buf, mimetype: "audio/mpeg", ptt: true },
      { quoted: m }
    );

    // 4. catat sesi + ekstrak memori (fire-and-forget)
    try {
      appendTurn(sKey, transcript, reply);
    } catch {}
    extractMemories(db, m.sender, transcript, reply).catch(() => {});

    await m.react("🐣");
    return true;
  } catch (e) {
    console.error("[telpon] error:", e.message);
    try { await m.react("❌"); } catch {}
    try {
      await m.reply(`📵 Mode telepon error: ${e.message}`);
    } catch {}
    return true;
  }
}

// ── one-shot: teks → jawab VN (tanpa nyalain mode) ──────────
export async function telponSpeak(m, sock, db, config, text) {
  const botName = config?.bot?.name || "Rara AI";
  await m.react("🧠");
  try { await sock.sendPresenceUpdate("recording", m.chat); } catch {}

  const sKey = "agent:" + m.sender;
  const history = getSession(sKey).slice(-12).map((h) => ({ role: h.role, content: h.content }));
  let memFacts = "";
  try {
    if (isMemoryOn(db, m.sender)) {
      const rel = relevantMemories(db, m.sender, text, 5);
      memFacts = rel.map((f) => `- ${f.text}`).join("\n");
    }
  } catch {}

  let reply = "";
  try {
    const decision = await think(text, { botname: botName, history, memory: memFacts });
    if (decision?.tool || decision?.execCommand) {
      reply = `Buat aksi itu ketik aja ${m.prefix || "."}raraagent plus perintahnya ya — di mode telepon aku fokus ngobrol.`;
    } else if (decision?.reply) reply = decision.reply;
  } catch {}
  if (!reply) reply = "Maaf, otaknya lagi ngadat — coba ulangi sebentar lagi ya.";

  const voice = getTelponVoice(db, m.sender);
  const buf = await speakToBuffer(reply, voice);
  await sock.sendMessage(m.chat, { audio: buf, mimetype: "audio/mpeg", ptt: true }, { quoted: m });
  try { appendTurn(sKey, text, reply); } catch {}
  extractMemories(db, m.sender, text, reply).catch(() => {});
  await m.react("🐣");
  return true;
}
