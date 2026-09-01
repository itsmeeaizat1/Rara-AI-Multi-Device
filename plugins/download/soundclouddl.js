// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// soundclouddl.js — Download lagu dari SoundCloud via IkyyXD
import { ikyyDl } from "../../src/scraper/ikyydl.js";
import { novaError, novaGuide, mediaCaption } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "soundclouddl",
  alias: ["soundclouddl", "scdl"],
  category: "download",
  description: "Download lagu dari SoundCloud",
  usage: ".scdl <url>",
  example: ".scdl https://soundcloud.com/artist/track",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  const url = m.text?.trim();
  if (!url) {
    return m.reply(novaGuide("SoundCloud DL", "Download lagu dari SoundCloud! Kasih linknya ya!", `${m.prefix}scdl https://soundcloud.com/artist/track`));
  }
  if (!url.match(/soundcloud\.com/i)) {
    return m.reply(novaGuide("SoundCloud DL", "URL-nya gak valid nih! Pakai link SoundCloud ya.", `${m.prefix}scdl https://soundcloud.com/artist/track`));
  }

  try {
    await m.react("🕒");

    // IkyyXD soundclouddl uses apikey + url params
    const result = await ikyyDl("soundclouddl", url, { extraParams: { apikey: "kyzz" } });

    if (result?.medias?.length) {
      const audio = result.medias.find(m => m.type === "audio") || result.medias[0];
      await m.react("🐣");
      await sock.sendMessage(m.chat, {
        audio: { url: audio.url },
        mimetype: "audio/mpeg",
      }, { quoted: m });
    } else {
      await m.react("❌");
      await m.reply(novaError("SoundCloud DL", "Gagal download — coba link lain ya"));
    }
  } catch (error) {
    console.error("[soundclouddl.js]:", error.message);
    await m.react("❌");
    return m.reply(novaError("SoundCloud DL", "Ada error nih, coba lagi ya"));
  }
}

export { pluginConfig as config, handler };
