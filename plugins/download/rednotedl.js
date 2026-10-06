// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { mediaPreviewCard } from "../../src/lib/rara-media-card.js";
import { RedNoteDL } from "../../src/scraper/rednote.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

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
    return m.reply( raraWrap("rednotedl", `📕 *rednote downloader*\n\n` +
        `Download video atau foto dari XiaoHongShu (RedNote).\n\n` +
        `*cara pakai:*\n` +
        `*${m.prefix}rednotedl <link>*\n\n` +
        `*contoh:*\n` +
        `*${m.prefix}rednotedl https://www.xiaohongshu.com/xxx*`, "guide"), "rednotedl");
  }
  try {
        await m.react("🕒");
    const result = await RedNoteDL(text);

    if (!result.status) {
      return m.reply(raraGagal("RedNote"));
    }

    if (result.type === "video" && result.results?.[0]) {
      const _cap = mediaCaption({ platformIcon: "🔴", platformName: "RedNote", title: result.title || "RedNote Video", format: "Video", method: "IkyyXD" });
      let card = "";
      try {
        const info = await probeMedia(result.results[0]);
        card = mediaResultCard({
          header: pluginConfig.name,
          type: "video",
          title: result.title || "RedNote Video",
          platform: "RedNote",
          request: [["URL", text]],
          size: info.size, mime: info.mime, duration: info.duration,
        });
      } catch { /* best-effort */ }
      await sock.sendMessage(m.chat, {
        video: { url: result.results[0] }, caption: card || _cap,
        contextInfo: mediaPreviewCard({ title: result.title || "RedNote Video", body: "RedNote", sourceUrl: text, thumbnailUrl: result.thumbnail || "" }),
      }, { quoted: m });
    } else if (result.results?.length > 0) {
      for (let i = 0; i < Math.min(result.results.length, 5); i++) {
        const _imgCap = i === 0 ? mediaCaption({ platformIcon: "🔴", platformName: "RedNote", title: result.title || "RedNote", format: "Image", method: "IkyyXD" }) : null;
        let card = "";
        if (i === 0) {
          try {
            const info = await probeMedia(result.results[i]);
            card = mediaResultCard({
              header: pluginConfig.name,
              type: "foto",
              title: result.title || "RedNote Photo",
              platform: "RedNote",
              request: [["URL", text]],
              size: info.size, mime: info.mime,
            });
          } catch { /* best-effort */ }
        }
        const cap = card || _imgCap;
        await sock.sendMessage(m.chat, {
          image: { url: result.results[i] },
          ...( cap ? { caption: cap } : {}),
          ...( i === 0 ? { contextInfo: mediaPreviewCard({ title: result.title || "RedNote", body: "RedNote • Image", sourceUrl: text, thumbnailUrl: result.thumbnail || result.results[0] }) } : {}),
        }, { quoted: m });
      }
      if (result.results.length > 5) {
        await m.reply(
          `_Masih ada ${result.results.length - 5} foto lagi, maksimal 5_`,
        );
      }
    }
    await m.react("🐣"); await m.react("🐣"); m.reply(raraBerhasil("RedNote"));
  } catch (e) {
    console.error(e);
    m.reply(raraGangguan("RedNote"));
  }
}

export { pluginConfig as config, handler };
