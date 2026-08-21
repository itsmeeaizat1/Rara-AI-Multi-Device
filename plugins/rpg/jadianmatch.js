// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

// VN files for romantic moments (put files in assets/vn/)
const VN_DIR = path.join(process.cwd(), "assets", "audio");
const VN_TEMBAK = "vn_tembak_romantis.mp3"; // VN saat confess/nembak

const pluginConfig = {
  name: "jadianmatch",
  alias: ["jadianmatch"],
  category: "game",
  description: "Tembak seseorang buat jadian pacar",
  usage: ".jadianmatch @member",
  example: ".jadianmatch @628xxxx",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 60,
  energi: 0,
  isEnabled: true,
};

const CONFESSION_TIMEOUT = 5 * 60 * 1000;
const pendingConfessions = new Map();

function cleanExpired() {
  const now = Date.now();
  for (const [key, data] of pendingConfessions) {
    if (now - data.createdAt > CONFESSION_TIMEOUT) {
      pendingConfessions.delete(key);
    }
  }
}

const CONFESSION_QUOTES = [
  "Gue nggak jago bikin kalimat romantis, tapi gue jago niat buat dapetin lu.",
  "Lu itu alasan kenapa gue senyum-senyum sendiri kayaking orang gila.",
  "Gue udah coba bikin kalimat bagus buat nembak lu, tapi yang keluar cuma: mau nggak sama gue?",
  "Dari sekadar chat, gue mau lebih dari itu. Mau nggak jadi pacar gue?",
  "Gue nggak punya kata-kata keramat, gue cuma punya perasaan yang buat gue berani nembak lu sekarang.",
  "Lu bukan tipe gue, lu lebih dari itu. Lu tipe yang gue mau bawa pulang.",
  "Gue sadar tiap lu muncul, dunia gue jadi lebih ribet tapi lebih indah. Jadian yuk?",
  "Nggak semua berani bilang ini, tapi gue berani: gue suka sama lu. Mau nggak?",
  "Gue bukan tipe orang yang nembak dulu, tapi buat lu, gue mau jadi pengecualian.",
  "Tiap ketemu lu, gue cuma bisa mikir satu hal: gimana caranya biar lu jadi milik gue.",
];

const CONFESSION_DECOR = [
  "🌸💕🌸💕🌸",
  "✨💗✨💗✨",
  "🌹💕🌹💕🌹",
  "💫💎💫💎💫",
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const target = m.mentionedJid?.[0];

    if (!target) {
      const text =
        claraWrap("Cara Pakai", ["◦ Penggunaan: *" + prefix + "jadian @member*",
          "◦ Contoh: *" + prefix + "jadian @628xxxx*",
          "❏ Target harus ketik *" + prefix + "terimajadian* untuk terima, .tolakjadian* untuk tolak"].join("\n")) +
        "\n" +
        tipText("Tembak orang yang kamu suka!");

      await sendReplyWithNav(sock, m, text, "jadian");
      return { handled: true };
    }

    if (target === m.sender) {
      const text =
        claraWrap("Gabisa", ["◦ Nggak bisa jadian sama diri sendiri!"].join("\n")) +
        "\n" +
        tipText("Tag orang lain, bukan diri sendiri");

      await sendReplyWithNav(sock, m, text, "jadian");
      return { handled: true };
    }

    const db = getDatabase();
    const user = db.getUser(m.sender);
    if (!user.rpg) user.rpg = {};

    // Check if already has a partner
    if (user.rpg.spouse) {
      const partnerName = db.getUser(user.rpg.spouse)?.name || user.rpg.spouse;
      const text =
        claraWrap("Sudah Menikah", ["◦ Kamu sudah menikah dengan *" + partnerName + "*",
          "◦ Nggak bisa jadian lagi!"].join("\n")) +
        "\n" +
        tipText("Ketik " + prefix + "putusmatch untuk cerai dulu");

      await sendReplyWithNav(sock, m, text, "jadian");
      return { handled: true };
    }

    // Check if already dating someone
    if (user.rpg.dating) {
      const partnerName = db.getUser(user.rpg.dating)?.name || user.rpg.dating;
      const text =
        claraWrap("Sudah Jadian", ["◦ Kamu sudah jadian dengan *" + partnerName + "*",
          "❏ Putus dulu dengan *" + prefix + "putusmatch* baru bisa jadian lagi"].join("\n")) +
        "\n" +
        tipText("Ketik " + prefix + "putusmatch untuk putus");

      await sendReplyWithNav(sock, m, text, "jadian");
      return { handled: true };
    }

    // Check target status
    const targetUser = db.getUser(target);
    if (!targetUser.rpg) targetUser.rpg = {};

    if (targetUser.rpg.spouse) {
      const text =
        claraWrap("Maaf", ["❏ Target sudah menikah!"].join("\n")) +
        "\n" +
        tipText("Cari pasangan lain");

      await sendReplyWithNav(sock, m, text, "jadian");
      return { handled: true };
    }

    if (targetUser.rpg.dating) {
      const text =
        claraWrap("Sudah Jadian", ["❏ Target sudah jadian dengan orang lain!"].join("\n")) +
        "\n" +
        tipText("Cari pasangan lain");

      await sendReplyWithNav(sock, m, text, "jadian");
      return { handled: true };
    }

    // Check pending confession
    cleanExpired();
    const existing = pendingConfessions.get(target);
    if (existing && existing.confessor !== m.sender) {
      const text =
        claraWrap("Sibuk", ["❏ Target lagi ditembak orang lain",
          "◦ Tunggu dia jawab dulu"].join("\n")) +
        "\n" +
        tipText("Coba lagi nanti");

      await sendReplyWithNav(sock, m, text, "jadian");
      return { handled: true };
    }

    const confessorName = user.name || m.pushName || m.sender.split("@")[0];
    const targetName = targetUser.name || target.split("@")[0];

    pendingConfessions.set(target, {
      confessor: m.sender,
      confessorName: confessorName,
      targetName: targetName,
      groupId: m.chat,
      createdAt: Date.now(),
    });

    setTimeout(() => {
      if (pendingConfessions.get(target)?.confessor === m.sender) {
        pendingConfessions.delete(target);
      }
    }, CONFESSION_TIMEOUT);

    // Romantic confession message
    const quote = CONFESSION_QUOTES[Math.floor(Math.random() * CONFESSION_QUOTES.length)];
    const decor = CONFESSION_DECOR[Math.floor(Math.random() * CONFESSION_DECOR.length)];
    const time = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let text = "";
    text += decor + "\n";
    text += "💕 *CONFESSION* 💕\n";
    text += decor + "\n\n";
    text += "“" + quote + "”\n\n";
    text += separator("─", 28) + "\n";
    text += "👤 Dari     : *" + confessorName + "*\n";
    text += "👥 Untuk    : *" + targetName + "*\n";
    text += "📅 Tanggal  : " + time + "\n";
    text += "💬 Status   : *Menunggu Jawaban...*\n";
    text += separator("─", 28) + "\n\n";
    text += "💕 *" + targetName + "*, " + confessorName + " nembak kamu!\n\n";
    text += "⏳ Kamu punya *5 menit* buat jawab:\n\n";
    text += "✅ Ketik *" + prefix + "terimajadian* — Mau jadian!\n";
    text += "❌ Ketik *" + prefix + "tolakjadian* — Nggak mau\n\n";
    text += decor + "\n";
    text += tipText("Jangan buat dia deg-degan terlalu lama...");

    await sock.sendMessage(m.chat, {
      text: text,
      mentions: [m.sender, target],
    });

    // Kirim VN musik romantis (jika file ada)
    try {
      const vnPath = path.join(VN_DIR, VN_TEMBAK);
      if (fs.existsSync(vnPath)) {
        const vnBuffer = fs.readFileSync(vnPath);
        await sock.sendMessage(m.chat, {
          audio: vnBuffer,
          mimetype: "audio/mpeg",
          ptt: true,
        });
      }
    } catch (e) {
      console.log("[jadian.js] VN error:", e.message);
    }

    return { handled: true };
  } catch (error) {
    await m.reply("Error: " + error.message);
    return { handled: true };
  }
}

export { pluginConfig as config, handler, pendingConfessions, cleanExpired };
