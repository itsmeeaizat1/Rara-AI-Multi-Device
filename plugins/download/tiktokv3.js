// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// tiktokv3.js — TikTok Downloader v3 (Sanka API + tikwm fallback)
import axios from "axios";
import { raraWrap, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { getSankaConfig } from "../../src/lib/config/env-loader.js";
import { ikyyDl } from "../../src/scraper/ikyydl.js";
import { mediaPreviewCard } from "../../src/lib/rara-media-card.js";
import { offerConvert } from "../../src/lib/rara-convert.js";
import { tiktokCaption } from "../../src/lib/rara-tiktok-format.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
// kartu info media (batch download) — helper ringkas, best-effort tak pernah ganggu kirim
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
  name: "tiktokv3",
  alias: ["tiktokv3", "ttdl3", "tt3"],
  category: "download",
  description: "Download TikTok video v3 (Sanka + tikwm)",
  usage: ".tiktokv3 <url TikTok>",
  example: ".tiktokv3 https://www.tiktok.com/@user/video/123",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

const sankaConfig = getSankaConfig();

async function tiktokDownload(url) {
  // Method 1: Sanka API
  try {
    const { data } = await axios.get(
      `${sankaConfig.baseUrl}/download/tiktok?apikey=${sankaConfig.apikey}&url=${encodeURIComponent(url)}`,
      { timeout: 20000, headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (data?.status && data?.result) {
      return data.result;
    }
  } catch (e) { console.error('[tiktokv3.js] Sanka:', e.message); }

  // Method 2: tikwm.com
  try {
    const { data } = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
      timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (data?.code === 0 && data?.data) {
      return {
        title: data.data.title,
        author: data.data.author?.nickname,
        username: data.data.author?.id,
        video: { noWatermark: data.data.play, watermark: data.data.wmplay },
        music: data.data.music,
      };
    }
  } catch (e) { console.error('[tiktokv3.js] tikwm:', e.message); }

  throw new Error("Gagal download TikTok");
}

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim() || m.text?.trim() || "";
  try {
    // Try IkyyXD tiktokv3 first
    const ikyyResult = await ikyyDl("tiktokv3", text);
    if (ikyyResult?.medias?.length) {
      const video = ikyyResult.medias.find(m => m.type === "video") || ikyyResult.medias[0];
      // format owner 19 Sep
      const caption = tiktokCaption({
        title: ikyyResult.title || "TikTok Video",
        uploader: ikyyResult.author || null,
        duration: ikyyResult.duration || null,
        download: "SD",
      });
      await sock.sendMessage(m.chat, {
        video: { url: video.url }, caption: ((await dlCard("video", { url: video.url }, [["Judul", (ikyyResult.title || "TikTok Video").slice(0, 40)]])) || caption),
        contextInfo: mediaPreviewCard({ title: ikyyResult.title || "TikTok Video", body: "TikTok V3", sourceUrl: text, thumbnailUrl: ikyyResult.thumbnail || "" }),
      }, { quoted: m });
      await offerConvert(sock, m, { mediaUrl: video.url, type: "video", platform: "TikTok", title: ikyyResult.title, sourceUrl: text });
      return;
    }

    const url = text;
    if (!url || !url.match(/tiktok\.com|vt\.tiktok/i)) {
      return m.reply(raraWrap("tiktokv3", `Kirim URL TikTok yang valid.\n\nContoh: ${m.prefix}tiktokv3 https://www.tiktok.com/@user/video/123`, "guide"));
    }

    await m.react("🕒");
    const r = await tiktokDownload(url);
    await m.react("🐣");

    const videoUrl = r.video?.noWatermark || r.video?.url || r.video?.watermark || r.video;
    if (!videoUrl && !r.images) {
      await m.react("❌");
      await m.reply(raraGagal("TikTok V3"));
      await m.reply(raraBerhasil("TikTok V3"));
    }
    if (videoUrl && !r.images) {
      const vidRes = await axios.get(videoUrl, {
        responseType: "arraybuffer", timeout: 60000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const buffer = Buffer.from(vidRes.data);

      // format owner 19 Sep
      const caption = tiktokCaption({
        title: r.title || r.desc || "TikTok Video",
        uploader: r.author || null,
        username: r.username || null,
        duration: r.duration || null,
        views: r.play_count || null,
        likes: r.digg_count || null,
        download: "SD",
      });

      await sock.sendMessage(m.chat, {
        video: buffer,
        caption: ((await dlCard("video", { buffer: buffer }, [["Judul", (r.title || r.desc || "TikTok Video").slice(0, 40)], ["Kualitas", "SD"]])) || caption),
        contextInfo: mediaPreviewCard({ title: r.title || r.desc || "TikTok Video", body: "TikTok V3", sourceUrl: url, thumbnailUrl: r.cover || "" }),
      }, { quoted: m });
      await offerConvert(sock, m, { buffer, type: "video", platform: "TikTok", title: r.title || r.desc, sourceUrl: url });
    } else if (r.images && r.images.length > 0) {
      for (const img of r.images.slice(0, 5)) {
        await sock.sendMessage(m.chat, { image: { url: img }, contextInfo: mediaPreviewCard({ title: r.title || r.desc || "TikTok Photo", body: "TikTok V3 • Image", sourceUrl: url, thumbnailUrl: r.cover || img }) }, { quoted: m });
      }
    }

    // kartu ringkasan foto TikTok (batch download)
    try {
      const firstInfo = await probeMedia(r.images[0]).catch(() => null);
      const sumCard = mediaResultCard({ header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name, type: "gambar", request: [["Jumlah foto", String(r.images.length)]], size: firstInfo?.size, mime: firstInfo?.mime, width: firstInfo?.width, height: firstInfo?.height });
      if (sumCard) await m.reply(sumCard);
    } catch {}

    // Audio
    if (r.music) {
      const audRes = await axios.get(r.music, {
        responseType: "arraybuffer", timeout: 30000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      await sock.sendMessage(m.chat, {
        audio: Buffer.from(audRes.data),
        mimetype: "audio/mp4", ptt: false,
      }, { quoted: m });
      // kartu teks setelah audio (audio gak bisa caption)
      const audCard = await dlCard("audio", { buffer: Buffer.from(audRes.data), mime: "audio/mp4" }, [["Judul", (r.title || r.desc || "TikTok Audio").slice(0, 40)]]);
      if (audCard) await m.reply(audCard);
    }
  } catch (err) {
    console.error("[tiktokv3]", err);
    await m.react("❌");
    m.reply(raraGangguan("TikTok V3"));
  }
}

export { pluginConfig as config, handler };
