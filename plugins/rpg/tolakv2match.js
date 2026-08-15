// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { pendingConfessionsV2, cleanExpired } from "./jadianv2match.js";
import { separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";

// VN files (put files in assets/vn/)
const VN_DIR = path.join(process.cwd(), "assets", "audio");
const VN_TOLAK_V2 = "vn_tolak_v2.mp3"; // VN saat jadian v2 ditolak

const pluginConfig = {
  name: "tolakv2match",
  alias: ["tolakv2match"],
  category: "game",
  description: "Tolak confession jadian V2 (pacaran)",
  usage: ".tolakv2match",
  example: ".tolakv2match",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const TOLAK_QUOTES_V2 = [
  "Maaf ya, aku nggak bisa. Bukan berarti kamu nggak bagus, cuma perasaan aku belum nyampe situ.",
  "Aku hargai keberanian kamu, tapi jawaban aku: belum bisa. Maaf.",
  "Kamu terlalu baik buat aku, dan aku terlalu jujur buat pura-pura mau.",
  "Mungkin di waktu yang lain, kita bisa. Tapi bukan sekarang. Maaf ya.",
  "Aku nggak mau ngerasa kayak ngasih harapan palsu, jadi aku jujur aja: engga.",
  "Terima kasih udah berani nembak, tapi aku belum siap. Maaf.",
];

const TOLAK_DECOR_V2 = [
  "💔😔💔😔💔",
  "❌🚫❌🚫❌",
  "ESHESHESH",
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    cleanExpired();
    const confession = pendingConfessionsV2.get(m.sender);

    if (!confession) {
      const text =
        claraWrap("Tidak Ada Confession V2", [
          "◦ Nggak ada yang nembak kamu (V2) saat ini",
          "◦ Atau confession sudah expired (5 menit)",
        ].join("\n")) + "\n" +
        tipText("Sabar ya, jodong nggak kemana");

      await sendReplyWithNav(sock, m, text, "tolakv2match");
      return { handled: true };
    }

    const confessorJid = confession.confessor;
    const confessorName = confession.confessorName;
    const targetName = confession.targetName;

    pendingConfessionsV2.delete(m.sender);

    const quote = TOLAK_QUOTES_V2[Math.floor(Math.random() * TOLAK_QUOTES_V2.length)];
    const decor = TOLAK_DECOR_V2[Math.floor(Math.random() * TOLAK_DECOR_V2.length)];
    const time = new Date().toLocaleDateString("id-ID", {
      day: "numeric", month: "long", year: "numeric",
    });

    let text = "";
    text += decor + "\n";
    text += "💔 *DITOLAK V2* 💔\n";
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

    await sock.sendMessage(m.chat, {
      text: text,
      mentions: [confessorJid, m.sender],
    });

    // Kirim VN (jika file ada)
    try {
      const vnPath = path.join(VN_DIR, VN_TOLAK_V2);
      if (fs.existsSync(vnPath)) {
        const vnBuffer = fs.readFileSync(vnPath);
        await sock.sendMessage(m.chat, {
          audio: vnBuffer,
          mimetype: "audio/mpeg",
          ptt: true,
        });
      }
    } catch (e) {
      console.log("[enggav2.js] VN error:", e.message);
    }

    return { handled: true };
  } catch (error) {
    await m.reply("Error: " + error.message);
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
