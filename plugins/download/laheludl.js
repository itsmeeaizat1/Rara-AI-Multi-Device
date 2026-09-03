// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// laheludl — Download video dari Lahelu via IkyyXD
import { ikyyDl } from "../../src/scraper/ikyydl.js";
import { novaError, novaGuide, mediaCaption, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "laheludl",
  alias: ["laheludl", "lhdl"],
  category: "download",
  description: "Download video dari Lahelu",
  usage: ".lhdl <url>",
  example: ".lhdl https://lahelu.com/item/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const url = m.text?.trim();
  if (!url) {
    return m.reply(novaGuide("Lahelu DL", "Download video dari Lahelu! Kasih linknya ya!", `${m.prefix}lhdl https://lahelu.com/item/xxx`));
  }
  if (!url.match(/lahelu\.com/i)) {
    return m.reply(novaGuide("Lahelu DL", "URL-nya gak valid nih! Pakai link Lahelu ya.", `${m.prefix}lhdl https://lahelu.com/item/xxx`));
  }

  try {
    await m.react("🕒");

    // IkyyXD lahelu uses "link" param instead of "url"
    const result = await ikyyDl("lahelu", url, { urlParam: "link" });

    if (result?.medias?.length) {
      const video = result.medias.find(m => m.type === "video") || result.medias[0];
      await m.react("🐣");
const _cap = mediaCaption({ platformIcon: "😂", platformName: "Lahelu", title: result.title || "Lahelu Video", format: "Video", method: "IkyyXD" });
      await sock.sendMessage(m.chat, {
        video: { url: video.url }, caption: _cap,
        contextInfo: { forwardingScore: 0, isForwarded: false },
      }, { quoted: m });
    } else {
      await m.react("❌");
      await m.reply(novaGagal("Lahelu DL"));
      await m.reply(novaBerhasil("laheludl"));
    }
  } catch (error) {
    console.error("[laheludl.js]:", error.message);
    await m.react("❌");
    return m.reply(novaError("Lahelu DL", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
