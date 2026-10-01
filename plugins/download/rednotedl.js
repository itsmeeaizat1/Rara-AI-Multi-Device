// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { mediaPreviewCard } from "../../src/lib/nova-media-card.js";
import { RedNoteDL } from "../../src/scraper/rednote.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

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
  name: "rednotedl",
  alias: ["rednotedl"],
  category: "download",
  description: "Download video/foto dari RedNote (XiaoHongShu)",
  usage: ".rednotedl <url>",
  example: ".rednotedl https://www.xiaohongshu.com/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.text?.trim();
  if (!text) {
    return m.reply( `📕 *rednote downloader*\n\n` +
        `Download video atau foto dari XiaoHongShu (RedNote).\n\n` +
        `*cara pakai:*\n` +
        `*${m.prefix}rednotedl <link>*\n\n` +
        `*contoh:*\n` +
        `*${m.prefix}rednotedl https://www.xiaohongshu.com/xxx*`, "rednotedl");
  }
  try {
        await m.react("🕒");
    const result = await RedNoteDL(text);

    if (!result.status) {
      return m.reply(novaGagal("RedNote"));
    }

    if (result.type === "video" && result.results?.[0]) {
      const _cap = mediaCaption({ platformIcon: "🔴", platformName: "RedNote", title: result.title || "RedNote Video", format: "Video", method: "IkyyXD" });
      await sock.sendMessage(m.chat, {
        video: { url: result.results[0] }, caption: _cap,
        contextInfo: mediaPreviewCard({ title: result.title || "RedNote Video", body: "RedNote", sourceUrl: text, thumbnailUrl: result.thumbnail || "" }),
      }, { quoted: m });
    } else if (result.results?.length > 0) {
      for (let i = 0; i < Math.min(result.results.length, 5); i++) {
        const _imgCap = i === 0 ? mediaCaption({ platformIcon: "🔴", platformName: "RedNote", title: result.title || "RedNote", format: "Image", method: "IkyyXD" }) : null;
        await sock.sendMessage(m.chat, {
          image: { url: result.results[i] },
          ...( _imgCap ? { caption: _imgCap } : {}),
          ...( i === 0 ? { contextInfo: mediaPreviewCard({ title: result.title || "RedNote", body: "RedNote • Image", sourceUrl: text, thumbnailUrl: result.thumbnail || result.results[0] }) } : {}),
        }, { quoted: m });
      }
      if (result.results.length > 5) {
        await m.reply(
          `_Masih ada ${result.results.length - 5} foto lagi, maksimal 5_`,
        );
      }
    }
    await m.react("🐣"); await m.react("🐣"); m.reply(novaBerhasil("RedNote"));
  } catch (e) {
    console.error(e);
    m.reply(novaGangguan("RedNote"));
  }
}

export { pluginConfig as config, handler };
