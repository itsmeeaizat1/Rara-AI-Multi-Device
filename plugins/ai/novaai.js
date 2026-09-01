// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 AI AGENT PLUGIN — .novaai
// 🔹 Beda dari AI biasa: bisa EKSEKUSI aksi grup (tutup/buka/kick/promote/dll)
// 🔹 AI biasa (aichat/deepseek) hanya ngobrol, AI Agent bisa "ngerjain"
// 🔹 Alur: localParse (instan) → DeepSeek (fallback) → Pollinations → Groq
// ============================================================

import { TOOLS, localParse, think } from "../../src/lib/aiagent.js";

// 🔹 AI AGENT: penyimpanan konfirmasi aksi berbahaya (kick, dll)
const pending = new Map();

const pluginConfig = {
  name: "novaai",
  alias: ["novaai"],
  category: "ai",
  description: "AI Agent — ngatur fitur bot via bahasa natural (tutup grup, kick, promote, dll)",
  usage: ".novaai <perintah>",
  example: ".novaai tutup grup\n.novaai apa itu nodejs\n.novaai kick @user",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

// 🔹 AI AGENT: handler utama — menerima perintah bahasa natural
async function handler(m, { sock, conn, config }) {
  const text = m.args.join(" ");

  if (!text) {
    return m.reply(
      "╭─「 ✦ ɴᴏᴠᴀ ᴀɪ ✦ 」\n" +
      "│\n" +
      "│ 🧠 AI Agent bisa ngatur grup & jawab pertanyaan\n" +
      "│\n" +
      "│ 📌 Contoh perintah:\n" +
      "│ • .novaai tutup grup\n" +
      "│ • .novaai buka grup\n" +
      "│ • .novaai kick @user\n" +
      "│ • .novaai jadikan @user admin\n" +
      "│ • .novaai ganti nama jadi Ruang Belajar\n" +
      "│ • .novaai tag absen malam\n" +
      "│ • .novaai apa itu nodejs (ngobrol biasa)\n" +
      "│\n" +
      "╰────  •  ────"
    );
  }

  // React 🧠 untuk AI Agent
  try { await sock.sendMessage(m.chat, { react: { text: "🧠", key: m.key } }); } catch {}

  // TAHAP 1: parser lokal (instan, tanpa API)
  // 🔹 AI AGENT: cek pola sederhana dulu — tutup grup, buka grup, kick, dll
  let decision = localParse(text);

  // TAHAP 2: tidak match → tanya DeepSeek
  // 🔹 AI AGENT: kalimat rumit → lewat AI provider (deepseek → pollinations → groq)
  if (!decision) {
    try {
      decision = await think(text, {
        botname: config?.bot?.name || "Nova AI",
        mentions: (m.mentionedJid || []).map(j => j.split("@")[0]).join(", ")
      });
    } catch (e) {
      return m.reply(
        "╭─「 ✦ ɴᴏᴠᴀ ᴀɪ ✦ 」\n" +
        "│\n" +
        "│ ❌ Gagal ke otak AI: " + e.message + "\n" +
        "│\n" +
        "╰────  •  ────"
      );
    }
  }

  // ngobrol biasa, bukan perintah aksi
  // 🔹 AI AGENT: tool null = user cuma nanya/ngobrol → jawab langsung
  if (!decision?.tool || !TOOLS[decision.tool]) {
    return m.reply(decision?.reply || "❌ Tidak ada aksi yang cocok.");
  }

  const tool = TOOLS[decision.tool];

  // GERBANG IZIN — dicek di level KODE, bukan di level AI
  // 🔹 AI AGENT: cek admin/bot admin di kode, bukan di AI — AI tidak bisa bypass ini
  if (tool.perm === "admin") {
    if (!m.isGroup) return m.reply("❌ Perintah ini hanya bisa di dalam grup.");
    if (!m.isAdmin) return m.reply("❌ Kamu bukan admin, tidak bisa menjalankan ini.");
    if (!m.isBotAdmin) return m.reply("❌ Jadikan aku admin dulu supaya bisa menjalankan ini.");
  }

  // normalisasi user (dari @mention / reply)
  let finalArgs = decision.args || {};
  if (tool.args?.includes("user")) {
    let user = finalArgs.user;
    if (m.mentionedJid?.length) user = m.mentionedJid[0];
    else if (m.quoted?.sender) user = m.quoted.sender;
    user = String(user || "").replace(/[^0-9]/g, "");
    if (!user) return m.reply(
      "❌ Usernya siapa? Reply pesannya atau @mention.\n" +
      "Contoh: " + m.prefix + m.command + " kick @user"
    );
    finalArgs.user = user + "@s.whatsapp.net";
  }

  // aksi berbahaya → konfirmasi dulu (owner langsung jalan)
  // 🔹 AI AGENT: kick = danger → non-owner harus konfirmasi, owner langsung eksekusi
  if (tool.danger && !m.isOwner) {
    pending.set(m.sender + m.chat, { tool: decision.tool, args: finalArgs, time: Date.now() });
    const target = finalArgs.user ? "@" + finalArgs.user.split("@")[0] : "";
    return sock.sendMessage(m.chat, {
      text: "⚠️ Kamu yakin mau " + decision.tool + " " + target + "?\nBalas YA untuk lanjut, balas lain untuk batal. (60 detik)",
      mentions: finalArgs.user ? [finalArgs.user] : []
    }, { quoted: m });
  }

  // EKSEKUSI
  // 🔹 AI AGENT: jalankan tool — conn = sock (Baileys connection)
  try {
    await tool.run(sock, m, finalArgs);
    try { await sock.sendMessage(m.chat, { react: { text: "✅", key: m.key } }); } catch {}
    m.reply(decision.reply || tool.done);
  } catch (e) {
    try { await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } }); } catch {}
    m.reply("❌ Gagal eksekusi: " + e.message);
  }
}

// 🔹 AI AGENT: menangkap balasan konfirmasi (ya / batal) untuk aksi berbahaya
// 🔹 Dipanggil dari handler.js via before() hook — cek pending Map
export function novaaiConfirmHandler(m, sock) {
  const key = m.sender + m.chat;
  const p = pending.get(key);
  if (!p || !m.text) return false;
  pending.delete(key);
  if (Date.now() - p.time > 60000) return false; // kedaluwarsa

  if (/^(ya|y|yes|lanjut|gas)\b/i.test(m.text.trim())) {
    try {
      TOOLS[p.tool].run(sock, m, p.args);
      m.reply(TOOLS[p.tool].done);
    } catch (e) {
      m.reply("❌ Gagal: " + e.message);
    }
  } else {
    m.reply("❌ Dibatalkan.");
  }
  return true;
}

export { pluginConfig as config, handler };
