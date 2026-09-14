// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// tiktokv4.js — TikTok Downloader V4 via IkyyXD
import { ikyyDl } from "../../src/scraper/ikyydl.js";
import { claraWrap, novaError, novaGuide, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

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
  name: "tiktokv4",
  alias: ["tiktokv4", "ttv4"],
  category: "download",
  description: "Download video TikTok (V4)",
  usage: ".ttv4 <url>",
  example: ".ttv4 https://vt.tiktok.com/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.text?.trim();
  if (!text) {
    return m.reply(novaGuide("TikTok V4", "Download video TikTok V4! Kasih linknya ya!", `${m.prefix}ttv4 https://vt.tiktok.com/xxx`));
  }
  if (!text.match(/tiktok\.com|vt\.tiktok/i)) {
    return m.reply(novaGuide("TikTok V4", "URL-nya gak valid nih! Pakai link TikTok ya.", `${m.prefix}ttv4 https://vt.tiktok.com/xxx`));
  }

  try {
    await m.react("🕒");
    const result = await ikyyDl("tiktokv4", text);

    if (result?.medias?.length) {
      const video = result.medias.find(m => m.type === "video") || result.medias[0];
      const caption = mediaCaption({
        platformIcon: "🎵", platformName: "TikTok V4",
        title: result.title || "TikTok Video",
        author: result.author || null,
        duration: result.duration || null,
        description: result.description ? String(result.description).slice(0, 120) : null,
        format: "Video (No Watermark)", method: "IkyyXD",
      });
      await m.react("🐣");
      await sock.sendMessage(m.chat, {
        video: { url: video.url }, caption,
        contextInfo: { forwardingScore: 0, isForwarded: false },
      }, { quoted: m });
    } else {
      await m.react("❌");
      await m.reply(novaGagal("TikTok V4"));
      await m.reply(novaBerhasil("tiktokv4"));
    }
  } catch (error) {
    console.error("[tiktokv4.js]:", error.message);
    await m.react("❌");
    return m.reply(novaGangguan("TikTok V4"));
  }
}

export { pluginConfig as config, handler };
