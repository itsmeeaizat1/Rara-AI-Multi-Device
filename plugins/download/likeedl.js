// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// likeedl — Download video Likee
// Primary: IkyyXD /download/likee → all-in-one | Fallback: builtin likee.js
import { ikyyDownload } from "../../src/scraper/ikyydl.js";
import likee from "../../src/scraper/likee.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap, claraLine, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "likeedl",
  alias: ["likeedl", "lkdl"],
  category: "download",
  description: "Download video Likee",
  usage: ".lkdl <url>",
  example: ".lkdl https://likee.video/@xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const url = m.text?.trim();
  if (!url) {
    return m.reply(novaGuide("Likee DL", "Download video Likee! Kasih linknya ya!", `${m.prefix}lkdl https://likee.video/@xxx`));
  }
  if (!url.match(/likee\.video|likee\.com/i)) {
    return m.reply(novaGuide("Likee DL", "URL-nya gak valid nih! Pakai link Likee ya.", `${m.prefix}lkdl https://likee.video/@xxx`));
  }

  try {
    await m.react("🕒");

    // Step 1: Try IkyyXD (likee endpoint → all-in-one fallback)
    const result = await ikyyDownload(url, "likee");

    if (result?.medias?.length) {
      const video = result.medias.find(m => m.type === "video") || result.medias[0];
      await m.react("🐣");
      return await sock.sendMedia(m.chat, video.url, result.title || null, m, {
        type: "video",
        contextInfo: { forwardingScore: 0, isForwarded: false },
      });
    }

    // Step 2: Fallback to builtin likee.js
    console.log("[likeedl.js] IkyyXD failed, falling back to builtin...");
    try {
      const data = await likee(url);
      if (data?.status && (data?.video || data?.url)) {
        await m.react("🐣");
        return await sock.sendMedia(m.chat, data.video || data.url, data?.title || null, m, {
          type: "video",
          contextInfo: { forwardingScore: 0, isForwarded: false },
        });
      }
    } catch (e) {
      console.error("[likeedl.js] builtin fallback failed:", e.message);
    }

    await m.react("❌");
    return m.reply(novaError("Likee DL", "Gagal ambil video — coba link lain ya"));
  } catch (error) {
    console.error("[likeedl.js]:", error.message);
    await m.react("❌");
    return m.reply(novaError("Likee DL", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
