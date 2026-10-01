// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import sharp from "sharp";
import fs from "fs";
import path from "path";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import te from "../../src/lib/rara-error.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const pluginConfig = {
  name: "tomp4",
  alias: ["tomp4", "tovideo"],
  category: "tools",
  description: "Mengubah stiker animasi / GIF menjadi video MP4",
  usage: ".tomp4 (reply stiker)",
  example: ".tomp4",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 2,
  isEnabled: true,
};

function isAnimatedWebp(buffer) {
  if (!buffer || buffer.length < 50) return false;
  return buffer.includes(Buffer.from("ANIM")) || buffer.includes(Buffer.from("ANMF"));
}

async function webpToGif(buffer) {
  const meta = await sharp(buffer).metadata();
  if (!meta.pages || meta.pages <= 1) return null;
  return sharp(buffer, { animated: true, pages: -1 }).gif({ loop: 0 }).toBuffer();
}

function gifToMp4(gifBuffer) {
  return new Promise((resolve, reject) => {
    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const ts = Date.now();
    const inputPath = path.join(tmpDir, `gif_${ts}.gif`);
    const outputPath = path.join(tmpDir, `vid_${ts}.mp4`);

    fs.writeFileSync(inputPath, gifBuffer);

    const cleanup = () => {
      try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch (e) {}
      try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (e) {}
    };

    ffmpeg(inputPath)
      .inputOptions(["-y"])
      .outputOptions([
        "-movflags", "faststart",
        "-pix_fmt", "yuv420p",
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "23",
        "-an"
      ])
      .toFormat("mp4")
      .on("end", () => {
        try {
          if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 100) {
            cleanup();
            return reject(new Error("Output video is empty"));
          }
          const mp4Buffer = fs.readFileSync(outputPath);
          cleanup();
          resolve(mp4Buffer);
        } catch (err) {
          cleanup();
          reject(err);
        }
      })
      .on("error", (err) => {
        cleanup();
        reject(new Error("FFmpeg error: " + err.message));
      })
      .save(outputPath);
  });
}

async function handler(m, { sock }) {
  try {
    let downloadFn = null;
    const isSelfSticker = m.isSticker || m.type === "stickerMessage";
    const isQuotedSticker = m.quoted && (m.quoted.isSticker || m.quoted.type === "stickerMessage" || m.quoted.mtype === "stickerMessage");

    if (isSelfSticker && m.download) {
      downloadFn = m.download.bind(m);
    } else if (isQuotedSticker && m.quoted.download) {
      downloadFn = m.quoted.download.bind(m.quoted);
    }

    if (!downloadFn) {
      return m.reply(raraWrap("tomp4", "Reply atau kirim stiker animasi untuk diubah menjadi MP4.", "guide"));
    }

    await m.react("🕒");

    const buffer = await downloadFn();
    if (!buffer || buffer.length === 0) {
      await m.react("❌");
      return m.reply(raraWrap("tomp4", "❌ Gagal mengunduh stiker."));
    }

    const animated = isAnimatedWebp(buffer);
    if (!animated) {
      const pngBuffer = await sharp(buffer).png().toBuffer();
      await m.react("🐣");
      return await sock.sendMessage(
        m.chat,
        {
          image: pngBuffer,
          caption: "✅ *STIKER STATIS DIUBAH KE GAMBAR*",
        },
        { quoted: m }
      );
    }

    const gifBuffer = await webpToGif(buffer);
    if (!gifBuffer) {
      await m.react("❌");
      return m.reply(raraWrap("tomp4", "❌ Stiker tidak dapat dikonversi."));
    }

    const mp4Buffer = await gifToMp4(gifBuffer);

    await m.react("🐣");

    const sizeKb = (mp4Buffer.length / 1024).toFixed(1);
    return await sock.sendMessage(
      m.chat,
      {
        video: mp4Buffer,
        caption: `*Stiker → MP4*\n\n*Format:* MP4 (H.264)\n*Ukuran:* ${sizeKb} KB`,
      },
      { quoted: m }
    );
  } catch (err) {
    console.error("tomp4 error:", err);
    await m.react("❌");
    return m.reply(raraWrap("tomp4", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
