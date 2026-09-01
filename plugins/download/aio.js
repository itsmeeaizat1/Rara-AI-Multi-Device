// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// aio — All in one downloader
// Primary: IkyyXD all-in-one | Fallback: builtin aiodl scraper
import { ikyyAio } from "../../src/scraper/ikyydl.js";
import { aiodl } from "../../src/scraper/aio.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import { novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "aio",
  alias: ["aio"],
  category: "download",
  description: "All in one downloader (IG, TikTok, FB, Twitter, YouTube, Pinterest, CapCut, dll)",
  usage: ".aio <url>",
  example: ".aio https://instagram.com/p/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const url = m.text?.trim();

  if (!url) {
    return m.reply(novaGuide('AIO', 'Download dari berbagai platform! Kasih linknya ya!', `${m.prefix}aio https://instagram.com/p/xxx`));
  }

  if (!url.startsWith("http")) {
    return m.reply(novaGuide('AIO', 'URL-nya gak valid nih! Harus diawali http/https', `${m.prefix}aio https://instagram.com/p/xxx`));
  }

  try {
    await m.react("🕒");

    // Step 1: Try IkyyXD all-in-one
    let result = await ikyyAio(url);

    // Step 2: Fallback to builtin scraper
    if (!result || !result.medias?.length) {
      console.log("[aio.js] IkyyXD failed, falling back to builtin...");
      const builtin = await aiodl(url);
      if (builtin?.media?.length) {
        // Normalize builtin format to match ikyy format
        result = {
          title: builtin.title || "Media",
          medias: builtin.media.map(item => ({
            url: item.url,
            quality: item.quality || "default",
            ext: item.ext || (item.type === "audio" ? "mp3" : "mp4"),
            type: item.type || "video",
          })),
        };
      }
    }

    if (!result || !result.medias?.length) {
      await m.react("❌");
      return m.reply(novaError('AIO', 'Gagal ambil media — pastikan URL valid ya'));
    }

    const ctxInfo = saluranCtx();

    for (const item of result.medias) {
      if (item.type === "video") {
        await sock.sendMedia(m.chat, item.url, result.title || null, m, {
          type: "video",
          contextInfo: ctxInfo,
        });
      } else if (item.type === "audio") {
        await sock.sendMessage(m.chat, {
          audio: { url: item.url },
          mimetype: "audio/mpeg",
          contextInfo: ctxInfo,
        }, { quoted: m });
      } else {
        await sock.sendMedia(m.chat, item.url, result.title || null, m, {
          type: "image",
          contextInfo: ctxInfo,
        });
      }
      break; // Send first/best quality only
    }

    await m.react("🐣");
  } catch (error) {
    console.error("[aio.js]:", error.message);
    await m.react("❌");
    m.reply(novaError('AIO', 'Ada error nih, coba lagi ya'));
  }
}

export { pluginConfig as config, handler };
