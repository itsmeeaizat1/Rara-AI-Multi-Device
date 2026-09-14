// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// soundclouddl.js — Download lagu dari SoundCloud via IkyyXD
import { ikyyDl } from "../../src/scraper/ikyydl.js";
import { novaError, novaGuide, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

// Caption builder LOKAL (bukan shared lib — owner: tiap fitur punya sendiri, 14 Sep 2026)
function mediaCaption({
  platformIcon = "📥",
  platformName = "Download",
  title, author, authorHandle, duration, uploadDate,
  views, likes, comments, shares, downloads, subscribers,
  description, format, method,
} = {}) {
  const lines = [];
  if (title) lines.push(`Title: ${String(title).slice(0, 80)}`);
  let authorStr = "";
  if (author && authorHandle) authorStr = `${author} (@${authorHandle})`;
  else if (author) authorStr = String(author);
  else if (authorHandle) authorStr = `@${authorHandle}`;
  if (authorStr) lines.push(`Author: ${authorStr}`);
  if (duration) lines.push(`Duration: ${String(duration)}`);
  if (uploadDate) lines.push(`Upload: ${String(uploadDate)}`);
  if (views) lines.push(`Views: ${String(views)}`);
  if (likes) lines.push(`Likes: ${String(likes)}`);
  if (comments) lines.push(`Comments: ${String(comments)}`);
  if (shares) lines.push(`Shares: ${String(shares)}`);
  if (downloads) lines.push(`Downloads: ${String(downloads)}`);
  if (subscribers) lines.push(`Subs: ${String(subscribers)}`);
  if (description && String(description).trim()) {
    lines.push(`Desc: ${String(description).trim().slice(0, 120)}`);
  }
  if (format) lines.push(`Format: ${format}`);
  if (method) lines.push(`Source: ${method}`);
  return lines.join("\n");
}


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
