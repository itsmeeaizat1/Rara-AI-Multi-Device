// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { pendingProposals, cleanExpired } from "./nikahmatch.js";
import { separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

// VN files (put files in assets/vn/)
const VN_DIR = path.join(process.cwd(), "assets", "audio");
const VN_TOLAK_NIKAH = "vn_tolak_nikah.mp3"; // VN saat nikah ditolak

const pluginConfig = {
  name: "tolaknikah",
  alias: ["tolaknikah"],
  category: "game",
  description: "Tolak lamaran nikah",
  usage: ".tolaknikahmatch",
  example: ".tolaknikahmatch",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const REJECT_QUOTES = [
  "Bukan berarti aku nggak hargain perasaanmu, tapi mungkin kita bukan untuk saling memiliki.",
  "Kamu terlalu baik buat aku, dan aku terlalu jujur buat pura-pura.",
  "Mungkin di kehidupan lain, kita bisa bareng. Tapi bukan sekarang.",
  "Aku nggak bisa terima, tapi aku tetap menghargai keberanianmu.",
  "Terima kasih udah pernah nyoba, tapi hati aku belum bisa nerima.",
];

const REJECT_DECOR = [
  "💔😔💔😔💔",
  "❌🚫❌🚫❌",
  "🖔😢🖔😢🖔",
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    cleanExpired();
    const proposal = pendingProposals.get(m.sender);

    if (!proposal) {
      const text =
        claraWrap("Tidak Ada Lamaran", ["◦ Kamu tidak punya lamaran yang menunggu",
          "◦ Atau lamaran sudah expired (5 menit)"].join("\n")) +
        "\n" +
        tipText("Tunggu seseorang melamar kamu");

      await sendReplyWithNav(sock, m, text, "tolaknikahmatch");
      return { handled: true };
    }

    const proposerJid = proposal.proposer;
    const proposerName = proposal.proposerName;
    const targetName = proposal.targetName;

    pendingProposals.delete(m.sender);

    const quote = REJECT_QUOTES[Math.floor(Math.random() * REJECT_QUOTES.length)];
    const decor = REJECT_DECOR[Math.floor(Math.random() * REJECT_DECOR.length)];
    const time = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let text = "";
    text += decor + "\n";
    text += "💔 *LAMARAN DITOLAK* 💔\n";
    text += decor + "\n\n";
    text += "“" + quote + "”\n\n";
    text += separator("─", 28) + "\n";
    text += "👤 Dari     : *" + proposerName + "*\n";
    text += "👥 Untuk    : *" + targetName + "*\n";
    text += "📅 Tanggal  : " + time + "\n";
    text += "🚫 Status   : *Ditolak*\n";
    text += separator("─", 28) + "\n\n";
    text += "💔 *" + targetName + "* menolak lamaran *" + proposerName + "*\n\n";
    text += decor + "\n";
    text += tipText("Jangan menyerah, jodoh masih banyak di luar sana!");

    await sock.sendMessage(m.chat, {
      text: text,
      mentions: [proposerJid, m.sender],
    });

    // Kirim VN (jika file ada)
    try {
      const vnPath = path.join(VN_DIR, VN_TOLAK_NIKAH);
      if (fs.existsSync(vnPath)) {
        const vnBuffer = fs.readFileSync(vnPath);
        await sock.sendMessage(m.chat, {
          audio: vnBuffer,
          mimetype: "audio/mpeg",
          ptt: true,
        });
      }
    } catch (e) {
      console.log("[tolak.js] VN error:", e.message);
    }

    return { handled: true };
  } catch (error) {
    await m.reply("Error: " + error.message);
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
