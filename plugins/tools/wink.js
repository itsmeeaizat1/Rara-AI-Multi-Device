// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/nova-error.js";
import winkEnhance from "../../src/scraper/wink.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "wink",
  alias: ["wink"],
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
    return m.reply(claraWrap("wink", [
      `Bikin video buram jadi *ᴜʟᴛʀᴀ ʜᴅ* pakai AI Wink!`,
      ``,
      `📌 Format:`,
      `Kirim/reply video lalu caption \`${m.prefix}wink`,
      `⚠️ _Fitur Premium, proses estimasi 1-5 menit tergantung durasi video_`
    ]));
  }
  try {
    await m.react("🕒");
    const videoBuffer = (await m?.quoted?.download?.()) || (await m.download?.());

    if (!videoBuffer || videoBuffer.length === 0) {
      return m.reply(claraWrap("wink", `❌ *ɢᴀɢᴀʟ*\n\nVideonya gagal diunduh, coba kirim ulang ya!`));
    }

    if (videoBuffer.length > 50 * 1024 * 1024) {
      await m.react("🐣");
      return m.reply(claraWrap("Wink", `❌ *ꜰɪʟᴇ ᴛᴇʀʟᴀʟᴜ ʙᴇꜱᴀʀ*\n\nMaksimal ukuran video cuma *50MB* ya!`));
    }
    const result = await winkEnhance(videoBuffer, {
      filename: `wink-${Date.now()}.mp4`,
    });

    await sock.sendMedia(m.chat, result.resultUrl, `*WINK ENHANCE sELEsAI!*\n\nIni dia hasilnya, udah jadi *ᴜʟᴛʀᴀ ʜᴅ* kan? 😍`, m, {
      type: "video",
      mimetype: "video/mp4",
      fileName: `WINK-HD-${Date.now()}.mp4`,
    });
  } catch (err) {
    await m.react("❌");
    console.log(err);
    await m.reply(claraWrap("wink", `❌ Proses Wink enhance gagal! Coba lagi nanti ya 😭`));
  }
}

export { pluginConfig as config, handler };
