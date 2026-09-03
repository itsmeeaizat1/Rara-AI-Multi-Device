// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ptv.js — Download video Pinterest (pakai scraper pindl.js lokal)
import { PinDL } from "../../src/scraper/pindl.js";
import { novaError, novaGuide, mediaCaption, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ptv",
  alias: ["ptv", "pinterestvideo"],
  category: "download",
  description: "Download video dari Pinterest",
  usage: ".ptv <url_pinterest>",
  example: ".ptv https://pin.it/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const url = m.text?.trim();
    if (!url || (!url.includes("pinterest.") && !url.includes("pin.it"))) {
      return m.reply(novaGuide("Pinterest Video", "Kirim URL Pinterest yang valid!", ".ptv https://pin.it/xxx"));
    }

    await m.react("🕒");

    const result = await PinDL(url);
    if (!result || result.error) {
      await m.react("❌");
      return m.reply(novaError("Pinterest Video", result?.error || "Gagal download video Pinterest!"));
    }

    const mediaUrl = result.url || result.download;
    if (!mediaUrl) {
      await m.react("❌");
      return m.reply(novaError("Pinterest Video", "Media tidak ditemukan!"));
    }

    const caption = mediaCaption({
      platformIcon: "📌",
      platformName: "Pinterest",
      title: result.title || "Pinterest Video",
      format: "📹 Video",
      method: "Scraper Lokal",
    });

    await sock.sendMessage(m.chat, {
      video: { url: mediaUrl },
      caption,
    }, { quoted: m });
    await m.react("🐣");
    await m.reply(novaBerhasil("ptv"));
  } catch (err) {
    console.error("[PTV]", err);
    await m.react("❌");
    m.reply(novaGagal("Pinterest Video"));
  }
}

export { pluginConfig as config, handler };
