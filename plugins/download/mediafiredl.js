// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// mediafiredl — Download file dari MediaFire
// Primary: IkyyXD /download/mediafire | Fallback: builtin mediafire.js
import { ikyyDl } from "../../src/scraper/ikyydl.js";
import te from "../../src/lib/nova-error.js";
import mediafire from "../../src/scraper/mediafire.js";
import { claraWrap, claraLine, mediaCaption, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";
import { novaError, novaGuide } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "mediafiredl",
  alias: ["mediafiredl", "mfdl"],
  category: "download",
  description: "Download file dari MediaFire",
  usage: ".mfdl <url>",
  example: ".mfdl https://www.mediafire.com/file/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const url = m.text?.trim();
  if (!url) {
    return m.reply(novaGuide("MediaFire DL", "Download file dari MediaFire! Kasih linknya ya!", `${m.prefix}mfdl https://www.mediafire.com/file/xxx`));
  }
  if (!url.match(/mediafire\.com/i)) {
    return m.reply(novaGuide("MediaFire DL", "URL-nya gak valid nih! Pakai link MediaFire ya.", `${m.prefix}mfdl https://www.mediafire.com/file/xxx`));
  }

  try {
    await m.react("🕒");

    // Step 1: Try IkyyXD mediafire endpoint
    const result = await ikyyDl("mediafire", url);

    if (result?.medias?.length) {
      const file = result.medias[0];
      await m.react("🐣");
      const _cap = mediaCaption({ platformIcon: "🔥", platformName: "MediaFire", title: result.title || "MediaFire File", format: "File", method: "IkyyXD" });
      return await sock.sendMessage(m.chat, {
        document: { url: file.url }, caption: _cap,
        contextInfo: { forwardingScore: 0, isForwarded: false },
      }, { quoted: m });
    }

    // Step 2: Fallback to builtin mediafire.js
    console.log("[mediafiredl.js] IkyyXD failed, falling back to builtin...");
    try {
      const data = await mediafire(url);
      if (data?.download_url || data?.link) {
        await m.react("🐣");
        const _cap2 = mediaCaption({ platformIcon: "🔥", platformName: "MediaFire", title: data?.title || data?.name || "MediaFire File", format: data?.ext || "File", method: "builtin" });
        await sock.sendMessage(m.chat, {
          document: { url: data.download_url || data.link }, caption: _cap2,
          contextInfo: { forwardingScore: 0, isForwarded: false },
        }, { quoted: m });
        await m.reply(novaBerhasil("mediafiredl"));
        return;
      }
    } catch (e) {
      console.error("[mediafiredl.js] builtin fallback failed:", e.message);
    }

    await m.react("❌");
    return m.reply(novaGagal("MediaFire DL"));
  } catch (error) {
    console.error("[mediafiredl.js]:", error.message);
    await m.react("❌");
    return m.reply(novaError("MediaFire DL", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
