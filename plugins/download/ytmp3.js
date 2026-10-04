// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ytmp3.js — Download audio YouTube
// Primary: IkyyXD /download/ytmp3 → Sanka AIO → ytdl fallback
import axios from "axios";
import ytdl, { fallbackToMp3Buffer } from "../../src/scraper/ytdl.js";
import { raraGuide, raraSalah, raraError, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { getSankaConfig } from "../../src/lib/config/env-loader.js";
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
  name: "ytmp3",
  alias: ["ytmp3"],
  category: "download",
  description: "Download audio YouTube",
  usage: ".ytmp3 <url>",
  example: ".ytmp3 https://youtube.com/watch?v=xxx",
  cooldown: 20, energi: 2, isEnabled: true,
};

const sankaConfig = getSankaConfig();
const IKYY = "https://api.ikyyxd.my.id";

async function getAudioDownload(url) {
  // Method 1: IkyyXD ytmp3
  try {
    const { data } = await axios.get(`${IKYY}/download/ytmp3`, {
      params: { url },
      timeout: 60000,
    });
    if (data?.status && data?.result) {
      const r = data.result;
      const dl = r.audio?.url || r.download_url || r.url;
      if (dl) return { download: dl, title: r.title || "YouTube Audio", method: "IkyyXD", thumbnail: r.thumbnail };
    }
  } catch (e) { console.error("[ytmp3.js] IkyyXD:", e.message); }

  // Method 2: Sanka AIO API
  try {
    const { data } = await axios.get(
      `${sankaConfig.baseUrl}/download/aio?apikey=${sankaConfig.apikey}&url=${encodeURIComponent(url)}`,
      { timeout: 30000 }
    );
    if (data?.status && data?.result) {
      const r = data.result;
      const dl = r.mp3 || r.audio || r.dl || r.url || (r.medias?.find(m => m.type?.includes("audio"))?.url);
      if (dl) return { download: dl, title: r.title || r.meta?.title, method: "Sanka" };
    }
  } catch (e) { console.error("[ytmp3.js] Sanka:", e.message); }

  // Method 3: ytdl-core (fallback lokal)
  const fallback = await ytdl(url, "mp3");
  if (fallback?.status && fallback?.dl) {
    return { download: fallback.dl, title: fallback.title, method: "ytdl", isFallback: true };
  }

  throw new Error(fallback?.mess || "Gagal mendapatkan audio download URL");
}

async function handler(m, { sock }) {
  const url = m.text?.trim();
  if (!url) {
    return m.reply(raraGuide("ytmp3", {
 kaomoji: "ヾ(´︶`*)ﾉ",
 sapaan: "konversi video youtube jadi mp3? gas! (◠‿◠)",
      cara: "tempel link youtubenya sesudah command",
      contoh: `${m.prefix}${m.command || "ytmp3"} https://youtu.be/xxx`,
      note: "nanti bot unduh langsung audionya dari video tersebut",
      spec: ["⚡ energi 2", "⏱ 20dtk", "💸 gratis"],
    }));
  }
  if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
    return m.reply(raraSalah("ytmp3", {
 kaomoji: "(・_・;)",
      pesan: "linknya kok bukan dari youtube kak? ulangi yang bener ya~",
      contoh: `${m.prefix}${m.command || "ytmp3"} link youtube`,
    }));
  }

  try {
    await m.react("🕒");
    const result = await getAudioDownload(url);

    let ytMeta = {};
    try {
      const { data: oe } = await axios.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { timeout: 8000 });
      ytMeta = { author: oe?.author_name, thumbnail: result.thumbnail || oe?.thumbnail_url };
    } catch {}

    // format owner 19 Sep — disamakan ke semua downloader
    const caption = tiktokCaption({
      header: "YouTube Downloader",
      title: result.title || "YouTube Audio",
      uploader: ytMeta.author || null,
      duration: result.duration || null,
      views: result.views || null,
      download: "MP3",
    });

    await m.react("🐣");

    if (result.isFallback) {
      const mp3Buffer = await fallbackToMp3Buffer(result.download);
      await sock.sendMessage(m.chat, {
        audio: mp3Buffer, mimetype: "audio/mpeg", ptt: false,
        fileName: `${result.title || "audio"}.mp3`,
        contextInfo: { externalAdReply: { title: result.title || "YouTube MP3", body: "Rara AI Downloader", thumbnailUrl: ytMeta.thumbnail, sourceUrl: url } },
      }, { quoted: m });
      // kartu teks setelah audio (audio gak bisa caption)
      const fCard = await dlCard("audio", { buffer: mp3Buffer, mime: "audio/mpeg" }, [["Judul", (result.title || "audio").slice(0, 40)]]);
      if (fCard) await m.reply(fCard);
    } else {
      await sock.sendMedia(m.chat, result.download, null, m, {
        type: "audio", mimetype: "audio/mpeg", ptt: false,
        fileName: result.title || "audio.mp3",
      });
      const uCard = await dlCard("audio", { url: result.download }, [["Judul", (result.title || "audio").slice(0, 40)]]);
      if (uCard) await m.reply(uCard); else await m.reply(raraBerhasil("ytmp3"));
    }
    await m.reply(caption);
  } catch (err) {
    console.error("[YTMP3]", err);
    await m.react("❌");
    m.reply(raraGagal("YTmp3"));
  }
}

export { pluginConfig as config, handler };
