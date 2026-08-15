import te from "../../src/lib/nova-error.js";
import winkEnhance from "../../src/scraper/wink.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "wink",
  alias: ["winkenhance", "winkhd", "wenhance"],
  category: "tools",
  description: "Meningkatkan kualitas video menjadi Ultra HD dengan Wink AI",
  usage: ".wink (reply video)",
  example: ".wink",
  isOwner: false,
  isPremium: true,
  isGroup: false,
  isPrivate: false,
  cooldown: 120,
  energi: 3,
  isEnabled: true,
};

async function handler(m, { sock }) {
  let isVideoMessage = m.isVideo || (m.quoted && m.quoted.type === "videoMessage");
  let isDocumentMessage = (m.type === "documentMessage" && m.message?.documentMessage?.mimetype?.startsWith("video")) || (m.quoted && m.quoted.type === "documentMessage" && m.quoted.message?.documentMessage?.mimetype?.startsWith("video"));

  if (!isVideoMessage && !isDocumentMessage) {
    return sendReplyWithNav(sock, m, `✨ *WINK VIDEO ENHANCER*\n\n` +
        `> Bikin video buram jadi *Ultra HD* pakai AI Wink!\n\n` +
        `*Cara pakai:*\n` +
        `> Kirim/reply video lalu caption \`${m.prefix}wink\`\n\n` +
        `⚠️ _Fitur Premium, proses estimasi 1-5 menit tergantung durasi video_`, "wink");
  }

  await m.react("🕐");

  try {
    const videoBuffer = (await m?.quoted?.download?.()) || (await m.download?.());

    if (!videoBuffer || videoBuffer.length === 0) {
      return m.reply(claraWrap("wink", `❌ *GAGAL*\n\nVideonya gagal diunduh, coba kirim ulang ya!`));
    }

    if (videoBuffer.length > 50 * 1024 * 1024) {
      return m.reply(claraWrap("Wink", `❌ *FILE TERLALU BESAR*\n\nMaksimal ukuran video cuma *50MB* ya!`));
    }

    await m.reply(
      `🎬 *PROsEs WINK ENHANCE DIMULAI*\n\n` +
        `> Video lagi diproses AI Wink biar jadi *Ultra HD* ✨\n` +
        `> Estimasi *1-5 menit*, mohon sabar ya!`,
    );

    const result = await winkEnhance(videoBuffer, {
      filename: `wink-${Date.now()}.mp4`,
    });

    await sock.sendMedia(m.chat, result.resultUrl, `✨ *WINK ENHANCE sELEsAI!*\n\n> Ini dia hasilnya, udah jadi *Ultra HD* kan? 😍`, m, {
      type: "video",
      mimetype: "video/mp4",
      fileName: `WINK-HD-${Date.now()}.mp4`,
    });

    await m.react("✅");
  } catch (err) {
    console.log(err);
    await m.reply(claraWrap("wink", `❌ Proses Wink enhance gagal! Coba lagi nanti ya 😭`));
  }
}

export { pluginConfig as config, handler };
