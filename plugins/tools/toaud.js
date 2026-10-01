// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { queueFFmpeg } from "../../src/lib/nova-ffmpeg.js";
import te from "../../src/lib/nova-error.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "toaud",
  alias: ["toaud", "toaudio"],
  category: "tools",
  description: "Mengubah video atau voice note menjadi audio MP3",
  usage: ".toaud (reply video/vn)",
  example: ".toaud",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    let downloadFn = null;
    const isSelfMedia = m.isVideo || m.isAudio || m.type === "videoMessage" || m.type === "audioMessage";
    const isQuotedMedia = m.quoted && (m.quoted.isVideo || m.quoted.isAudio || m.quoted.type === "videoMessage" || m.quoted.type === "audioMessage" || m.quoted.mtype === "videoMessage" || m.quoted.mtype === "audioMessage");

    if (isSelfMedia && m.download) {
      downloadFn = m.download.bind(m);
    } else if (isQuotedMedia && m.quoted.download) {
      downloadFn = m.quoted.download.bind(m.quoted);
    }

    if (!downloadFn) {
      return m.reply(novaWrap("toaud", "Reply atau kirim video/audio yang ingin diubah menjadi MP3.", "guide"));
    }

    await m.react("🕒");

    const mediaBuffer = await downloadFn();
    if (!mediaBuffer || mediaBuffer.length === 0) {
      await m.react("❌");
      return m.reply(novaWrap("toaud", "❌ Gagal mengunduh media."));
    }

    const tempDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const ts = Date.now();
    const inputPath = path.join(tempDir, `input_${ts}.tmp`);
    const outputPath = path.join(tempDir, `audio_${ts}.mp3`);

    fs.writeFileSync(inputPath, mediaBuffer);

    try {
      await queueFFmpeg(`ffmpeg -y -i "${inputPath}" -vn -ar 44100 -ac 2 -b:a 192k "${outputPath}"`);

      if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
        await m.react("❌");
        return m.reply(novaWrap("toaud", "❌ Gagal mengonversi media ke audio."));
      }

      const audioBuffer = fs.readFileSync(outputPath);

      await m.react("🐣");

      return await sock.sendMessage(
        m.chat,
        {
          audio: audioBuffer,
          mimetype: "audio/mp4",
          fileName: `audio_${ts}.mp3`,
        },
        { quoted: m }
      );
    } finally {
      try {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      } catch (e) {}
      try {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch (e) {}
    }
  } catch (err) {
    console.error("toaud error:", err);
    await m.react("❌");
    return m.reply(novaWrap("toaud", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
