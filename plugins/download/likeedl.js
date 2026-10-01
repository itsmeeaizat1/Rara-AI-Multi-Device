// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// likeedl — Download video Likee
// Primary: IkyyXD /download/likee → all-in-one | Fallback: builtin likee.js
import { ikyyDownload } from "../../src/scraper/ikyydl.js";
import likee from "../../src/scraper/likee.js";
import te from "../../src/lib/rara-error.js";
import { raraWrap, raraLine, raraError, raraEmpty, raraGuide, raraNoInput, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";

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
  name: "likeedl",
  alias: ["likeedl", "lkdl"],
  category: "download",
  description: "Download video Likee",
  usage: ".lkdl <url>",
  example: ".lkdl https://likee.video/@xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const url = m.text?.trim();
  if (!url) {
    return m.reply(raraGuide("Likee DL", "Download video Likee! Kasih linknya ya!", `${m.prefix}lkdl https://likee.video/@xxx`));
  }
  if (!url.match(/likee\.video|likee\.com/i)) {
    return m.reply(raraGuide("Likee DL", "URL-nya gak valid nih! Pakai link Likee ya.", `${m.prefix}lkdl https://likee.video/@xxx`));
  }

  try {
    await m.react("🕒");

    // Step 1: Try IkyyXD (likee endpoint → all-in-one fallback)
    const result = await ikyyDownload(url, "likee");

    if (result?.medias?.length) {
      const video = result.medias.find(m => m.type === "video") || result.medias[0];
      await m.react("🐣");
      return await sock.sendMedia(m.chat, video.url, result.title || null, m, {
        type: "video",
        contextInfo: { forwardingScore: 0, isForwarded: false },
      });
    }

    // Step 2: Fallback to builtin likee.js
    console.log("[likeedl.js] IkyyXD failed, falling back to builtin...");
    try {
      const data = await likee(url);
      if (data?.status && (data?.video || data?.url)) {
        await m.react("🐣");
        await sock.sendMedia(m.chat, data.video || data.url, data?.title || null, m, {
          type: "video",
          contextInfo: { forwardingScore: 0, isForwarded: false },
        });
        await m.reply(raraBerhasil("likeedl"));
        return;
      }
    } catch (e) {
      console.error("[likeedl.js] builtin fallback failed:", e.message);
    }

    await m.react("❌");
    return m.reply(raraGagal("Likee DL"));
  } catch (error) {
    console.error("[likeedl.js]:", error.message);
    await m.react("❌");
    return m.reply(raraError("Likee DL", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
