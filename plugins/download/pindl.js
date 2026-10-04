// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from "fs";
import { mediaPreviewCard } from "../../src/lib/rara-media-card.js";
import { offerConvert } from "../../src/lib/rara-convert.js";
import { pinterestdl } from "../../src/lib/rara-pinterest.js";
import path from "path";
import { queueFFmpeg } from "../../src/lib/rara-ffmpeg.js";
import { ikyyDl } from "../../src/scraper/ikyydl.js";
import { f } from "../../src/lib/rara-http.js";
import te from "../../src/lib/rara-error.js";
import { raraWrap, raraError, raraEmpty, raraGuide, raraNoInput, raraBerhasil, raraGangguan } from "../../src/lib/rara-menu-style.js";
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
  name: "pindl",
  alias: ["pindl"],
  category: "download",
  description: "Download gambar/video dari Pinterest",
  usage: ".pindl <url>",
  example: ".pindl https://pin.it/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const url = m.text?.trim();
  if (!url) {
    return m.reply(raraGuide("Pinterest DL", "Masukkan URL Pinterest yang ingin kamu unduh!", `${m.prefix}pindl https://pin.it/xxx`));
  }
  if (!url.includes("pinterest") && !url.includes("pin.it")) {
    return m.reply(raraError("Pinterest DL", "URL tidak valid. Pastikan pakai link Pinterest (pin.it atau pinterest.com)!"));
  }
  try {
        await m.react("🕒");
    // Try IkyyXD pindl first
    const ikyyResult = await ikyyDl("pindl", url);
    if (ikyyResult?.medias?.length) {
      const ctxInfo = mediaPreviewCard({ title: ikyyResult.title || "Pinterest Media", body: "Pinterest", sourceUrl: url, thumbnailUrl: ikyyResult.thumbnail || "" });
      const caption = mediaCaption({
        platformIcon: "📌", platformName: "Pinterest",
        title: ikyyResult.title || "Pinterest Media",
        format: ikyyResult.medias[0].type === "video" ? "Video" : "Image",
        method: "IkyyXD",
      });
      for (const item of ikyyResult.medias) {
        let card = "";
        try {
          const info = await probeMedia(item.url);
          card = mediaResultCard({
            header: pluginConfig.name,
            type: item.type === "video" ? "video" : "foto",
            title: ikyyResult.title || "Pinterest Media",
            platform: "Pinterest",
            request: [["URL", url]],
            size: info.size, mime: info.mime, duration: info.duration,
          });
        } catch { /* best-effort */ }
        if (item.type === "video") {
          await sock.sendMessage(m.chat, { video: { url: item.url }, caption: card || caption, contextInfo: ctxInfo }, { quoted: m });
          await offerConvert(sock, m, { mediaUrl: item.url, type: "video", platform: "Pinterest", title: ikyyResult.title, sourceUrl: url });
        } else {
          await sock.sendMessage(m.chat, { image: { url: item.url }, caption: card || caption, contextInfo: ctxInfo }, { quoted: m });
        }
        break;
      }
      return;
      await m.react("🐣"); await m.react("🐣"); m.reply(raraBerhasil("Pinterest"));
    }

    // Fallback to builtin scraper
    const result = await pinterestdl(url);
    if (!result || !result.media || result.media.length === 0) {
      return m.reply(raraEmpty("Pinterest DL", "Tidak ada media yang ditemukan dari link Pinterest tersebut."));
    }
    const fbCaption = mediaCaption({
      platformIcon: "📌", platformName: "Pinterest",
      title: result.title || "Pinterest Media",
      format: result.media[0].type === "video" ? "Video" : "Image",
      method: "pinterestdl",
    });
    for (const media of result.media) {
      let card = "";
      try {
        const info = await probeMedia(media.url);
        card = mediaResultCard({
          header: pluginConfig.name,
          type: media.type === "video" ? "video" : "foto",
          title: result.title || "Pinterest Media",
          platform: "Pinterest",
          request: [["URL", url]],
          size: info.size, mime: info.mime, duration: info.duration,
        });
      } catch { /* best-effort */ }
      if (media.type === "video") {
        await sock.sendMessage(m.chat, {
          video: { url: media.url }, caption: card || fbCaption,
          contextInfo: mediaPreviewCard({ title: result.title || "Pinterest Media", body: "Pinterest • Video", sourceUrl: url, thumbnailUrl: result.author?.avatar || "" }),
        }, { quoted: m });
        await offerConvert(sock, m, { mediaUrl: media.url, type: "video", platform: "Pinterest", title: result.title, sourceUrl: url });
      } else if (media.type === "image") {
        if (media.url.includes("gif")) {
          const tempPath = path.join(process.cwd(), "temp");
          if (!fs.existsSync(tempPath))
            fs.mkdirSync(tempPath, { recursive: true });
          const id = Date.now();
          const gifPath = path.join(tempPath, `pin-${id}.gif`);
          const mp4Path = path.join(tempPath, `pin-${id}.mp4`);
          try {
            const raw = await f(media.url, "buffer");
            // GUARD 14 Sep 2026: !raw doang gak nangkep Buffer 0 byte (redirect diam-diam)
            if (!raw || raw.length === 0) throw new Error("Gagal download GIF");
            fs.writeFileSync(gifPath, raw);
            await queueFFmpeg(
              `ffmpeg -y -ignore_loop 0 -i "${gifPath}" -t 30 -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -pix_fmt yuv420p -movflags faststart -preset ultrafast -an "${mp4Path}"`,
            );
            if (!fs.existsSync(mp4Path)) throw new Error("Gagal convert GIF");
            await sock.sendMedia(m.chat, fs.readFileSync(mp4Path), null, m, {
              type: "video",
              gifPlayback: true,
              contextInfo: {
                forwardingScore: 0,
                isForwarded: false,
              },
            });
          } catch (gifErr) {
            console.error("[PinDL] GIF convert error:", gifErr.message);
            await sock.sendMedia(m.chat, media.url, null, m, {
              type: "image",
              contextInfo: { forwardingScore: 0, isForwarded: false },
            });
          } finally {
            if (fs.existsSync(gifPath)) fs.unlinkSync(gifPath);
            if (fs.existsSync(mp4Path)) fs.unlinkSync(mp4Path);
          }
        } else {
          await sock.sendMessage(m.chat, {
            image: { url: media.url },
            caption: card || fbCaption,
            contextInfo: mediaPreviewCard({ title: result.title || "Pinterest Media", body: "Pinterest • Image", sourceUrl: url, thumbnailUrl: result.author?.avatar || media.url }),
          }, { quoted: m });
        }
      }
    }
    await m.react("🐣"); await m.react("🐣"); m.reply(raraBerhasil("Pinterest"));
  } catch (error) {
    console.error("[PinDL] Error:", error);
    m.reply(raraGangguan("Pinterest DL"));
  }
}
export { pluginConfig as config, handler };