// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";

// VN files for romantic moments (put files in assets/vn/)
const VN_DIR = path.join(process.cwd(), "assets", "audio");
const VN_TEMBAK_V2 = "vn_tembak_v2.mp3"; // VN saat confess v2

const pluginConfig = {
  name: "jadianv2",
  alias: ["jadian2", "tembakv2", "confessv2"],
  category: "game",
  description: "Tembak seseorang buat jadian (V2 - versi enhanced)",
  usage: ".jadianv2 @member",
  example: ".jadianv2 @628xxxx",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 90,
  energi: 0,
  isEnabled: true,
};

const CONFESSION_TIMEOUT = 5 * 60 * 1000;
const pendingConfessionsV2 = new Map();

function cleanExpired() {
  const now = Date.now();
  for (const [key, data] of pendingConfessionsV2) {
    if (now - data.createdAt > CONFESSION_TIMEOUT) {
      pendingConfessionsV2.delete(key);
    }
  }
}

const CONFESSION_QUOTES_V2 = [
  "Aku nggak njanjikan bintang, tapi aku janji bakal tetap di samping kamu kapanpun.",
  "Kalau cinta itu pilihan, maka kamu adalah pilihan pertama dan terakhirku.",
  "Aku bukan pahlawan, tapi aku mau jadi alasan kamu ngerasa aman.",
  "Di dunia yang serba nggak pasti, satu hal yang aku yakin: aku suka kamu.",
  "Aku nggak cari yang sempurna, aku cuma cari kamu — karena kamu cukup buat aku.",
  "Tiap kali kamu tersenyum, aku ngerasa kayak menang lotere. Jadian sama aku?",
  "Aku nggak mau jadi kenangan, aku mau jadi masa depanmu. Mau nggak?",
  "Cinta itu bukan tentang menemukan orang yang sempurna, tapi melihat orang yang nggak sempurna dengan sempurna. Kamu itu buat aku.",
  "Aku pilih kamu bukan karena kamu yang terbaik, tapi karena kamu yang paling tepat buat aku.",
  "Kalau aku harus nembak lagi dari awal, aku tetap bakal pilih kamu. Mau jadi pacarku?",
];

const CONFESSION_DECOR_V2 = [
  "💫💝💫💝💫",
  "🌸💖🌸💖🌸",
  "✨💘✨💘✨",
  "🌹💗🌹💗🌹",
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const target = m.mentionedJid?.[0];

    if (!target) {
      const text =
        claraWrap("Cara Pakai", [
          "◦ Penggunaan: *" + prefix + "jadianv2 @member*",
          "◦ Contoh: *" + prefix + "jadianv2 @628xxxx*",
          "◦ Target harus ketik *" + prefix + "mauv2* untuk terima",
          "◦ Target harus ketik *" + prefix + "enggav2* untuk tolak",
        ].join("\n")) + "\n" +
        tipText("Tembak orang yang kamu suka (versi enhanced)!");

      await sendReplyWithNav(sock, m, text, "jadianv2");
      return { handled: true };
    }

    if (target === m.sender) {
      const text =
        claraWrap("Gabisa", [
          "◦ Nggak bisa jadian sama diri sendiri!",
        ].join("\n")) + "\n" +
        tipText("Tag orang lain, bukan diri sendiri");

      await sendReplyWithNav(sock, m, text, "jadianv2");
      return { handled: true };
    }

    const db = getDatabase();
    const user = db.getUser(m.sender);
    if (!user.rpg) user.rpg = {};

    // Check if already has a spouse
    if (user.rpg.spouse) {
      const partnerName = db.getUser(user.rpg.spouse)?.name || user.rpg.spouse;
      const text =
        claraWrap("Sudah Menikah", [
          "◦ Kamu sudah menikah dengan *" + partnerName + "*",
          "◦ Nggak bisa jadian lagi!",
        ].join("\n")) + "\n" +
        tipText("Ketik " + prefix + "divorce untuk cerai dulu");

      await sendReplyWithNav(sock, m, text, "jadianv2");
      return { handled: true };
    }

    // Check if already dating someone
    if (user.rpg.dating) {
      const partnerName = db.getUser(user.rpg.dating)?.name || user.rpg.dating;
      const text =
        claraWrap("Sudah Jadian", [
          "◦ Kamu sudah jadian dengan *" + partnerName + "*",
          "◦ Putus dulu dengan *" + prefix + "putus* baru bisa jadian lagi",
        ].join("\n")) + "\n" +
        tipText("Ketik " + prefix + "putus untuk putus");

      await sendReplyWithNav(sock, m, text, "jadianv2");
      return { handled: true };
    }

    // Check target status
    const targetUser = db.getUser(target);
    if (!targetUser.rpg) targetUser.rpg = {};

    if (targetUser.rpg.spouse) {
      const text =
        claraWrap("Maaf", [
          "◦ Target sudah menikah!",
        ].join("\n")) + "\n" +
        tipText("Cari pasangan lain");

      await sendReplyWithNav(sock, m, text, "jadianv2");
      return { handled: true };
    }

    if (targetUser.rpg.dating) {
      const text =
        claraWrap("Sudah Jadian", [
          "◦ Target sudah jadian dengan orang lain!",
        ].join("\n")) + "\n" +
        tipText("Cari pasangan lain");

      await sendReplyWithNav(sock, m, text, "jadianv2");
      return { handled: true };
    }

    // Check pending confession v2
    cleanExpired();
    const existing = pendingConfessionsV2.get(target);
    if (existing && existing.confessor !== m.sender) {
      const text =
        claraWrap("Sibuk", [
          "◦ Target lagi ditembak orang lain",
          "◦ Tunggu dia jawab dulu",
        ].join("\n")) + "\n" +
        tipText("Coba lagi nanti");

      await sendReplyWithNav(sock, m, text, "jadianv2");
      return { handled: true };
    }

    const confessorName = user.name || m.pushName || m.sender.split("@")[0];
    const targetName = targetUser.name || target.split("@")[0];

    pendingConfessionsV2.set(target, {
      confessor: m.sender,
      confessorName: confessorName,
      targetName: targetName,
      groupId: m.chat,
      createdAt: Date.now(),
    });

    setTimeout(() => {
      if (pendingConfessionsV2.get(target)?.confessor === m.sender) {
        pendingConfessionsV2.delete(target);
      }
    }, CONFESSION_TIMEOUT);

    // Romantic confession message v2
    const quote = CONFESSION_QUOTES_V2[Math.floor(Math.random() * CONFESSION_QUOTES_V2.length)];
    const decor = CONFESSION_DECOR_V2[Math.floor(Math.random() * CONFESSION_DECOR_V2.length)];
    const time = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let text = "";
    text += decor + "\n";
    text += "💫 *CONFESSION V2* 💫\n";
    text += decor + "\n\n";
    text += "“" + quote + "”\n\n";
    text += separator("─", 28) + "\n";
    text += "👤 Dari     : *" + confessorName + "*\n";
    text += "👥 Untuk    : *" + targetName + "*\n";
    text += "📅 Tanggal  : " + time + "\n";
    text += "💬 Status   : *Menunggu Jawaban...*\n";
    text += separator("─", 28) + "\n\n";
    text += "💫 *" + targetName + "*, " + confessorName + " nembak kamu (V2)!\n\n";
    text += "⏳ Kamu punya *5 menit* buat jawab:\n\n";
    text += "✅ Ketik *" + prefix + "mauv2* — Mau jadian!\n";
    text += "❌ Ketik *" + prefix + "enggav2* — Nggak mau\n\n";
    text += decor + "\n";
    text += tipText("Jangan buat dia deg-degan terlalu lama...");

    await sock.sendMessage(m.chat, {
      text: text,
      mentions: [m.sender, target],
    });

    // Kirim VN musik romantis (jika file ada)
    try {
      const vnPath = path.join(VN_DIR, VN_TEMBAK_V2);
      if (fs.existsSync(vnPath)) {
        const vnBuffer = fs.readFileSync(vnPath);
        await sock.sendMessage(m.chat, {
          audio: vnBuffer,
          mimetype: "audio/mpeg",
          ptt: true,
        });
      }
    } catch (e) {
      console.log("[jadianv2.js] VN error:", e.message);
    }

    return { handled: true };
  } catch (error) {
    await m.reply("Error: " + error.message);
    return { handled: true };
  }
}

export { pluginConfig as config, handler, pendingConfessionsV2, cleanExpired };
