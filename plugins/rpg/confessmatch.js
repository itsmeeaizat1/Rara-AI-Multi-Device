// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";

// VN files
const VN_DIR = path.join(process.cwd(), "assets", "audio");
const VN_TEMBAK = "vn_tembak_romantis.mp3";

const CONFESSION_TIMEOUT = 5 * 60 * 1000;
const pendingConfessions = new Map();

function cleanExpired() {
  const now = Date.now();
  for (const [key, val] of pendingConfessions) {
    if (now - val.createdAt > CONFESSION_TIMEOUT) {
      pendingConfessions.delete(key);
    }
  }
}

const pluginConfig = {
  name: "confessmatch",
  alias: ["confessmatch"],
  category: "game",
  description: "Confess ke seseorang di grup (RPG)",
  usage: ".confessmatch @member",
  example: ".confessmatch @628xxxx",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 60,
  energi: 0,
  isEnabled: true,
};

const CONFESSION_QUOTES = [
  "Gue suka sama lu dari lama, cuma gue baru berani ngomong sekarang.",
  "Lu itu alasan gue semangat masuk grup tiap hari.",
  "Gue nggak mau ngeyak, tapi gue mau jadian sama lu.",
  "Dari semua orang di grup ini, lu yang bikin gue deg-degan.",
  "Gue suka lu, bukan karena lu canteng, tapi karena lu bikin gue ngerasa spesial.",
  "Lu tau nggak? Setiap kali lu chat, gue ngerasa kayak udah menang lottery.",
];

const CONFESSION_DECOR = [
  "\u{1F495}\u2728\u{1F495}\u2728\u{1F495}",
  "\u{1F495}\u{1F339}\u{1F495}\u{1F339}\u{1F495}",
  "\u{1F49D}\u{1F4AB}\u{1F49D}\u{1F4AB}\u{1F49D}",
  "\u{1F49D}\u{1F305}\u{1F49D}\u{1F305}\u{1F49D}",
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const target = m.mentionedJid?.[0];

    if (!target) {
      const text =
        claraWrap("Cara Pakai", ["\u274F Penggunaan: *" + prefix + "confessmatch @member*",
          "\u274F Contoh: *" + prefix + "confessmatch @628xxxx*",
          "\u274F Target harus ketik *" + prefix + "terimamatch* untuk terima, .tolakmatch* untuk tolak"].join("\n")) +
        "\n" +
        tipText("Confess ke orang yang kamu suka!");

      await sendReplyWithNav(sock, m, text, "confessmatch");
      return { handled: true };
    }

    if (target === m.sender) {
      const text =
        claraWrap("Gabisa", ["\u274F Nggak bisa confess sama diri sendiri!"].join("\n")) +
        "\n" +
        tipText("Tag orang lain, bukan diri sendiri");

      await sendReplyWithNav(sock, m, text, "confessmatch");
      return { handled: true };
    }

    const db = getDatabase();
    const user = db.getUser(m.sender);
    if (!user.rpg) user.rpg = {};

    if (user.rpg.spouse) {
      const text =
        claraWrap("Sudah Menikah", ["\u274F Kamu sudah menikah!",
          "\u274F Nggak bisa confess lagi!"].join("\n")) +
        "\n" +
        tipText("Ketik " + prefix + "putusmatch untuk cerai dulu");

      await sendReplyWithNav(sock, m, text, "confessmatch");
      return { handled: true };
    }

    if (user.rpg.dating) {
      const partnerName = db.getUser(user.rpg.dating)?.name || user.rpg.dating;
      const text =
        claraWrap("Sudah Jadian", ["\u274F Kamu sudah jadian dengan *" + partnerName + "*",
          "\u274F Putus dulu dengan *" + prefix + "putusmatch* baru bisa confess lagi"].join("\n")) +
        "\n" +
        tipText("Ketik " + prefix + "putusmatch untuk putus");

      await sendReplyWithNav(sock, m, text, "confessmatch");
      return { handled: true };
    }

    const targetUser = db.getUser(target);
    if (!targetUser.rpg) targetUser.rpg = {};

    if (targetUser.rpg.spouse) {
      const text =
        claraWrap("Maaf", ["\u274F Target sudah menikah!"].join("\n")) +
        "\n" +
        tipText("Cari pasangan lain");

      await sendReplyWithNav(sock, m, text, "confessmatch");
      return { handled: true };
    }

    if (targetUser.rpg.dating) {
      const text =
        claraWrap("Sudah Jadian", ["\u274F Target sudah jadian dengan orang lain!"].join("\n")) +
        "\n" +
        tipText("Cari pasangan lain");

      await sendReplyWithNav(sock, m, text, "confessmatch");
      return { handled: true };
    }

    cleanExpired();
    const existing = pendingConfessions.get(target);
    if (existing && existing.confessor !== m.sender) {
      const text =
        claraWrap("Sibuk", ["\u274F Target lagi diconfess orang lain",
          "\u274F Tunggu dia jawab dulu"].join("\n")) +
        "\n" +
        tipText("Coba lagi nanti");

      await sendReplyWithNav(sock, m, text, "confessmatch");
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

    const quote = CONFESSION_QUOTES[Math.floor(Math.random() * CONFESSION_QUOTES.length)];
    const decor = CONFESSION_DECOR[Math.floor(Math.random() * CONFESSION_DECOR.length)];
    const time = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let text = "";
    text += decor + "\n";
    text += "\u{1F495} *CONFESSION* \u{1F495}\n";
    text += decor + "\n\n";
    text += "\u201C" + quote + "\u201D\n\n";
    text += separator("\u2500", 28) + "\n";
    text += "\u{1F464} Dari     : *" + confessorName + "*\n";
    text += "\u{1F465} Untuk    : *" + targetName + "*\n";
    text += "\u{1F4C5} Tanggal  : " + time + "\n";
    text += "\u{1F4AC} Status   : *Menunggu Jawaban...*\n";
    text += separator("\u2500", 28) + "\n\n";
    text += "\u{1F495} *" + targetName + "*, " + confessorName + " confess ke kamu!\n\n";
    text += "\u23F3 Kamu punya *5 menit* buat jawab:\n\n";
    text += "\u2705 Ketik *" + prefix + "terimamatch* — Mau jadian!\n";
    text += "\u274C Ketik *" + prefix + "tolakmatch* — Nggak mau\n\n";
    text += decor + "\n";
    text += tipText("Jangan buat dia deg-degan terlalu lama...");

    await sock.sendMessage(m.chat, {
      text: text,
      mentions: [m.sender, target],
    });

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
      console.log("[confessmatch.js] VN error:", e.message);
    }

    return { handled: true };
  } catch (error) {
    await m.reply("Error: " + error.message);
    return { handled: true };
  }
}

export { pluginConfig as config, handler, pendingConfessions, cleanExpired };
