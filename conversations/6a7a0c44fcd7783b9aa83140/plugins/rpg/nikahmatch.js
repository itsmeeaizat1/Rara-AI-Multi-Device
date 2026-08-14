// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";

// VN files for romantic moments (put files in assets/vn/)
const VN_DIR = path.join(process.cwd(), "assets", "audio");
const VN_LAMAR = "vn_lamar_romantis.mp3"; // VN saat melamar

const pluginConfig = {
  name: "nikahmatch",
  alias: ["nikahmatch"],
  category: "game",
  description: "Lamar nikah player lain di grup",
  usage: ".nikahmatch @member",
  example: ".nikahmatch @628xxxx",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 60,
  energi: 0,
  isEnabled: true,
};

const PROPOSAL_TIMEOUT = 5 * 60 * 1000;
const pendingProposals = new Map();

function cleanExpired() {
  const now = Date.now();
  for (const [key, data] of pendingProposals) {
    if (now - data.createdAt > PROPOSAL_TIMEOUT) {
      pendingProposals.delete(key);
    }
  }
}

const PROPOSAL_QUOTES = [
  "Aku nggak njanjikan bintang, tapi aku janji bakal tetap di samping kamu.",
  "Kalau cinta itu pilihan, maka kamu adalah pilihan pertama dan terakhirku.",
  "Aku bukan pahlawan, tapi aku mau jadi alasan kamu ngerasa aman.",
  "Di dunia yang serba nggak pasti, satu hal yang aku yakin: aku mau nikah sama kamu.",
  "Aku nggak cari yang sempurna, aku cuma cari kamu — karena kamu cukup buat aku.",
  "Mau nggak jadi tempat pulang aku buat selamanya?",
  "Aku pilih kamu bukan karena kamu yang terbaik, tapi karena kamu yang paling tepat buat aku.",
  "Kalau aku harus melamar lagi dari awal, aku tetap bakal pilih kamu. Mau nikah sama aku?",
];

const PROPOSAL_DECOR = [
  "💍💎💍💎💍",
  "✨💖✨💖✨",
  "🌹💕🌹💕🌹",
  "💫💝💫💝💫",
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const target = m.mentionedJid?.[0];

    if (!target) {
      const text =
        claraWrap("Cara Pakai", [
          "◦ Penggunaan: *" + prefix + "nikah @member*",
          "◦ Contoh: *" + prefix + "nikah @628xxxx*",
          "◦ Target harus ketik *" + prefix + "terimanikahmatch* untuk terima",
          "◦ Target harus ketik *" + prefix + "tolaknikahmatch* untuk tolak",
        ].join("\n")) + "\n" +
        tipText("Lamar orang yang kamu cintai!");

      await sendReplyWithNav(sock, m, text, "nikah");
      return { handled: true };
    }

    if (target === m.sender) {
      const text =
        claraWrap("Gabisa", [
          "◦ Nggak bisa nikah sama diri sendiri!",
        ].join("\n")) + "\n" +
        tipText("Tag orang lain, bukan diri sendiri");

      await sendReplyWithNav(sock, m, text, "nikah");
      return { handled: true };
    }

    const db = getDatabase();
    const user = db.getUser(m.sender);
    if (!user.rpg) user.rpg = {};

    // Check if already married
    if (user.rpg.spouse) {
      const partnerName = db.getUser(user.rpg.spouse)?.name || user.rpg.spouse;
      const text =
        claraWrap("Sudah Menikah", [
          "◦ Kamu sudah menikah dengan *" + partnerName + "*",
          "◦ Nggak bisa nikah lagi!",
        ].join("\n")) + "\n" +
        tipText("Ketik " + prefix + "divorce untuk cerai dulu");

      await sendReplyWithNav(sock, m, text, "nikah");
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

      await sendReplyWithNav(sock, m, text, "nikah");
      return { handled: true };
    }

    // Check pending proposal
    cleanExpired();
    const existing = pendingProposals.get(target);
    if (existing && existing.proposer !== m.sender) {
      const text =
        claraWrap("Sibuk", [
          "◦ Target lagi dilamar orang lain",
          "◦ Tunggu dia jawab dulu",
        ].join("\n")) + "\n" +
        tipText("Coba lagi nanti");

      await sendReplyWithNav(sock, m, text, "nikah");
      return { handled: true };
    }

    const proposerName = user.name || m.pushName || m.sender.split("@")[0];
    const targetName = targetUser.name || target.split("@")[0];

    pendingProposals.set(target, {
      proposer: m.sender,
      proposerName: proposerName,
      targetName: targetName,
      groupId: m.chat,
      createdAt: Date.now(),
    });

    setTimeout(() => {
      if (pendingProposals.get(target)?.proposer === m.sender) {
        pendingProposals.delete(target);
      }
    }, PROPOSAL_TIMEOUT);

    // Romantic proposal message
    const quote = PROPOSAL_QUOTES[Math.floor(Math.random() * PROPOSAL_QUOTES.length)];
    const decor = PROPOSAL_DECOR[Math.floor(Math.random() * PROPOSAL_DECOR.length)];
    const time = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let text = "";
    text += decor + "\n";
    text += "💍 *LAMARAN NIKAH* 💍\n";
    text += decor + "\n\n";
    text += "“" + quote + "”\n\n";
    text += separator("─", 28) + "\n";
    text += "👤 Dari     : *" + proposerName + "*\n";
    text += "👥 Untuk    : *" + targetName + "*\n";
    text += "📅 Tanggal  : " + time + "\n";
    text += "💬 Status   : *Menunggu Jawaban...*\n";
    text += separator("─", 28) + "\n\n";
    text += "💍 *" + targetName + "*, " + proposerName + " melamar kamu!\n\n";
    text += "⏳ Kamu punya *5 menit* buat jawab:\n\n";
    text += "✅ Ketik *" + prefix + "terimanikahmatch* — Mau nikah!\n";
    text += "❌ Ketik *" + prefix + "tolaknikahmatch* — Nggak mau\n\n";
    text += decor + "\n";
    text += tipText("Jangan buat dia deg-degan terlalu lama...");

    await sock.sendMessage(m.chat, {
      text: text,
      mentions: [m.sender, target],
    });

    // Kirim VN musik romantis (jika file ada)
    try {
      const vnPath = path.join(VN_DIR, VN_LAMAR);
      if (fs.existsSync(vnPath)) {
        const vnBuffer = fs.readFileSync(vnPath);
        await sock.sendMessage(m.chat, {
          audio: vnBuffer,
          mimetype: "audio/mpeg",
          ptt: true,
        });
      }
    } catch (e) {
      console.log("[nikah.js] VN error:", e.message);
    }

    return { handled: true };
  } catch (error) {
    await m.reply("Error: " + error.message);
    return { handled: true };
  }
}

export { pluginConfig as config, handler, pendingProposals, cleanExpired };
