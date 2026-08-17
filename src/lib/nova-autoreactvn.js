// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { getDatabase } from "./nova-database.js";
import { callAI } from "./nova-ai-service.js";
import config from "../../config.js";

const VN_DIR = path.join(process.cwd(), "assets", "vn");
const TEMP_DIR = path.join(process.cwd(), "temp");

// Cooldown maps
const chatCooldowns = new Map();
const userCooldowns = new Map();

// Cache: vn file path -> opus path (sudah dikonversi)
const opusCache = new Map();

const DEFAULT_PRIVATE_MS = 3000;
const DEFAULT_GROUP_MS = 10000;
const MIN_COOLDOWN_MS = 1000;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Convert MP3 ke OGG/Opus untuk PTT WhatsApp
 * Hasil di-cache biar gak convert ulang setiap kali
 */
async function ensureOpus(mp3Path) {
  // Cek cache dulu
  if (opusCache.has(mp3Path)) {
    const cached = opusCache.get(mp3Path);
    if (fs.existsSync(cached)) return cached;
    opusCache.delete(mp3Path);
  }

  ensureDir(TEMP_DIR);

  // Nama file output berdasarkan input
  const basename = path.basename(mp3Path, path.extname(mp3Path));
  const opusPath = path.join(TEMP_DIR, `vn_${basename}.ogg`);

  // Kalau opus sudah ada dan lebih baru dari mp3, skip convert
  if (fs.existsSync(opusPath) && fs.statSync(opusPath).mtimeMs > fs.statSync(mp3Path).mtimeMs) {
    opusCache.set(mp3Path, opusPath);
    return opusPath;
  }

  // Convert MP3 -> OGG/Opus dengan FFmpeg
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y", "-i", mp3Path,
      "-c:a", "libopus",
      "-b:a", "64k",
      "-vbr", "on",
      "-application", "voip",
      "-ar", "48000",
      opusPath,
    ]);

    let stderr = "";
    ffmpeg.stderr.on("data", (d) => { stderr += d.toString(); });

    ffmpeg.on("close", (code) => {
      if (code === 0 && fs.existsSync(opusPath)) {
        opusCache.set(mp3Path, opusPath);
        resolve(opusPath);
      } else {
        console.error("[AutoReactVN] FFmpeg gagal:", code, stderr.slice(-200));
        reject(new Error(`FFmpeg error: ${code}`));
      }
    });

    ffmpeg.on("error", (err) => {
      console.error("[AutoReactVN] FFmpeg spawn error:", err.message);
      reject(err);
    });
  });
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

    let triggers = db.setting("autoreactvnTriggers") || [];

    // Self-heal: kalau udah aktif tapi triggers masih kosong (misal diaktifkan
    // sebelum update ini ada), auto-seed pakai VN yang udah tersedia di assets/vn/
    if (triggers.length === 0) {
      const defaultMap = [
        { file: "vn_hai_hai_juga.mp3", words: ["hai", "halo", "hallo", "hi"] },
        { file: "vn_masa_sih_kak.mp3", words: ["masa sih", "yakin", "serius", "beneran", "emang"] },
        { file: "vn_daftar_dulu_kak.mp3", words: ["daftar", "cara daftar", "gimana daftar"] },
      ];
      for (const entry of defaultMap) {
        const vnPath = path.join(VN_DIR, entry.file);
        if (!fs.existsSync(vnPath)) continue;
        const size = fs.statSync(vnPath).size;
        for (const word of entry.words) {
          triggers.push({ trigger: word, vnFile: entry.file, size });
        }
      }
      if (triggers.length > 0) {
        db.setting("autoreactvnTriggers", triggers);
        db.save().catch(() => {});
      }
    }

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
    ensureDir(VN_DIR);
    const vnPath = path.join(VN_DIR, matched.vnFile);
    if (!fs.existsSync(vnPath)) {
      console.log("[AutoReactVN] File tidak ditemukan:", vnPath, "— fallback ke AI");

      // AUTO-CLEANUP: hapus trigger yang filenya udah gak ada
      const updatedTriggers = triggers.filter(t => t.vnFile !== matched.vnFile);
      if (updatedTriggers.length !== triggers.length) {
        db.setting("autoreactvnTriggers", updatedTriggers);
        db.save().catch(() => {});
        console.log("[AutoReactVN] Trigger orphan dihapus:", matched.trigger, "->", matched.vnFile);
      }

      // Fallback ke AI: balas pakai AI chat
      try {
        const aiConfig = config.aiHelp || {};
        const aiReply = await callAI({
          providerKey: "openai",
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Kamu adalah Nova, anak kecil berusia 5 tahun yang lucu, ceria, dan polos. Kamu menjawab dengan bahasa anak kecil yang imut, pakai kata 'aku', 'kak', 'hehe'. Jawaban singkat, lucu, penuh semangat. Kadang pakai emoji lucu. Contoh: 'Hai kak! Aku Nova! Hehe kakak ngomong apa tadi? Aku gak ngerti tapi aku mau main sama kakak! 🥳'" },
            { role: "user", content: text },
          ],
          apiKey: aiConfig.apiKey,
          apiEndpoint: aiConfig.apiEndpoint,
        });

        if (aiReply && aiReply.trim()) {
          await sock.sendMessage(m.chat, { text: aiReply.slice(0, 1500) }, { quoted: m });
          console.log("[AutoReactVN] AI fallback terkirim untuk trigger:", matched.trigger);
        }
      } catch (aiErr) {
        console.error("[AutoReactVN] AI fallback gagal:", aiErr.message);
      }

      // Update cooldown walaupun fallback (biar gak spam AI)
      chatCooldowns.set(chatId, now);
      userCooldowns.set(sender, now);

      return true;
    }

    const buffer = fs.readFileSync(vnPath);
    if (!buffer || buffer.length === 0) {
      console.log("[AutoReactVN] File kosong/corrupt:", vnPath, "— fallback ke AI");

      // Fallback ke AI juga kalau file corrupt
      try {
        const aiConfig = config.aiHelp || {};
        const aiReply = await callAI({
          providerKey: "openai",
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Kamu adalah Nova, anak kecil berusia 5 tahun yang lucu, ceria, dan polos. Kamu menjawab dengan bahasa anak kecil yang imut, pakai kata 'aku', 'kak', 'hehe'. Jawaban singkat, lucu, penuh semangat. Kadang pakai emoji lucu. Contoh: 'Hai kak! Aku Nova! Hehe kakak ngomong apa tadi? Aku gak ngerti tapi aku mau main sama kakak! 🥳'" },
            { role: "user", content: text },
          ],
          apiKey: aiConfig.apiKey,
          apiEndpoint: aiConfig.apiEndpoint,
        });

        if (aiReply && aiReply.trim()) {
          await sock.sendMessage(m.chat, { text: aiReply.slice(0, 1500) }, { quoted: m });
        }
      } catch (aiErr) {
        console.error("[AutoReactVN] AI fallback gagal:", aiErr.message);
      }

      chatCooldowns.set(chatId, now);
      userCooldowns.set(sender, now);
      return true;
    }

    // Kirim VN — convert ke OGG/Opus dulu untuk PTT
    try {
      const opusPath = await ensureOpus(vnPath);
      const opusBuffer = fs.readFileSync(opusPath);
      await sock.sendMessage(
        m.chat,
        { audio: opusBuffer, mimetype: "audio/ogg; codecs=opus", ptt: true },
        { quoted: m }
      );
    } catch (convertErr) {
      // Fallback: kirim MP3 sebagai audio biasa (bukan PTT)
      console.warn("[AutoReactVN] Convert gagal, kirim MP3 langsung:", convertErr.message);
      await sock.sendMessage(
        m.chat,
        { audio: buffer, mimetype: "audio/mpeg", ptt: false },
        { quoted: m }
      );
    }

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
