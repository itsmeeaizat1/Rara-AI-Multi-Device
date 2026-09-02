// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ytmp3v3.js — YouTube MP3 v3 (@distube/ytdl-core, direct engine)
import ytdl from "@distube/ytdl-core";
import axios from "axios";
import { claraWrap, mediaCaption } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ytmp3v3",
  alias: ["ytmp3v3", "ytaudio3", "ytmp33"],
  category: "download",
  description: "Download YouTube MP3 v3 (@distube/ytdl-core engine)",
  usage: ".ytmp3v3 <url YouTube>",
  example: ".ytmp3v3 https://youtu.be/dQw4w9WgXcQ",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const url = m.args.join(" ").trim();
    if (!url || !url.match(/youtu\.?be/i)) {
      return m.reply(claraWrap("ytmp3v3", `Kirim URL YouTube yang valid.\n\nContoh: ${m.prefix}ytmp3v3 https://youtu.be/dQw4w9WgXcQ`, "guide"));
    }

    await m.react("🕒");

    // Get info
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title;
    const author = info.videoDetails.author.name;
    const duration = info.videoDetails.lengthSeconds;
    const views = info.videoDetails.viewCount;
    const thumb = info.videoDetails.thumbnails?.pop()?.url;

    // Get best audio
    const audioFormat = ytdl.chooseFormat(info.formats, { quality: "highestaudio", filter: "audioonly" });
    if (!audioFormat) {
      await m.react("❌");
      return m.reply(claraWrap("ytmp3v3", "Gagal mendapatkan audio stream.", "error"));
    }

    // Download to buffer
    const chunks = [];
    const stream = ytdl(url, { quality: "highestaudio", filter: "audioonly" });
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    await m.react("🐣");

    const durStr = `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`;
    let msg = mediaCaption({
      platformIcon: "▶️",
      platformName: "YouTube MP3 v3",
      title,
      author,
      duration: durStr,
      views: parseInt(views).toLocaleString(),
      format: "🎵 MP3",
      method: "@distube/ytdl-core",
    });

    await sock.sendMessage(m.chat, {
      audio: buffer,
      mimetype: "audio/mp4",
      ptt: false,
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
    return m.reply(msg);
  } catch (err) {
    console.error("ytmp3v3 error:", err);
    await m.react("❌");
    return m.reply(claraWrap("ytmp3v3", err.message || "Error. Mungkin video private/age-restricted.", "error"));
  }
}

export { pluginConfig as config, handler };
