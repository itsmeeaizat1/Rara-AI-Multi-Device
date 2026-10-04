// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from "fs";
import os from "os";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const pluginConfig = {
  name: "hdvid",
  alias: ["hdvid"],
  category: "tools",
  description: "Meningkatkan kualitas video menjadi HD dengan pure FFMPEG",
  usage: ".hdvid (reply video)",
  example: ".hdvid",
  isOwner: false,
  isPremium: true,
  isGroup: false,
  isPrivate: false,
  cooldown: 120,
  energi: 3,
  isEnabled: true,
};

async function handler(m, { sock }) {
  let isVideoMessage = m.isVideo || (m.quoted && m.quoted.type === "videoMessage");
  let isDocumentMessage = (m.type === "documentMessage" && m.message?.documentMessage?.mimetype?.startsWith("video")) || (m.quoted && m.quoted.type === "documentMessage" && m.quoted.message?.documentMessage?.mimetype?.startsWith("video"));

  if (!isVideoMessage && !isDocumentMessage) {
    return await m.reply(raraWrap("hdvid", [
      `Punya video yang buram? Aku bisa bantu bikin jadi HD.`,
      ``,
      `📌 Format: kirim video (atau document video) dengan caption ${m.prefix}hdvid`,
      `Atau reply video (atau document video) dengan ${m.prefix}hdvid`,
      ``,
      `⚠️ Fitur Premium, proses bisa memakan waktu tergantung ukuran.`,
    ]));
  }
  try {
    await m.react("🕒");
    const videoBuffer = (await m?.quoted?.download?.()) || (await m.download?.());

    if (!videoBuffer || videoBuffer.length === 0) {
      return m.reply(raraWrap("hdvid", `❌ *gagal*\n\nAduh kak, videonya gagal diunduh! Coba kirim ulang ya.`));
    }

    if (videoBuffer.length > 50 * 1024 * 1024) {
      await m.react("🐣");
      return m.reply(raraWrap("hdvid", `❌ *file terlalu besar*\n\nMaaf kak, maksimal ukuran video cuma 50MB ya!`));
    }
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input-hd-${Date.now()}.mp4`);
    const outputPath = path.join(tempDir, `output-hd-${Date.now()}.mp4`);

    fs.writeFileSync(inputPath, videoBuffer);

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilters([
          'scale=iw*2:ih*2:flags=lanczos',
          'unsharp=5:5:1.0:5:5:0.0'
        ])
        .outputOptions(['-c:v libx264', '-preset fast', '-crf 23', '-c:a copy'])
        .save(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    const resultBuffer = fs.readFileSync(outputPath);

    let card = "";
    try {
      const info = await probeBuffer(resultBuffer, { mime: "video/mp4" });
      card = mediaResultCard({
        header: "hdvid",
        type: "video",
        size: info.size, mime: info.mime, duration: info.duration,
      });
    } catch { /* best-effort */ }
    await sock.sendMedia(m.chat, resultBuffer, (card || `*proses selesai* \n\nIni dia hasil videonya kak, udah jauh lebih mulus dan HD kan? 😍`), m, {
      type: "video",
      mimetype: "video/mp4",
      fileName: `HDVID-${Date.now()}.mp4`,
    });
    try {
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
    } catch (e) { console.error('[hdvid.js]:', e.message); }
  } catch (err) {
    await m.react("❌");
    await m.reply(raraWrap("hdvid", `❌ Maaf kak, proses enhance videonya gagal! 😭\n\nDetail: ${err.message}`));
  }
}

export { pluginConfig as config, handler };
