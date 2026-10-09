// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// instagrammedia.js - Download Instagram per format (URL-based):
//   .igvideo <url> → kirim video aja
//   .igimage <url> → kirim foto aja (carousel/slideshow)
//   .igaudio <url> → ekstrak MP3 dari video (ffmpeg libmp3lame)
// Fetch chain sama kayak instagramdl: IkyyXD → ikyyAio → ig.js lokal.
// Catatan: keyword search IG gak mungkin - Meta blokir semua search tanpa login.

import axios from "axios";
import fs from "fs";
import path from "path";
import { offerConvert } from "../../src/lib/rara-convert.js";
import { queueFFmpeg } from "../../src/lib/rara-ffmpeg.js";
import { ikyyAio } from "../../src/scraper/ikyydl.js";
import instagramDownloader from "../../src/scraper/ig.js";
import { raraWrap, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { tiktokCaption } from "../../src/lib/rara-tiktok-format.js";
import { mediaPreviewCard } from "../../src/lib/rara-media-card.js";
import { mediaResultCard, probeMedia, probeBuffer } from "../../src/lib/rara-media-result.js";
import { getApiKey } from "../../src/lib/rara-api-keys.js";

// Caption builder LOKAL (bukan shared lib - owner: tiap fitur punya sendiri, 14 Sep 2026)
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
  name: ["igvideo", "igimage", "igaudio"],
  alias: ["igvideo", "igimage", "igaudio"],
  category: "download",
  description: "Download Instagram per format - video / foto / audio dari link post",
  usage: ".igvideo <url> · .igimage <url> · .igaudio <url>",
  example: ".igvideo https://www.instagram.com/reel/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

// ─── Fetch chain (mirror instagramdl.js) ───
async function fetchIgMedias(url) {
  let result = null;
  try {
    const response = await axios.get("https://api.ikyyxd.my.id/download/instagram", {
      params: { apikey: getApiKey("kyzz"), query: url },
      timeout: 60000,
    });
    const r = response.data?.result;
    if (response.data?.status && r) {
      const medias = [];
      const push = (u, t) => u && medias.push({ url: u, type: t });
      if (Array.isArray(r.medias)) r.medias.forEach((i) => push(i.url, i.type || (i.extension === "jpg" ? "image" : "video")));
      else if (Array.isArray(r)) r.forEach((i) => push(i.url || i.video, i.type || "video"));
      else push(r.url || r.video, r.type || "video");
      if (medias.length) {
        result = {
          title: r.title || r.author || "Instagram Media",
          thumbnail: r.thumbnail || "",
          medias,
        };
      }
    }
  } catch (e) {
    console.error("[IGMedia] ikyy instagram:", e.message);
  }

  if (!result) {
    try {
      result = await ikyyAio(url);
    } catch (e) {
      console.error("[IGMedia] ikyyAio:", e.message);
    }
  }

  if (!result || !result.medias?.length) {
    try {
      const igResult = await instagramDownloader(url);
      if (igResult?.media?.length) {
        result = {
          title: igResult.title || "Instagram Media",
          medias: igResult.media.map((item) => ({
            url: item.url,
            type: item.type || "video",
          })),
        };
      }
    } catch (e) {
      console.error("[IGMedia] ig.js fallback:", e.message);
    }
  }

  return result;
}

async function extractMp3(videoUrl) {
  const tempDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync({ recursive: true });
  const ts = Date.now();
  const inputPath = path.join(tempDir, `igaudio_in_${ts}.mp4`);
  const outputPath = path.join(tempDir, `igaudio_out_${ts}.mp3`);
  try {
    const res = await axios.get(videoUrl, {
      responseType: "arraybuffer",
      timeout: 90000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    fs.writeFileSync(inputPath, Buffer.from(res.data));
    await queueFFmpeg(`ffmpeg -y -i "${inputPath}" -vn -c:a libmp3lame -b:a 128k "${outputPath}"`);
    if (!fs.existsSync(outputPath)) throw new Error("FFmpeg produced no output");
    return fs.readFileSync(outputPath);
  } finally {
    try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch {}
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
  }
}

function usageReply(m) {
  const p = m.prefix;
  return m.reply(raraWrap("Instagram Media", [
    `📌 Kirim link post Instagram, hasil dikirim sesuai formatnya:`,
    ``,
    `💡 Contoh:`,
    `${p}igvideo https://www.instagram.com/reel/xxx`,
    `${p}igimage https://www.instagram.com/p/xxx`,
    `${p}igaudio https://www.instagram.com/reel/xxx`,
  ]));
}

async function handler(m, { sock }) {
  const url = m.text?.trim();
  const command = m.command;
  if (!url || !url.match(/instagram\.com|instagr\.am/i)) return usageReply(m);

  try {
    await m.react("🕒");
    const result = await fetchIgMedias(url);
    if (!result || !result.medias?.length) {
      await m.react("❌");
      return m.reply(raraGagal("Instagram Media"));
    }
    const title = result.title || "Instagram Media";

    // ─── .igvideo ───
    if (command === "igvideo") {
      const videos = result.medias.filter((i) => i.type === "video");
      if (!videos.length) {
        await m.react("❗");
        return m.reply(raraWrap("Instagram Media", `Post ini gak ada video - coba .igimage buat ambil fotonya`));
      }
      for (const item of videos.slice(0, 5)) {
        let card = "";
        try {
          const info = await probeMedia(item.url);
          card = mediaResultCard({
            header: command,
            type: "video",
            title,
            platform: "Instagram",
            request: [["URL", url]],
            ...info,
          });
        } catch { /* best-effort */ }
        const caption = card || tiktokCaption({
          header: "Instagram Downloader",
          title,
          download: "MP4",
        });
        await sock.sendMessage(m.chat, {
          video: { url: item.url },
          caption,
          contextInfo: mediaPreviewCard({
            title,
            body: "Instagram • Video",
            sourceUrl: url,
            thumbnailUrl: result.thumbnail || "",
            mediaType: 2,
          }),
        }, { quoted: m });
        await offerConvert(sock, m, { mediaUrl: item.url, type: "video", platform: "Instagram", title, sourceUrl: url });
      }
      await m.react("🐣");
      return;
    }

    // ─── .igimage ───
    if (command === "igimage") {
      const images = result.medias.filter((i) => i.type === "image" || /\.(jpe?g|png|webp)(\?|$)/i.test(itemUrlSafe(i)));
      if (!images.length) {
        await m.react("❗");
        return m.reply(raraWrap("Instagram Media", `Post ini gak ada foto - coba .igvideo buat ambil videonya`));
      }
      let card = "";
      try {
        const info = await probeMedia(images[0]?.url);
        card = mediaResultCard({
          header: command,
          type: "foto",
          title,
          platform: "Instagram",
          request: [["Jumlah Foto", images.length]],
          ...info,
        });
      } catch { /* best-effort */ }
      const caption = card || (tiktokCaption({
        header: "Instagram Downloader",
        title,
        download: `Foto (${images.length})`,
      }) + `\n🔗 *Link:* ${url}`);
      for (let i = 0; i < images.slice(0, 10).length; i++) {
        const content = { image: { url: images[i].url } };
        if (i === 0) {
          content.caption = caption;
          content.contextInfo = mediaPreviewCard({
            title,
            body: "Instagram • Foto",
            sourceUrl: url,
            thumbnailUrl: images[i].url,
            mediaType: 1,
          });
        }
        await sock.sendMessage(m.chat, content, { quoted: m });
      }
      await m.react("🐣");
      return;
    }

    // ─── .igaudio (ekstrak MP3 via ffmpeg) ───
    if (command === "igaudio") {
      const video = result.medias.find((i) => i.type === "video" || i.type === "audio");
      if (!video) {
        await m.react("❗");
        return m.reply(raraWrap("Instagram Media", `Post ini gak ada video/audio buat diekstrak audionya - coba .igimage`));
      }
      const isDirectAudio = video.type === "audio" || /\.(mp3|m4a|ogg|opus)(\?|$)/i.test(video.url);
      const audioBuffer = isDirectAudio ? null : await extractMp3(video.url);
      // format owner 19 Sep - disamakan ke semua downloader
      const caption = tiktokCaption({
        header: "Instagram Downloader",
        title,
        download: "MP3",
      }) + `\n🔗 *Link:* ${url}`;
      if (audioBuffer) {
        await sock.sendMessage(m.chat, {
          audio: audioBuffer,
          mimetype: "audio/mpeg",
          ptt: false,
          fileName: `${title.slice(0, 40)}.mp3`.replace(/[\\/:*?"<>|]/g, ""),
        }, { quoted: m });
        try {
          const info = await probeBuffer(audioBuffer, { mime: "audio/mpeg" });
          const card = mediaResultCard({
            header: command,
            type: "audio",
            title,
            platform: "Instagram",
            request: [["URL", url]],
            size: info.size, mime: info.mime, duration: info.duration,
          });
          if (card) await m.reply(card);
          else await m.reply(caption);
        } catch {
          await m.reply(caption);
        }
      } else {
        await sock.sendMessage(m.chat, {
          audio: { url: video.url },
          mimetype: "audio/mp4",
          ptt: false,
        }, { quoted: m });
        try {
          const info = await probeMedia(video.url);
          const card = mediaResultCard({
            header: command,
            type: "audio",
            title,
            platform: "Instagram",
            request: [["URL", url]],
            ...info,
          });
          if (card) await m.reply(card);
          else await m.reply(caption);
        } catch {
          await m.reply(caption);
        }
      }
      await m.react("🐣");
      return;
    }
  } catch (error) {
    console.error("[IGMedia]", error.message || error);
    await m.react("❌");
    return m.reply(raraGangguan("Instagram Media"));
  }
}

// helper kecil biar regex image gak error di item tanpa url
function itemUrlSafe(item) {
  return item?.url || "";
}

export { pluginConfig as config, handler };
