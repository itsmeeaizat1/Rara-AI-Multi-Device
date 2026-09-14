// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// laheludl — Download video dari Lahelu via IkyyXD
import { ikyyDl } from "../../src/scraper/ikyydl.js";
import { novaError, novaGuide, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

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
