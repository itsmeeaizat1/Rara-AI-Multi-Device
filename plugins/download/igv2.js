// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// igv2 — Download video/foto Instagram via IkyyXD igv2 endpoint
// Primary: IkyyXD /download/igv2 → all-in-one | Fallback: builtin ig.js
import { ikyyDownload } from "../../src/scraper/ikyydl.js";
import { mediaPreviewCard } from "../../src/lib/rara-media-card.js";
import { offerConvert } from "../../src/lib/rara-convert.js";
import instagramDownloader from "../../src/scraper/ig.js";
import { raraError, raraGuide, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { tiktokCaption } from "../../src/lib/rara-tiktok-format.js";
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
  name: "igv2",
  alias: ["igv2"],
  category: "download",
  description: "Download video/foto Instagram (V2)",
  usage: ".igv2 <url>",
  example: ".igv2 https://www.instagram.com/reel/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const url = m.text?.trim();
  if (!url) {
    return m.reply(raraGuide("IG V2", "Download dari Instagram (V2)! Kasih linknya ya!", `${m.prefix}igv2 https://www.instagram.com/reel/xxx`));
  }
  if (!url.match(/instagram\.com|instagr\.am/i)) {
    return m.reply(raraGuide("IG V2", "URL-nya gak valid nih! Pakai link Instagram ya.", `${m.prefix}igv2 https://www.instagram.com/reel/xxx`));
  }

  try {
    await m.react("🕒");

    // Step 1: Try IkyyXD igv2 endpoint → all-in-one fallback
    const result = await ikyyDownload(url, "igv2");

    if (result?.medias?.length) {
      const ctxInfo = mediaPreviewCard({ title: result.title || "Instagram Media", body: "Instagram", sourceUrl: url, thumbnailUrl: result.thumbnail || "" });
      await m.react("🐣");
      for (const item of result.medias) {
        if (item.type === "video") {
          const _cap = tiktokCaption({ header: "Instagram Downloader", title: result.title || "Instagram Media", download: "MP4" });
          await sock.sendMessage(m.chat, { video: { url: item.url }, caption: _cap, contextInfo: ctxInfo }, { quoted: m });
          await offerConvert(sock, m, { mediaUrl: item.url, type: "video", platform: "Instagram", title: result.title, sourceUrl: url });
        } else {
          const _cap2 = tiktokCaption({ header: "Instagram Downloader", title: result.title || "Instagram Media", download: "Foto" });
          await sock.sendMessage(m.chat, { image: { url: item.url }, caption: _cap2, contextInfo: ctxInfo }, { quoted: m });
          await m.reply(raraBerhasil("IG V2"));
        }
        break;
      }
      return;
    }

    // Step 2: Fallback to builtin ig.js
    console.log("[igv2.js] IkyyXD failed, falling back to builtin...");
    try {
      const igResult = await instagramDownloader(url);
      if (igResult?.media?.length) {
        const ctxInfo = mediaPreviewCard({ title: igResult.title || "Instagram Media", body: "Instagram", sourceUrl: url, thumbnailUrl: igResult.thumbnail || "" });
        await m.react("🐣");
        await m.reply(raraBerhasil("IG V2"));
        for (const item of igResult.media) {
          if (item.type === "video") {
            const _cap3 = tiktokCaption({ header: "Instagram Downloader", title: igResult.title || "Instagram Media", download: "MP4" });
            await sock.sendMessage(m.chat, { video: { url: item.url }, caption: _cap3, contextInfo: ctxInfo }, { quoted: m });
            await offerConvert(sock, m, { mediaUrl: item.url, type: "video", platform: "Instagram", title: igResult.title, sourceUrl: url });
          } else {
            const _cap4 = tiktokCaption({ header: "Instagram Downloader", title: igResult.title || "Instagram Media", download: "Foto" });
            await sock.sendMessage(m.chat, { image: { url: item.url }, caption: _cap4, contextInfo: ctxInfo }, { quoted: m });
          }
          break;
        }
        return;
      }
    } catch (e) {
      console.error("[igv2.js] builtin fallback failed:", e.message);
    }

    await m.react("❌");
    return m.reply(raraGagal("IG V2"));
  } catch (error) {
    console.error("[igv2.js]:", error.message);
    await m.react("❌");
    return m.reply(raraGangguan("IG V2"));
  }
}

export { pluginConfig as config, handler };
