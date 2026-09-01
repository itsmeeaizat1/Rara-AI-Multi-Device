// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// mediafiredl — Download file dari MediaFire
// Primary: IkyyXD /download/mediafire | Fallback: builtin mediafire.js
import { ikyyDl } from "../../src/scraper/ikyydl.js";
import te from "../../src/lib/nova-error.js";
import mediafire from "../../src/scraper/mediafire.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
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
      return await sock.sendMedia(m.chat, file.url, result.title || "MediaFire File", m, {
        type: "file",
        contextInfo: { forwardingScore: 0, isForwarded: false },
      });
    }

    // Step 2: Fallback to builtin mediafire.js
    console.log("[mediafiredl.js] IkyyXD failed, falling back to builtin...");
    try {
      const data = await mediafire(url);
      if (data?.download_url || data?.link) {
        await m.react("🐣");
        let caption = claraWrap("MediaFire DL", [
          data?.title || data?.name || "File",
          data?.size ? `Size: ${data.size}` : "",
          data?.ext ? `Type: ${data.ext}` : "",
        ].filter(Boolean).join("\n"));
        return await sock.sendMedia(m.chat, data.download_url || data.link, caption, m, {
          type: "file",
          contextInfo: { forwardingScore: 0, isForwarded: false },
        });
      }
    } catch (e) {
      console.error("[mediafiredl.js] builtin fallback failed:", e.message);
    }

    await m.react("❌");
    return m.reply(novaError("MediaFire DL", "Gagal ambil file — pastikan URL valid ya"));
  } catch (error) {
    console.error("[mediafiredl.js]:", error.message);
    await m.react("❌");
    return m.reply(novaError("MediaFire DL", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
