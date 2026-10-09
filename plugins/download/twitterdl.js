// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// twitterdl.js — Download video dari Twitter/X (Sanka API + scrape fallback)
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { tiktokCaption } from "../../src/lib/rara-tiktok-format.js";
import { ikyyDl } from "../../src/scraper/ikyydl.js";
import { getSankaConfig } from "../../src/lib/config/env-loader.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
import { getApiKey } from "../../src/lib/rara-api-keys.js";
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
  name: "twitterdl",
  alias: ["twitterdl", "twitter", "xdl", "twitdl"],
  category: "download",
  description: "Download video dari Twitter/X",
  usage: ".twitterdl <url_twitter>",
  example: ".twitterdl https://twitter.com/user/status/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 3, isEnabled: true,
};

const sankaConfig = getSankaConfig();

async function twitterDownload(url) {
  // Method 1: Sanka API
  try {
    const { data } = await axios.get(
      `${sankaConfig.baseUrl}/download/twitter?apikey=${sankaConfig.apikey}&url=${encodeURIComponent(url)}`,
      { timeout: 20000 }
    );
    if (data?.status && data?.result) {
      const r = data.result;
      const video = r.url || r.video || r.medias?.[0]?.url || r.videos?.[0]?.url;
      if (video) return { url: video, title: r.title, author: r.author || r.username };
    }
  } catch (e) { console.error('[twitterdl.js] Sanka:', e.message); }

  // Method 2: Scrape via ssstwitter
  try {
    const { data } = await axios.post("https://ssstwitter.com/api/v1/download",
      { url }, { headers: { "Content-Type": "application/json" }, timeout: 15000 }
    );
    if (data?.data?.videos?.length) {
      return { url: data.data.videos[0].url, title: data.data.title, author: data.data.author };
    }
  } catch (e) { console.error('[twitterdl.js] ssstwitter:', e.message); }

  throw new Error("Gagal mengambil video Twitter");
}

async function handler(m, { sock }) {
  try {
    // Try IkyyXD twitterdl first (apikey + url)
    const ikyyResult = await ikyyDl("twitterdl", url, { extraParams: { apikey: getApiKey("kyzz") } });
    if (ikyyResult?.medias?.length) {
      const video = ikyyResult.medias.find(m => m.type === "video") || ikyyResult.medias[0];
      // format owner 19 Sep — disamakan ke semua downloader
      const caption = tiktokCaption({
        header: "Twitter/X Downloader",
        title: ikyyResult.title || "Twitter Video",
        uploader: ikyyResult.author || null,
        duration: ikyyResult.duration || null,
        download: "SD",
      });
      await sock.sendMessage(m.chat, {
        video: { url: video.url },
        caption: ((await dlCard("video", { url: video.url }, [["Judul", (ikyyResult.title || "Twitter Video").slice(0, 40)]])) || caption),
        contextInfo: { forwardingScore: 0, isForwarded: false },
      }, { quoted: m });
      return;
    }

    const from = m.key.remoteJid;
    await m.react("🕒");
    const url = m.args?.[0]?.trim();
    if (!url || (!url.includes("twitter") && !url.includes("x.com"))) {
      return m.reply(raraWrap("twitterdl", `Masukkan URL Twitter/X!\n\nContoh: .twitterdl https://twitter.com/user/status/xxx`, "guide"));
    }

    const result = await twitterDownload(url);
    // format owner 19 Sep — disamakan ke semua downloader
    const caption = tiktokCaption({
      header: "Twitter/X Downloader",
      title: result.title || "Twitter Video",
      uploader: result.author || null,
      download: "SD",
    });

    await sock.sendMessage(from, {
      video: { url: result.url },
      caption: ((await dlCard("video", { url: result.url }, [["Judul", (result.title || "Twitter Video").slice(0, 40)]])) || caption),
    }, { quoted: m });
    await m.react("🐣");
    await m.reply(raraBerhasil("twitterdl"));
  } catch (err) {
    console.error("twitterdl error:", err);
    await m.react("❌");
    return m.reply(raraWrap("twitterdl", "Gagal download video Twitter. Pastikan URL valid dan contain video!", "error"));
  }
}

export { pluginConfig as config, handler };
