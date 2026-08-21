// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import { toVoiceNote } from "../../src/lib/nova-ffmpeg.js";
import path from "path";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { pendingConfessions, cleanExpired } from "./confessmatch.js";
import { separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

// VN files (put files in assets/vn/)
const VN_DIR = path.join(process.cwd(), "assets", "audio");
const VN_TOLAK_JADIAN = "vn_tolak_jadian.mp3"; // VN saat jadian ditolak

const pluginConfig = {
  name: "tolakmatch",
  alias: ["tolakmatch"],
  category: "game",
  description: "Tolak confession jadian (pacaran)",
  usage: ".tolakmatch",
  example: ".tolakmatch",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const TOLAK_QUOTES = [
  "Maaf ya, gue nggak bisa. Bukan berarti lu nggak bagus, cuma perasaan gue belum nyampe situ.",
  "Gue hargai keberanian lu, tapi jawaban gue: belum bisa. Maaf.",
  "Lu terlalu baik buat gue, dan gue terlalu jujur buat pura-pura mau.",
  "Mungkin di waktu yang lain, kita bisa. Tapi bukan sekarang. Maaf ya.",
  "Gue nggak mau ngerasa kayak ngasih harapan palsu, jadi gue jujur aja: engga.",
  "Terima kasih udah berani nembak, tapi gue belum siap. Maaf.",
];

const TOLAK_DECOR = [
  "💔😔💔😔💔",
  "❌🚫❌🚫❌",
  "🖔😢🖔😢🖔",
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    cleanExpired();
    const confession = pendingConfessions.get(m.sender);

    if (!confession) {
      const text =
        claraWrap("Tidak Ada Confession", ["╎❏ Nggak ada yang nembak kamu saat ini",
          "╎❏ Atau confession sudah expired (5 menit)"].join("\n")) + "\n" +
        tipText("Sabar ya, jodong nggak kemana");

      await sendReplyWithNav(sock, m, text, "tolakmatch");
      return { handled: true };
    }

    const confessorJid = confession.confessor;
    const confessorName = confession.confessorName;
    const targetName = confession.targetName;

    pendingConfessions.delete(m.sender);

    const quote = TOLAK_QUOTES[Math.floor(Math.random() * TOLAK_QUOTES.length)];
    const decor = TOLAK_DECOR[Math.floor(Math.random() * TOLAK_DECOR.length)];
    const time = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

    let text = "";
    text += decor + "\n";
    text += "💔 *DITOLAK* 💔\n";
    text += decor + "\n\n";
    text += "“" + quote + "”\n\n";
    text += separator("─", 28) + "\n";
    text += "👤 Dari     : *" + confessorName + "*\n";
    text += "👥 Untuk    : *" + targetName + "*\n";
    text += "📅 Tanggal  : " + time + "\n";
    text += "🚫 Status   : *Ditolak*\n";
    text += separator("─", 28) + "\n\n";
    text += "💔 *" + targetName + "* nolak confession *" + confessorName + "*\n\n";
    text += decor + "\n";
    text += tipText("Jangan menyerah, jodong masih banyak!");

    await sock.sendMessage(m.chat, { text: text, mentions: [confessorJid, m.sender] });

    // Kirim VN (jika file ada)
    try {
      const vnPath = path.join(VN_DIR, VN_TOLAK_JADIAN);
      if (fs.existsSync(vnPath)) {
        const vnBuffer = fs.readFileSync(vnPath);
        await sock.sendMessage(m.chat, {
          audio: await toVoiceNote(vnBuffer),
          mimetype: "audio/ogg; codecs=opus",
          ptt: true,
        });
      }
    } catch (e) {
      console.log("[engga.js] VN error:", e.message);
    }

    return { handled: true };
  } catch (error) {
    await m.reply("Error: " + error.message);
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
