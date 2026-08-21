// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import { toVoiceNote } from "../../src/lib/nova-ffmpeg.js";
import path from "path";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { pendingConfessions, cleanExpired } from "./jadianmatch.js";
import { separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";

// VN files
const VN_DIR = path.join(process.cwd(), "assets", "audio");
const VN_MAU_JADIAN = "vn_mau_jadian.mp3";

const pluginConfig = {
  name: "terimajadian",
  alias: ["terimajadian", "acceptjadian"],
  category: "game",
  description: "Terima tembakan jadian (pacaran)",
  usage: ".terimajadian",
  example: ".terimajadian",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const ACCEPT_QUOTES = [
  "Gue mau! Dari sekian banyak orang, gue pilih lu buat bareng.",
  "Gue mau jadi alasan lu tersenyum, dan alasan lu balik lagi kalo lu sedih.",
  "Jujur, gue juga suka sama lu. Tinggal lu bilang aja, gue langsung mau.",
  "Gue nggak butuh waktu buat mikir, jawaban gue: mau, seratus persen mau.",
  "Dari semua yang datang, lu yang gue mau bawa pulang.",
  "Gue udah nunggu lu nembak dari tadi. Jawaban gue: mau, banget.",
];

const ACCEPT_DECOR = [
  "\u{1F495}\u{1F496}\u{1F495}\u{1F496}\u{1F495}",
  "\u2728\u{1F497}\u2728\u{1F497}\u2728",
  "\u{1F339}\u{1F49E}\u{1F339}\u{1F49E}\u{1F339}",
  "\u{1F4AB}\u{1F49D}\u{1F4AB}\u{1F49D}\u{1F4AB}",
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    cleanExpired();
    const confession = pendingConfessions.get(m.sender);

    if (!confession) {
      const text = claraWrap("Tidak Ada Confession", [
        "\u274F Nggak ada yang nembak kamu saat ini",
        "\u274F Atau confession sudah expired (5 menit)",
      ].join("\n")) + "\n" + tipText("Sabar ya, jodong nggak kemana");
      await sendReplyWithNav(sock, m, text, "terimajadian");
      return { handled: true };
    }

    const confessorJid = confession.confessor;
    const confessorName = confession.confessorName;
    const targetName = confession.targetName;

    const db = getDatabase();
    const confessorUser = db.getUser(confessorJid);
    if (!confessorUser.rpg) confessorUser.rpg = {};

    if (confessorUser.rpg.spouse) {
      pendingConfessions.delete(m.sender);
      const text = claraWrap("Maaf", [
        "\u274F Orang yang nembak kamu sudah menikah!",
        "\u274F Confession dibatalkan",
      ].join("\n")) + "\n" + tipText("Cari yang lain ya");
      await sendReplyWithNav(sock, m, text, "terimajadian");
      return { handled: true };
    }

    if (confessorUser.rpg.dating) {
      pendingConfessions.delete(m.sender);
      const text = claraWrap("Maaf", [
        "\u274F Orang yang nembak kamu sudah jadian!",
        "\u274F Confession dibatalkan",
      ].join("\n")) + "\n" + tipText("Cari yang lain ya");
      await sendReplyWithNav(sock, m, text, "terimajadian");
      return { handled: true };
    }

    pendingConfessions.delete(m.sender);

    const targetUser = db.getUser(m.sender);
    if (!targetUser.rpg) targetUser.rpg = {};

    confessorUser.rpg.dating = m.sender;
    targetUser.rpg.dating = confessorJid;

    const now = new Date().toISOString();
    confessorUser.rpg.datingAt = now;
    targetUser.rpg.datingAt = now;

    db.save();

    const quote = ACCEPT_QUOTES[Math.floor(Math.random() * ACCEPT_QUOTES.length)];
    const decor = ACCEPT_DECOR[Math.floor(Math.random() * ACCEPT_DECOR.length)];
    const time = new Date().toLocaleDateString("id-ID", {
      day: "numeric", month: "long", year: "numeric",
    });

    let text = "";
    text += decor + "\n";
    text += "\u{1F496} *DITERIMA* \u{1F496}\n";
    text += decor + "\n\n";
    text += "\u201C" + quote + "\u201D\n\n";
    text += separator("\u2500", 28) + "\n";
    text += "Dari     : *" + confessorName + "*\n";
    text += "Untuk    : *" + targetName + "*\n";
    text += "Tanggal  : " + time + "\n";
    text += "Status   : *Jadian!*\n";
    text += separator("\u2500", 28) + "\n\n";
    text += "*" + targetName + "* menerima confession *" + confessorName + "*\n";
    text += "Selamat! Kalian sekarang jadian!\n\n";
    text += decor + "\n";
    text += tipText("Ketik " + prefix + "putusmatch untuk putus");

    await sock.sendMessage(m.chat, {
      text: text,
      mentions: [confessorJid, m.sender],
    });

    try {
      const vnPath = path.join(VN_DIR, VN_MAU_JADIAN);
      if (fs.existsSync(vnPath)) {
        const vnBuffer = fs.readFileSync(vnPath);
        await sock.sendMessage(m.chat, {
          audio: await toVoiceNote(vnBuffer), mimetype: "audio/ogg; codecs=opus", ptt: true,
        });
      }
    } catch (e) {
      console.log("[terimajadian.js] VN error:", e.message);
    }

    return { handled: true };
  } catch (error) {
    await m.reply("Error: " + error.message);
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
