// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// dramaboxdl — Download video dari DramaBox via IkyyXD
import { ikyyDl } from "../../src/scraper/ikyydl.js";
import { novaError, novaGuide, mediaCaption, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "dramaboxdl",
  alias: ["dramaboxdl", "dbdl"],
  category: "download",
  description: "Download video dari DramaBox",
  usage: ".dbdl <url>",
  example: ".dbdl https://www.dramabox.com/in/video/{bookId}_{slug}/{chapterId}_Episode-1",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  const url = m.text?.trim();
  if (!url) {
    return m.reply(novaGuide("DramaBox DL", "Download video dari DramaBox! Kasih linknya ya!", `${m.prefix}dbdl https://www.dramabox.com/in/video/xxx`));
  }
  if (!url.match(/dramabox\.com/i)) {
    return m.reply(novaGuide("DramaBox DL", "URL-nya gak valid nih! Pakai link DramaBox ya.", `${m.prefix}dbdl https://www.dramabox.com/in/video/xxx`));
  }

  try {
    await m.react("🕒");
    const result = await ikyyDl("dramabox", url);

    if (result?.medias?.length) {
      const video = result.medias.find(m => m.type === "video") || result.medias[0];
      await m.react("🐣");
const _cap = mediaCaption({ platformIcon: "🎬", platformName: "DramaBox", title: result.title || "DramaBox Video", format: "Video", method: "IkyyXD" });
      await sock.sendMessage(m.chat, {
        video: { url: video.url }, caption: _cap,
        contextInfo: { forwardingScore: 0, isForwarded: false },
      }, { quoted: m });
    } else {
      await m.react("❌");
      await m.reply(novaGagal("DramaBox DL"));
      await m.reply(novaBerhasil("dramaboxdl"));
    }
  } catch (error) {
    console.error("[dramaboxdl.js]:", error.message);
    await m.react("❌");
    return m.reply(novaError("DramaBox DL", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
