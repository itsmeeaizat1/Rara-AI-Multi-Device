// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// soundclouddl.js — Download lagu dari SoundCloud via IkyyXD
import { ikyyDl } from "../../src/scraper/ikyydl.js";
import { novaError, novaGuide, mediaCaption, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

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
      const caption = mediaCaption({
        platformIcon: "☁️", platformName: "SoundCloud",
        title: result.title || "SoundCloud Track",
        author: result.author || null,
        duration: result.duration || null,
        format: "🎶 MP3", method: "IkyyXD",
      });
      await m.reply(caption);
      await m.react("🐣");
      await sock.sendMessage(m.chat, {
        audio: { url: audio.url },
        mimetype: "audio/mpeg",
      }, { quoted: m });
    } else {
      await m.react("❌");
      await m.reply(novaGagal("SoundCloud DL"));
      await m.reply(novaBerhasil("soundclouddl"));
    }
  } catch (error) {
    console.error("[soundclouddl.js]:", error.message);
    await m.react("❌");
    return m.reply(novaGangguan("SoundCloud DL"));
  }
}

export { pluginConfig as config, handler };
