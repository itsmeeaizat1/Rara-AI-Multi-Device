// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// capcutdl — Download video CapCut
// Primary: IkyyXD /download/capcut → /download/all-in-one | Fallback: btch-downloader
import { ikyyDownload } from "../../src/scraper/ikyydl.js";
import { capcut } from "btch-downloader";
import { novaError, novaEmpty, novaGuide, novaNoInput, mediaCaption } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "capcutdl",
  alias: ["capcutdl", "ccdl"],
  category: "download",
  description: "Download video CapCut",
  usage: ".ccdl <url>",
  example: ".ccdl https://www.capcut.com/t/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const url = m.text?.trim();

  if (!url) {
    return m.reply(novaGuide('CapCut', 'Mau download video CapCut? Kasih linknya ya!', `${m.prefix}ccdl https://www.capcut.com/t/xxx`));
  }

  if (!url.match(/capcut\.com/i)) {
    return m.reply(novaGuide('CapCut', 'URL-nya gak valid nih! Pakai link CapCut ya.', `${m.prefix}ccdl https://www.capcut.com/t/xxx`));
  }

  try {
    await m.react("🕒");

    // Step 1: Try IkyyXD (capcut endpoint → all-in-one fallback)
    const result = await ikyyDownload(url, "capcut");

    // Step 2: Fallback to btch-downloader
    if (!result || !result.medias?.length) {
      console.log("[capcutdl.js] IkyyXD failed, falling back to btch-downloader...");
      try {
        const data = await capcut(url);
        if (data?.status && data?.originalVideoUrl) {
          const caption = mediaCaption({
            platformIcon: "✂️", platformName: "CapCut",
            title: data?.title || "CapCut Video",
            format: "Video", method: "btch-downloader",
          });
          await m.react("🐣");
          return await sock.sendMessage(m.chat, {
            video: { url: data.originalVideoUrl }, caption,
            contextInfo: { forwardingScore: 0, isForwarded: false },
          }, { quoted: m });
        }
      } catch (e) {
        console.error("[capcutdl.js] btch fallback failed:", e.message);
      }
    }

    // Step 3: Send IkyyXD result if available
    if (result?.medias?.length) {
      const video = result.medias.find(m => m.type === "video") || result.medias[0];
      const caption = mediaCaption({
        platformIcon: "✂️", platformName: "CapCut",
        title: result.title || "CapCut Video",
        format: "Video", method: "IkyyXD",
      });
      await m.react("🐣");
      return await sock.sendMessage(m.chat, {
        video: { url: video.url }, caption,
        contextInfo: { forwardingScore: 0, isForwarded: false },
      }, { quoted: m });
    }

    await m.react("❌");
    return m.reply(novaError('CapCut', 'Gagal ambil video — coba link lain ya'));
  } catch (error) {
    console.error("[capcutdl.js]:", error.message);
    await m.react("❌");
    return m.reply(novaError('CapCut', 'Ada error nih, coba lagi ya'));
  }
}

export { pluginConfig as config, handler };
