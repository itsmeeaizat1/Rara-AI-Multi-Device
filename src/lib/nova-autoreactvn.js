// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { getDatabase } from "./nova-database.js";

const VN_DIR = path.join(process.cwd(), "assets", "vn");

// Cooldown maps
const chatCooldowns = new Map();
const userCooldowns = new Map();

const DEFAULT_PRIVATE_MS = 3000;
const DEFAULT_GROUP_MS = 10000;
const MIN_COOLDOWN_MS = 1000;

function ensureVnDir() {
  if (!fs.existsSync(VN_DIR)) {
    fs.mkdirSync(VN_DIR, { recursive: true });
  }
}

/**
 * Cek apakah auto react VN aktif (berlaku di PM dan grup)
 */
export function isAutoreactvnEnabled(m, sock) {
  try {
    const db = sock.db || getDatabase();
    if (!db) return false;
    return db.setting("autoreactvnEnabled") === true;
  } catch {
    return false;
  }
}

/**
 * Handle auto react VN — kirim VN saat trigger match
 * Berfungsi di PM dan grup, jeda berbeda per konteks
 */
export async function handleAutoreactvn(m, sock) {
  try {
    const db = sock.db || getDatabase();
    if (!db) return false;
    if (db.setting("autoreactvnEnabled") !== true) return false;

    const triggers = db.setting("autoreactvnTriggers") || [];
    if (triggers.length === 0) return false;

    // Ambil teks pesan
    let text = (m.body || m.text || "").trim().toLowerCase();
    if (!text) return false;

    // Cari trigger yang match
    let matched = null;
    for (const t of triggers) {
      if (!t.trigger || !t.vnFile) continue;
      const trig = t.trigger.toLowerCase().trim();
      if (text === trig || text.startsWith(trig + " ") || text.startsWith(trig + "!") || text.startsWith(trig + "?")) {
        matched = t;
        break;
      }
    }

    if (!matched) return false;

    // Jeda berbeda untuk grup vs private (tapi fitur tetap jalan di keduanya)
    const isGroup = m.isGroup || (m.chat && m.chat.endsWith("@g.us"));
    let cooldownMs;
    if (isGroup) {
      cooldownMs = db.setting("autoreactvnJedaGrup") ?? DEFAULT_GROUP_MS;
    } else {
      cooldownMs = db.setting("autoreactvnJedaPrivate") ?? DEFAULT_PRIVATE_MS;
    }

    if (cooldownMs < MIN_COOLDOWN_MS) {
      cooldownMs = MIN_COOLDOWN_MS;
    }

    const now = Date.now();
    const sender = m.sender || m.key?.participant || m.key?.remoteJid || "unknown";
    const chatId = m.chat || m.key?.remoteJid || "unknown";

    // Per-chat cooldown
    const lastChatReply = chatCooldowns.get(chatId) || 0;
    if (now - lastChatReply < cooldownMs) return false;

    // Per-user cooldown
    const userLastReply = userCooldowns.get(sender) || 0;
    if (now - userLastReply < cooldownMs) return false;

    // Cek file VN
    ensureVnDir();
    const vnPath = path.join(VN_DIR, matched.vnFile);
    if (!fs.existsSync(vnPath)) {
      console.log("[AutoReactVN] File tidak ditemukan:", vnPath);
      return false;
    }

    const buffer = fs.readFileSync(vnPath);
    if (!buffer || buffer.length === 0) return false;

    // Kirim VN
    await sock.sendMessage(
      m.chat,
      { audio: buffer, mimetype: "audio/mpeg", ptt: true },
      { quoted: m }
    );

    // Update cooldown
    chatCooldowns.set(chatId, now);
    userCooldowns.set(sender, now);

    // Cleanup
    if (chatCooldowns.size > 50) {
      for (const [key, ts] of chatCooldowns) {
        if (now - ts > 5 * 60 * 1000) chatCooldowns.delete(key);
      }
    }
    if (userCooldowns.size > 100) {
      for (const [key, ts] of userCooldowns) {
        if (now - ts > 5 * 60 * 1000) userCooldowns.delete(key);
      }
    }

    return true;
  } catch (e) {
    console.error("[AutoReactVN] Error:", e.message);
    return false;
  }
}
