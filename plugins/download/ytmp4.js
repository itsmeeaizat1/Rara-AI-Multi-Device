// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ytmp4.js — Download video YouTube
// Primary: yt-dlp LOCAL (bestvideo+bestaudio di-merge — audio HQ ala .play 320,
// hasilnya jauh lebih jernih daripada re-encode API) → IkyyXD → Sanka → ytdl fallback
import axios from "axios";
import ytdl from "../../src/scraper/ytdl.js";
import { downloadVideo, isYtDlpAvailable } from "../../src/scraper/rara-ytdlp.js";
import { raraGuide, raraError, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
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
  name: "ytmp4",
  alias: ["ytmp4"],
  category: "download",
  description: "Download video YouTube (audio HQ via yt-dlp lokal)",
  usage: ".ytmp4 [360/480/720/1080] <url>",
  example: ".ytmp4 https://youtube.com/watch?v=xxx\n.ytmp4 1080 https://youtu.be/xxx",
  cooldown: 20, energi: 2, isEnabled: true,
};

const sankaConfig = getSankaConfig();
const IKYY = "https://api.ikyyxd.my.id";

async function getVideoDownloadUrl(url) {
  // Method 1: IkyyXD ytmp4 (uses "q" param)
  try {
    const { data } = await axios.get(`${IKYY}/download/ytmp4`, {
      params: { q: url },
      timeout: 60000,
    });
    if (data?.status && data?.result) {
      const r = data.result;
      const dl = r.VideoUrl?.url || r.download_url || r.url || r.video;
      if (dl) return { download: dl, title: r.title || "YouTube Video", method: "IkyyXD", thumbnail: r.thumbnail };
    }
  } catch (e) { console.error("[ytmp4.js] IkyyXD:", e.message); }

  // Method 2: Sanka AIO API
  try {
    const { data } = await axios.get(
      `${sankaConfig.baseUrl}/download/aio?apikey=${sankaConfig.apikey}&url=${encodeURIComponent(url)}`,
      { timeout: 30000 }
    );
    if (data?.status && data?.result) {
      const r = data.result;
      const dl = r.mp4 || r.video || r.dl || r.url || (r.medias?.find(m => m.type?.includes("video"))?.url);
      if (dl) return { download: dl, title: r.title || "YouTube Video", method: "Sanka" };
    }
  } catch (e) { console.error("[ytmp4.js] Sanka:", e.message); }

  // Method 3: ytdl-core (fallback lokal)
  const fallback = await ytdl(url, "mp4");
  if (fallback?.status && fallback?.dl) {
    return { download: fallback.dl, title: fallback.title, method: "ytdl" };
  }

  throw new Error(fallback?.mess || "Gagal mendapatkan video download URL");
}

async function handler(m, { sock }) {
  // parse token kualitas (posisi bebas): .ytmp4 1080 <url> / .ytmp4 <url> 720p
  const tokens = String(m.text || "").trim().split(/\s+/).filter(Boolean);
  const qi = tokens.findIndex((t) => /^(360|480|720|1080)p?$/i.test(t));
  const quality = qi >= 0 ? tokens[qi].replace(/p$/i, "") : "720";
  const url = tokens.filter((_, i) => i !== qi).join(" ").trim();
  if (!url) {
    return m.reply(raraGuide("ytmp4", {
 kaomoji: "(๑•̀ㅂ•́)✧",
 sapaan: "download video youtube full? gas! (◕‿◕)♡",
      cara: "tempel link youtubenya sesudah command",
      contoh: `${m.prefix}${m.command || "ytmp4"} https://youtu.be/xxx`,
      note: "nanti bot unduh videonya langsung dalam format mp4",
      spec: ["⚡ energi 2", "⏱ 20dtk", "💸 gratis"],
    }));
  }
  if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
    return m.reply(raraGuide("YTmp4", "Link-nya harus URL YouTube yang valid ya!", `${m.prefix}ytmp4 https://youtu.be/xxx`));
  }

  try {
    await m.react("🕒");

    // ── PRIMARY: yt-dlp lokal — bestvideo+bestaudio di-merge (audio HQ) ──
    if (await isYtDlpAvailable()) {
      try {
        const vid = await downloadVideo(url, quality);
        if (vid?.buffer?.length) {
          let ytMetaV = {};
          try {
            const { data: oeV } = await axios.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { timeout: 8000 });
            ytMetaV = { author: oeV?.author_name, thumbnail: oeV?.thumbnail_url, title: oeV?.title };
          } catch {}
          // format owner 19 Sep — disamakan ke semua downloader
          const capV = tiktokCaption({
            header: "YouTube Downloader",
            title: vid.title || ytMetaV.title || "YouTube Video",
            uploader: ytMetaV.author || null,
            download: `${quality}p`,
          });
          await m.react("🐣");
          // >16MB dikirim jadi dokumen biar pasti nyampe (limit media WA)
          if (vid.buffer.length > 16 * 1024 * 1024) {
            await sock.sendMessage(m.chat, {
              document: vid.buffer,
              mimetype: "video/mp4",
              fileName: `${(vid.title || "video").replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 40)}-${quality}p.mp4`,
              caption: ((await dlCard("dokumen", { buffer: vid.buffer }, [["Judul", (vid.title || "video").slice(0, 40)], ["Kualitas", quality + "p"]])) || capV),
            }, { quoted: m });
          } else {
            await sock.sendMessage(m.chat, { video: vid.buffer, caption: ((await dlCard("video", { buffer: vid.buffer }, [["Judul", (vid.title || "video").slice(0, 40)], ["Kualitas", quality + "p"]])) || capV) }, { quoted: m });
          }
          return await m.reply(raraBerhasil("ytmp4"));
        }
      } catch (eV) {
        console.error("[YTMP4] yt-dlp lokal gagal, lanjut fallback API:", eV.message);
      }
    }

    // ── FALLBACK: API chain lama (Ikyy → Sanka → ytdl) ──
    const result = await getVideoDownloadUrl(url);

    let ytMeta = {};
    try {
      const { data: oe } = await axios.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { timeout: 8000 });
      ytMeta = { author: oe?.author_name, thumbnail: result.thumbnail || oe?.thumbnail_url, title: oe?.title };
    } catch {}

    // format owner 19 Sep — disamakan ke semua downloader
    const caption = tiktokCaption({
      header: "YouTube Downloader",
      title: result.title || ytMeta.title || "YouTube Video",
      uploader: ytMeta.author || null,
      duration: result.duration || null,
      views: result.views || null,
      download: "MP4",
    });

    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      video: { url: result.download },
      caption: ((await dlCard("video", { url: result.download }, [["Judul", (result.title || ytMeta.title || "YouTube Video").slice(0, 40)]])) || caption),
      contextInfo: { externalAdReply: { title: result.title || ytMeta.title || "YouTube Video", body: "Rara AI Downloader", thumbnailUrl: ytMeta.thumbnail, sourceUrl: url } },
    }, { quoted: m });
    await m.reply(raraBerhasil("ytmp4"));
  } catch (err) {
    console.error("[YTMP4]", err);
    await m.react("❌");
    m.reply(raraGagal("YTmp4"));
  }
}

export { pluginConfig as config, handler };
