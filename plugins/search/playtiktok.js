// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/rara-error.js";
import { tiktokSearchVideo, tiktokSearchWilz } from "../../src/scraper/tiktoksearch.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import {  } from "../../src/lib/rara-menu-style.js";
import { mediaPreviewCard } from "../../src/lib/rara-media-card.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
// kartu info media (batch download) - helper ringkas, best-effort tak pernah ganggu kirim
async function dlCard(type, probe, request) {
  try {
    const info = probe.buffer != null ? await probeBuffer(probe.buffer, { mime: probe.mime }) : await probeMedia(probe.url);
    return mediaResultCard({
      header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
      type, request,
      size: info?.size, mime: info?.mime, width: info?.width, height: info?.height, duration: info?.duration,
    });
  } catch { return null; }
}


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
  name: "playtiktok",
  alias: ["playtiktok"],
  category: "search",
  description: "Cari dan kirim satu video TikTok terbaik",
  usage: ".playtiktok <query>",
  example: ".playtiktok cewe tiktok",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

function formatNumber(n) {
  const value = Number(n) || 0;
  if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
  if (value >= 1000) return (value / 1000).toFixed(1) + "K";
  return value.toString();
}

async function handler(m, { sock }) {
  const query = m.args.join(" ")?.trim();

  if (!query) {
    return m.reply(raraWrap("PlayTikTok", [
      `📌 Cari dan kirim satu video TikTok dari keyword:`,
      ``,
      `💡 Contoh:`,
      `${m.prefix}playtiktok cewe tiktok`,
      `${m.prefix}playtiktok viral`,
    ]));
  }
  try {
    // ENGINE UTAMA (request owner 12 Sep 2026): wilz.web.id/api/search/tiktok
    // FALLBACK: tikwm hashtag pipeline (engine bawaan sebelumnya)
    let videos = [];
    let engine = "Wilz Search";
    try {
      videos = await tiktokSearchWilz(query);
    } catch (e1) {
      console.error("[PlayTikTok] Wilz gagal:", e1.message);
      engine = "TikTok Search";
      videos = await tiktokSearchVideo(query);
    }
    if (!videos || videos.length === 0) {
      return m.reply(raraError("PlayTikTok", `Gak nemu video untuk: ${query} nih`));
    }

    const video = videos[0];
    const caption = mediaCaption({
      platformIcon: "🎵",
      platformName: "TikTok",
      title: video.title || "TikTok Video",
      author: video.author?.nickname || null,
      authorHandle: video.author?.uniqueId || null,
      duration: video.duration ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, "0")}` : null,
      views: formatNumber(video.stats?.plays),
      likes: formatNumber(video.stats?.likes),
      comments: formatNumber(video.stats?.comments),
      shares: formatNumber(video.stats?.shares),
      format: "Video HD (No Watermark)",
      method: engine,
    }) + (video.link ? `\nLink: ${video.link}` : "");

    const vUrl = video.download || video.link;
    const vCard = await dlCard("video", { url: vUrl }, [["Judul", String(video.title || "TikTok Video").slice(0, 40)], ["Pembuat", String(video.author?.nickname || "-").slice(0, 40)]]);
    await sock.sendMedia(m.chat, vUrl, vCard || caption, m, {
      type: "video",
      mimetype: "video/mp4",
      contextInfo: mediaPreviewCard({
        title: video.title || "TikTok Video",
        body: "TikTok • PlayTikTok",
        sourceUrl: video.link || "",
        thumbnailUrl: video.cover || video.originCover || "",
        mediaType: 2,
      }),
    });
  } catch (error) {
    console.log(error);
    m.reply(raraWrap("playtiktok", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
