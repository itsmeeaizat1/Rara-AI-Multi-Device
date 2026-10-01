// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// gdrivedl — Download file dari Google Drive via IkyyXD
import { ikyyDl } from "../../src/scraper/ikyydl.js";
import { raraError, raraGuide, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

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
  name: "gdrivedl",
  alias: ["gdrivedl", "gddl"],
  category: "download",
  description: "Download file dari Google Drive",
  usage: ".gddl <url>",
  example: ".gddl https://drive.google.com/file/d/xxx/view",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  const url = m.text?.trim();
  if (!url) {
    return m.reply(raraGuide("GDrive DL", "Download file dari Google Drive! Kasih linknya ya!", `${m.prefix}gddl https://drive.google.com/file/d/xxx/view`));
  }
  if (!url.match(/drive\.google\.com|docs\.google\.com/i)) {
    return m.reply(raraGuide("GDrive DL", "URL-nya gak valid nih! Pakai link Google Drive ya.", `${m.prefix}gddl https://drive.google.com/file/d/xxx/view`));
  }

  try {
    await m.react("🕒");
    const result = await ikyyDl("gdrive", url);

    if (result?.medias?.length) {
      const file = result.medias[0];
      await m.react("🐣");
const _cap = mediaCaption({ platformIcon: "📁", platformName: "Google Drive", title: result.title || "Google Drive File", format: "File", method: "IkyyXD" });
      await sock.sendMessage(m.chat, {
        document: { url: file.url }, caption: _cap,
        contextInfo: { forwardingScore: 0, isForwarded: false },
      }, { quoted: m });
    } else {
      await m.react("❌");
      await m.reply(raraGagal("GDrive DL"));
      await m.reply(raraBerhasil("gdrivedl"));
    }
  } catch (error) {
    console.error("[gdrivedl.js]:", error.message);
    await m.react("❌");
    return m.reply(raraError("GDrive DL", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
