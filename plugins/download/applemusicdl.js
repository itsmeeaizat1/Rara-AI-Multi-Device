// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// applemusicdl — Download lagu dari Apple Music via IkyyXD
// Primary: IkyyXD /download/applemusic | Fallback: manual info (no audio)
import { ikyyDl } from "../../src/scraper/ikyydl.js";
import { claraWrap, novaError, novaGuide, novaNoInput, mediaCaption, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "applemusicdl",
  alias: ["applemusicdl", "amdl"],
  category: "download",
  description: "Download lagu dari Apple Music",
  usage: ".amdl <url>",
  example: ".amdl https://music.apple.com/id/song/1619595900",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  const url = m.text?.trim();

  if (!url) {
    return m.reply(novaGuide("AppleMusic DL", "Download lagu dari Apple Music! Kasih linknya ya!", `${m.prefix}amdl https://music.apple.com/id/song/xxx`));
  }

  if (!url.match(/music\.apple\.com/i)) {
    return m.reply(novaGuide("AppleMusic DL", "URL-nya gak valid nih! Pakai link Apple Music ya.", `${m.prefix}amdl https://music.apple.com/id/song/xxx`));
  }

  try {
    await m.react("🕒");

    // Try IkyyXD applemusic endpoint
    const result = await ikyyDl("applemusic", url);

    if (result?.medias?.length) {
      const audio = result.medias.find(m => m.type === "audio") || result.medias[0];

      await m.react("🐣");
      const _cap = mediaCaption({ platformIcon: "🍎", platformName: "Apple Music", title: result.title || "Apple Music Track", author: result.author || null, format: "🎵 MP3", method: "IkyyXD" });
      await m.reply(_cap);
      await sock.sendMessage(m.chat, {
        audio: { url: audio.url },
        mimetype: "audio/mpeg",
      }, { quoted: m });
    } else {
      await m.react("❌");
      await m.reply(claraWrap("AppleMusic DL", [
        "Gagal download — endpoint Apple Music sedang down.",
        "Coba lagi nanti atau gunakan .applemusic untuk cari lagunya dulu.",
      ].join("\n"), "error"));
      await m.reply(novaBerhasil("applemusicdl"));
    }
  } catch (error) {
    console.error("[applemusicdl.js]:", error.message);
    await m.react("❌");
    return m.reply(novaGangguan("AppleMusic DL"));
  }
}

export { pluginConfig as config, handler };
