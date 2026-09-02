// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ytmp4v3.js — YouTube MP4 v3 (@distube/ytdl-core, direct engine)
import ytdl from "@distube/ytdl-core";
import axios from "axios";
import { claraWrap, mediaCaption } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ytmp4v3",
  alias: ["ytmp4v3", "ytvideo3", "ytmp43"],
  category: "download",
  description: "Download YouTube MP4 v3 (@distube/ytdl-core engine)",
  usage: ".ytmp4v3 <url YouTube>",
  example: ".ytmp4v3 https://youtu.be/dQw4w9WgXcQ",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 20, energi: 4, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const url = m.args.join(" ").trim();
    if (!url || !url.match(/youtu\.?be/i)) {
      return m.reply(claraWrap("ytmp4v3", `Kirim URL YouTube yang valid.\n\nContoh: ${m.prefix}ytmp4v3 https://youtu.be/dQw4w9WgXcQ`, "guide"));
    }

    await m.react("🕒");

    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title;
    const author = info.videoDetails.author.name;
    const duration = info.videoDetails.lengthSeconds;
    const views = info.videoDetails.viewCount;
    const thumb = info.videoDetails.thumbnails?.pop()?.url;

    // Get best video+audio (720p max untuk ukuran wajar)
    const format = ytdl.chooseFormat(info.formats, { quality: "highestvideo", filter: "videoandaudio" });
    if (!format) {
      await m.react("❌");
      return m.reply(claraWrap("ytmp4v3", "Gagal mendapatkan video stream.", "error"));
    }

    // Download
    const chunks = [];
    const stream = ytdl(url, { quality: "highestvideo", filter: "videoandaudio" });
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // WhatsApp max ~64MB for video
    if (buffer.length > 64 * 1024 * 1024) {
      await m.react("❌");
      return m.reply(claraWrap("ytmp4v3", "Video terlalu besar (>64MB). Coba video yang lebih pendek.", "error"));
    }

    await m.react("🐣");

    const durStr = `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`;
    let msg = mediaCaption({
      platformIcon: "▶️",
      platformName: "YouTube MP4 v3",
      title,
      author,
      duration: durStr,
      views: parseInt(views).toLocaleString(),
      format: `Video ${format.qualityLabel || "unknown"} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`,
      method: "@distube/ytdl-core",
    });

    await sock.sendMessage(m.chat, {
      video: buffer,
      caption: msg,
      contextInfo: {
        externalAdReply: {
          title: title.slice(0, 50),
          body: author,
          thumbnailUrl: thumb,
          sourceUrl: url,
          mediaType: 1,
          renderLargerThumbnail: true,
        },
      },
    });
  } catch (err) {
    console.error("ytmp4v3 error:", err);
    await m.react("❌");
    return m.reply(claraWrap("ytmp4v3", err.message || "Error. Mungkin video private/age-restricted.", "error"));
  }
}

export { pluginConfig as config, handler };
