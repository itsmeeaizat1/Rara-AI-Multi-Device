// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═══════════════════════════════════════════════
// Rara AI Grup - Auto nimbrung handler
// Dipanggil dari src/handler.js untuk setiap pesan grup
// Anti-spam: cooldown, rate limit, content filter
// ═══════════════════════════════════════════════
import { getDatabase } from "./rara-database.js";
import { getJadibotSetting } from "./rara-jadibot-database.js";
import { min1aiChat } from "../scraper/min1ai.js";
import config from "../../config.js";

// ═══════════════════════════════════════════════
// ANTI-SPAM SETTINGS
// ═══════════════════════════════════════════════
// Cooldown antar respon bot di grup yang sama
const COOLDOWN_MS = 60000;          // 60 detik antar respon otomatis
const COOLDOWN_TAG_MS = 5000;       // 5 detik kalau di-tag/reply (lebih cepat)

// Rate limit per grup per jam
const MAX_RESPONSES_PER_HOUR = 15;  // Maks 15 respon/jam/grup

// Minimum pesan untuk direspon (anti respon terlalu pendek)
const MIN_MESSAGE_LENGTH = 5;

// Kata yang diabaikan (bot ga akan respon)
const IGNORE_PATTERNS = [
  /^(.{1,3})$/,                     // Pesan terlalu pendek (1-3 char)
  /^[h]+[a-z]*$/i,                 // "haha", "hahaha", "h"
  /^[w]+[a-z]*$/i,                  // "wkwk", "wkwkwk", "w"
  /^[l]+[o]+[l]*$/i,                // "lol", "loool"
  /^(ok|oke|okey|okay|k|y|ya|iya|nh|woi|woy|wey)$/i, // Jawaban singkat
  /^(sama|samasama|sama\s+sama)$/i, // "sama sama"
  /^(ng|nt|ndes|ndasan)$/i,         // Filler
  /^(terima\s+kasih|makasih|tengkyu|thx|thanks)$/i, // Terima kasih
  /^\d+$/,                          // Angka doang
  /^[.\/!#,+]/,                     // Command (harusnya udah ke-filter)
  /https?:\/\//,                    // Link
];

// Tipe pesan yang diabaikan
const IGNORE_TYPES = ["stickerMessage", "reactionMessage", "protocolMessage"];

// ═══════════════════════════════════════════════
// ENGINE: Min1AI (1min.ai) — GLM Thinking
// (owner 29 Sep: "aigrup pakai glm thinking pnya min1ai, jgn yg glm flash")
// Katalog GLM 1min.ai (verified live 29 Sep 2026): glm-5.3 = flagship
// reasoning/thinking (DEFAULT), glm-5.2, glm-5.1, glm-5.
// GAK ADA varian "-thinking"/"-flash" di 1min.ai (UNSUPPORTED_MODEL).
// ═══════════════════════════════════════════════
export const AIGROUP_DEFAULT_MODEL = "glm-5.3";
export const AIGROUP_GLM_MODELS = ["glm-5.3", "glm-5.2", "glm-5.1", "glm-5"];

export function resolveAigroupModel(raw) {
  const m = String(raw || "").trim();
  return AIGROUP_GLM_MODELS.includes(m) ? m : AIGROUP_DEFAULT_MODEL;
}

// ═══════════════════════════════════════════════
// State tracking
// ═══════════════════════════════════════════════
const groupCooldowns = new Map();       // groupId → last response time
const groupHourlyCount = new Map();      // groupId → array of timestamps
const lastBotMessage = new Map();        // groupId → timestamp of bot's last msg

// Clean old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of groupHourlyCount) {
    groupHourlyCount.set(key, val.filter((t) => now - t < 3600000));
    if (groupHourlyCount.get(key).length === 0) groupHourlyCount.delete(key);
  }
  for (const [key, val] of groupCooldowns) {
    if (now - val > 300000) groupCooldowns.delete(key);
  }
}, 300000);

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════
function shouldRespondToMessage(m, probability, isTaggedOrReplied) {
  // Kalau di-tag atau reply ke bot → selalu respon (tapi tetap rate-limited)
  if (isTaggedOrReplied) return true;

  const text = (m.text || "").trim();

  // Check ignore patterns
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.test(text)) return false;
  }

  // Respon kalau ada tanda tanya (pertanyaan) → probability lebih tinggi
  if (text.includes("?")) {
    return Math.random() < Math.min((probability / 100) * 1.5, 0.8);
  }

  // Random probability
  return Math.random() < (probability / 100);
}

function isIgnoredType(m) {
  if (!m.message) return true;
  for (const type of IGNORE_TYPES) {
    if (m.message[type]) return true;
  }
  return false;
}

function getHourlyCount(groupId) {
  const now = Date.now();
  let timestamps = groupHourlyCount.get(groupId) || [];
  timestamps = timestamps.filter((t) => now - t < 3600000);
  return timestamps.length;
}

function addHourlyCount(groupId) {
  const now = Date.now();
  let timestamps = groupHourlyCount.get(groupId) || [];
  timestamps = timestamps.filter((t) => now - t < 3600000);
  timestamps.push(now);
  groupHourlyCount.set(groupId, timestamps);
}

// ═══════════════════════════════════════════════
// Main handler
// ═══════════════════════════════════════════════
export async function handleAiGrup(m, sock, botNumber, jadibotCtx = {}) {
  try {
    const aigrup = resolveAigrupState(jadibotCtx);
    if (!aigrup) return false;
    if (!aigrup.enabled) return false;

    // ── Filter: tipe pesan ──
    if (isIgnoredType(m)) return false;

    // ── Filter: dari bot sendiri? skip ──
    if (m.fromMe) return false;

    // ── Cek apakah di-tag atau reply ke bot ──
    let isTaggedOrReplied = false;
    if (m.quoted && m.quoted.fromMe) isTaggedOrReplied = true;
    if (m.mentionedJid && m.mentionedJid.length > 0) {
      const botId = botNumber ? `${botNumber}@s.whatsapp.net` : sock.user?.id;
      if (m.mentionedJid.includes(botId)) isTaggedOrReplied = true;
    }

    // ── Cooldown (60s normal, 5s kalau di-tag) ──
    const lastTime = groupCooldowns.get(m.chat);
    const cdMs = isTaggedOrReplied ? COOLDOWN_TAG_MS : COOLDOWN_MS;
    if (lastTime && Date.now() - lastTime < cdMs) return false;

    // ── Rate limit: max 15 respon/jam/grup ──
    const hourlyCount = getHourlyCount(m.chat);
    if (hourlyCount >= MAX_RESPONSES_PER_HOUR) return false;

    // ── Cek probability ──
    const shouldRespond = shouldRespondToMessage(m, aigrup.probability || 20, isTaggedOrReplied);
    if (!shouldRespond) return false;

    // ── Filter: pesan terlalu pendek ──
    const userMessage = (m.text || "").trim();
    if (!userMessage || userMessage.length < MIN_MESSAGE_LENGTH) return false;

    // ═══ Resolve model GLM thinking (Min1AI) ═══
    // state lama era 9router (openai/deepseek/ag/*) → default glm-5.3
    const model = resolveAigroupModel(aigrup.model);

    const aiHelp = config.aiHelp || {};

    // ═══ System prompt dengan anti-spam instruction ═══
    const senderName = m.pushName || m.senderName || "seseorang";
    const systemPrompt = aiHelp.aigrupSystemPrompt ||
      `Kamu adalah teman dalam grup WhatsApp. Namamu Rara. ` +
      `Kamu sedang ikut nimbrung dalam percakapan grup. ` +
      `Jawab santai, singkat, dan natural seperti chat biasa. ` +
      `Jangan jawab terlalu panjang (maksimal 2-3 kalimat). ` +
      `Pakai bahasa gaul/sehari-hari. ` +
      `Boleh pakai emoji secukupnya, taruh di akhir kalimat saja. ` +
      `JANGAN mulai pesan dengan emoji. ` +
      `Jangan kaku. ` +
      `JANGAN mengaku sebagai AI/bot. Kamu teman biasa. ` +
      `JANGAN memulai percakapan. Hanya respon kalau ada yang relevan. ` +
      `JANGAN respon ke pesan yang tidak perlu balasan. ` +
      `Kalau pesan tidak menarik atau tidak perlu respon, balas kosong.`;

    // Min1AI gak support system message terpisah → jadiin satu prompt
    const fullPrompt = `${systemPrompt}\n\n${senderName}: ${userMessage}`;

    // Typing indicator
    await sock.sendPresenceUpdate("composing", m.chat);

    // Natural delay (semakin panjang semakin lama, max 2s)
    const delay = Math.min(userMessage.length * 12, 2000);
    await new Promise((r) => setTimeout(r, delay));

    // Call Min1AI (1min.ai) — GLM thinking
    let reply = await min1aiChat(fullPrompt, { model, timeoutMs: 60000 });

    // buang blok reasoning  · raw thinking leftover)
    reply = String(reply)
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/<answer>([\s\S]*?)<\/answer>/gi, "$1")
      .trim();

    // Filter empty/too short responses
    if (!reply || reply.length < 2) return false;

    // Filter responses that are just punctuation or filler
    const cleanReply = reply.trim();
    if (cleanReply.length < 3) return false;

    // Set cooldown & rate limit
    groupCooldowns.set(m.chat, Date.now());
    addHourlyCount(m.chat);

    // Kirim respon
    await sock.sendPresenceUpdate("paused", m.chat);
    await m.reply(cleanReply);
    return true;
  } catch (error) {
    console.error("[aigrup-handler]", error.message);
    return false;
  }
}

// ── Resolve state aigrup sesuai session ──
// Session jadibot: state per-nomor di DB jadibot (DEFAULT OFF — pasangan baru
// gak langsung nimbrung, harus .aigrup on di session itu dulu).
// Bot utama: state global di db.db.data.aigrup (perilaku lama, tidak berubah).
const SESSION_AIGRUP_DEFAULT = { enabled: false, probability: 10, format: "openai", model: "deepseek-v4-flash:free" };

export function resolveAigrupState(jadibotCtx = {}) {
  if (jadibotCtx.isJadibot && jadibotCtx.jadibotId) {
    const st = getJadibotSetting(jadibotCtx.jadibotId, "aigrup");
    return st && typeof st === "object" ? st : { ...SESSION_AIGRUP_DEFAULT };
  }
  const db = getDatabase();
  if (!db?.db?.data?.aigrup) return null;
  return db.db.data.aigrup;
}

export function isAiGrupEnabled(jadibotCtx = {}) {
  const st = resolveAigrupState(jadibotCtx);
  if (!st) return false;
  return st.enabled || false;
}
