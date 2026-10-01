// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// tiktokmedia.js — TikTok search by keyword dengan pilihan format (ala .play):
//   .ttvideo <keyword> → kirim video random (no watermark)
//   .ttaudio <keyword> → kirim original sound dari video random
//   .ttimage <keyword> → kirim foto dari post slideshow random
// Source: tikwm challenge pipeline (src/scraper/tiktoksearch.js)

import { offerConvert } from "../../src/lib/rara-convert.js";
import { raraWrap, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { mediaPreviewCard } from "../../src/lib/rara-media-card.js";
import { tiktokCaption } from "../../src/lib/rara-tiktok-format.js";
import { tiktokSearchVideo } from "../../src/scraper/tiktoksearch.js";

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
  name: ["ttvideo", "ttaudio", "ttimage"],
  alias: ["ttvideo", "ttaudio", "ttimage"],
  category: "download",
  description: "Cari TikTok dari keyword — kirim video / audio / gambar",
  usage: ".ttvideo <keyword> · .ttaudio <keyword> · .ttimage <keyword>",
  example: ".ttvideo viral · .ttaudio sad song · .ttimage pp candid",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

function fmtDuration(seconds) {
  const s = Number(seconds) || 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function usageReply(m) {
  const p = m.prefix;
  return m.reply(raraWrap("TikTok Search", [
    `📌 Cari TikTok dari keyword, kirim sesuai formatnya:`,
    ``,
    `💡 Contoh:`,
    `${p}ttvideo viral`,
    `${p}ttaudio sad song`,
    `${p}ttimage pp candid`,
  ]));
}

async function handler(m, { sock }) {
  const query = m.text?.trim();
  const command = m.command;
  if (!query) return usageReply(m);

  try {
    await m.react("🕒");
    const videos = await tiktokSearchVideo(query, { count: 20 });

    if (!videos || videos.length === 0) {
      await m.react("❗");
      return m.reply(raraWrap("TikTok Search", `Gak nemu hasil untuk keyword: ${query}`));
    }

    // ─── .ttvideo → video random (no watermark) ───
    if (command === "ttvideo") {
      const pool = videos.filter((v) => v.download);
      if (!pool.length) {
        await m.react("❗");
        return m.reply(raraWrap("TikTok Search", `Semua hasil untuk "${query}" berupa foto, bukan video.\nCoba .ttimage ${query}`));
      }
      const video = pool[Math.floor(Math.random() * pool.length)];
      // format owner 19 Sep (search engine kasih video HD no watermark)
      const caption = tiktokCaption({
        title: video.title || "TikTok Video",
        uploader: video.author?.nickname || null,
        username: video.author?.uniqueId || null,
        duration: video.duration || null,
        views: video.stats?.plays || null,
        likes: video.stats?.likes || null,
        download: "HD",
      }) + (video.link ? `\n🔗 *Link:* ${video.link}` : "");

      await sock.sendMessage(m.chat, {
        video: { url: video.download },
        caption,
        contextInfo: mediaPreviewCard({
          title: video.title || "TikTok Video",
          body: `TikTok • Search: ${query}`,
          sourceUrl: video.link || "",
          thumbnailUrl: video.cover || video.originCover || "",
          mediaType: 2,
        }),
      }, { quoted: m });
      await m.react("🐣");
      await offerConvert(sock, m, { mediaUrl: video.download, type: "video", platform: "TikTok", title: video.title, sourceUrl: video.link });
      return;
    }

    // ─── .ttaudio → original sound dari video random ───
    if (command === "ttaudio") {
      const pool = videos.filter((v) => v.music);
      if (!pool.length) {
        await m.react("❗");
        return m.reply(raraWrap("TikTok Search", `Gak nemu sound buat keyword: ${query}`));
      }
      const video = pool[Math.floor(Math.random() * pool.length)];
      const musicTitle = video.musicInfo?.title || "Original Sound";
      const caption = mediaCaption({
        platformIcon: "🎵",
        platformName: "TikTok",
        title: musicTitle,
        author: video.musicInfo?.author || video.author?.nickname || null,
        format: "🎵 MP3",
        method: "TikTok Search",
      }) + (video.link ? `\nDari video: ${video.link}` : "");

      await sock.sendMessage(m.chat, {
        audio: { url: video.music },
        mimetype: "audio/mpeg",
      }, { quoted: m });
      await m.reply(caption);
      await m.react("🐣");
      await offerConvert(sock, m, { mediaUrl: video.music, type: "audio", platform: "TikTok", title: musicTitle, sourceUrl: video.link });
      return;
    }

    // ─── .ttimage → foto dari post slideshow random ───
    if (command === "ttimage") {
      const pool = videos.filter((v) => v.images.length > 0);
      if (!pool.length) {
        await m.react("❗");
        return m.reply(raraWrap("TikTok Search", `Hasil untuk "${query}" gak ada post foto, semuanya video.\nCoba .ttvideo ${query}`));
      }
      const post = pool[Math.floor(Math.random() * pool.length)];
      const images = post.images.slice(0, 5); // max 5 foto per post biar gak banjir
      const caption = mediaCaption({
        platformIcon: "🎵",
        platformName: "TikTok",
        title: post.title || "TikTok Photo Post",
        author: post.author?.nickname || null,
        authorHandle: post.author?.uniqueId || null,
        format: `Foto (${images.length} dari ${post.images.length})`,
        method: "TikTok Search",
      }) + (post.link ? `\nLink: ${post.link}` : "");

      for (let i = 0; i < images.length; i++) {
        const content = { image: { url: images[i] } };
        if (i === 0) {
          content.caption = caption;
          content.contextInfo = mediaPreviewCard({
            title: post.title || "TikTok Photo",
            body: `TikTok • Search: ${query}`,
            sourceUrl: post.link || "",
            thumbnailUrl: images[0],
            mediaType: 1,
          });
        }
        await sock.sendMessage(m.chat, content, { quoted: m });
      }
      await m.react("🐣");
      return;
    }
  } catch (error) {
    console.error("[TikTokMedia]", error.message || error);
    await m.react("❌");
    return m.reply(raraGangguan("TikTok Search"));
  }
}

export { pluginConfig as config, handler };
