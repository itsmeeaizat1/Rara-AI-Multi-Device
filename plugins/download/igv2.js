// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// igv2 — Download video/foto Instagram via IkyyXD igv2 endpoint
// Primary: IkyyXD /download/igv2 → all-in-one | Fallback: builtin ig.js
import { ikyyDownload } from "../../src/scraper/ikyydl.js";
import instagramDownloader from "../../src/scraper/ig.js";
import { novaError, novaGuide } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "igv2",
  alias: ["igv2"],
  category: "download",
  description: "Download video/foto Instagram (V2)",
  usage: ".igv2 <url>",
  example: ".igv2 https://www.instagram.com/reel/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const url = m.text?.trim();
  if (!url) {
    return m.reply(novaGuide("IG V2", "Download dari Instagram (V2)! Kasih linknya ya!", `${m.prefix}igv2 https://www.instagram.com/reel/xxx`));
  }
  if (!url.match(/instagram\.com|instagr\.am/i)) {
    return m.reply(novaGuide("IG V2", "URL-nya gak valid nih! Pakai link Instagram ya.", `${m.prefix}igv2 https://www.instagram.com/reel/xxx`));
  }

  try {
    await m.react("🕒");

    // Step 1: Try IkyyXD igv2 endpoint → all-in-one fallback
    const result = await ikyyDownload(url, "igv2");

    if (result?.medias?.length) {
      const ctxInfo = { forwardingScore: 0, isForwarded: false };
      await m.react("🐣");
      for (const item of result.medias) {
        if (item.type === "video") {
          await sock.sendMedia(m.chat, item.url, result.title || null, m, { type: "video", contextInfo: ctxInfo });
        } else {
          await sock.sendMedia(m.chat, item.url, result.title || null, m, { type: "image", contextInfo: ctxInfo });
        }
        break;
      }
      return;
    }

    // Step 2: Fallback to builtin ig.js
    console.log("[igv2.js] IkyyXD failed, falling back to builtin...");
    try {
      const igResult = await instagramDownloader(url);
      if (igResult?.media?.length) {
        const ctxInfo = { forwardingScore: 0, isForwarded: false };
        await m.react("🐣");
        for (const item of igResult.media) {
          if (item.type === "video") {
            await sock.sendMedia(m.chat, item.url, igResult.title || null, m, { type: "video", contextInfo: ctxInfo });
          } else {
            await sock.sendMedia(m.chat, item.url, igResult.title || null, m, { type: "image", contextInfo: ctxInfo });
          }
          break;
        }
        return;
      }
    } catch (e) {
      console.error("[igv2.js] builtin fallback failed:", e.message);
    }

    await m.react("❌");
    return m.reply(novaError("IG V2", "Gagal ambil media — pastikan URL valid dan akunnya publik ya"));
  } catch (error) {
    console.error("[igv2.js]:", error.message);
    await m.react("❌");
    return m.reply(novaError("IG V2", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
