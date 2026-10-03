// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  generateWAMessage,
  generateWAMessageFromContent,
  jidNormalizedUser,
} from "rara";
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
const execAsync = promisify(exec);
const NEOXR_APIKEY = config.APIkey?.neoxr || "Milik-Bot-RaraMD";

const pluginConfig = {
  name: "pinvid",
  alias: ["pinvid"],
  category: "search",
  description: "Search video Pinterest (album)",
  usage: ".pinvid <query>",
  example: ".pinvid anime",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 2,
  isEnabled: true,
};

async function convertM3u8ToMp4(m3u8Url, outputPath) {
  const cmd = `ffmpeg -y -i "${m3u8Url}" -c copy -bsf:a aac_adtstoasc "${outputPath}"`;
  await execAsync(cmd, { timeout: 120000 });
  return fs.existsSync(outputPath);
}

async function handler(m, { sock }) {
  const query = m.text?.trim();

  if (!query) {
    return m.reply( `📌 *pinterest video search*\n\n` +
        `Masukkan query pencarian\n\n` +
        `\`${m.prefix}pinvid anime\``, "pinvid");
  }
  try {
    const res = await axios.get(
      `https://firefly.maiku.my.id/api/pinterestvideo?apikey=${config.APIkey.firefly}&q=${encodeURIComponent(query)}`,
      {
        timeout: 60000,
      },
    );

    if (!res.data?.status || !res.data?.data?.length) {
      return m.reply(raraError("PinVid", `Gak nemu video untuk: ${query} nih`));
    }

    const videos = res.data.data.slice(0, 5);
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const mediaList = [];

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];

      if (!video.video_url) continue;

      try {
        const videoUrl = video.video_url;
        const duration = video.duration
          ? Math.round(video.duration / 1000)
          : 0;
        const durationStr =
          duration > 0
            ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")}`
            : "-";

        let videoBuffer;

        if (videoUrl.includes(".m3u8")) {
          const outputPath = path.join(
            tempDir,
            `pinvid_${Date.now()}_${i}.mp4`,
          );

          try {
            await convertM3u8ToMp4(videoUrl, outputPath);

            if (fs.existsSync(outputPath)) {
              videoBuffer = fs.readFileSync(outputPath);
              fs.unlinkSync(outputPath);
            }
          } catch (ffmpegErr) {
            console.log(
              `[PinVid] FFmpeg error for video ${i + 1}:`,
              ffmpegErr.message,
            );
            continue;
          }
        } else {
          const videoRes = await axios.get(videoUrl, {
            responseType: "arraybuffer",
            timeout: 60000,
          });
          videoBuffer = Buffer.from(videoRes.data);
        }

        if (videoBuffer && videoBuffer.length > 1000) {
          mediaList.push({
            video: videoBuffer,
          });
        }
      } catch (vidErr) {
        console.log(
          `[PinVid] Failed to process video ${i + 1}:`,
          vidErr.message,
        );
      }
    }

    if (mediaList.length === 0) {
      return m.reply(raraError("PinVid", "Gagal download video nih"));
    }


    try {
      const opener = generateWAMessageFromContent(
        m.chat,
        {
          messageContextInfo: { messageSecret: crypto.randomBytes(32) },
          albumMessage: {
            expectedImageCount: 0,
            expectedVideoCount: mediaList.length,
          },
        },
        {
          userJid: jidNormalizedUser(sock.user.id),
          quoted: m,
          upload: sock.waUploadToServer,
        },
      );

      await sock.relayMessage(opener.key.remoteJid, opener.message, {
        messageId: opener.key.id,
      });

      for (const content of mediaList) {
        const msg = await generateWAMessage(opener.key.remoteJid, content, {
          upload: sock.waUploadToServer,
        });

        msg.message.messageContextInfo = {
          messageSecret: crypto.randomBytes(32),
          messageAssociation: {
            associationType: 1,
            parentMessageKey: opener.key,
          },
        };

        await sock.relayMessage(msg.key.remoteJid, msg.message, {
          messageId: msg.key.id,
        });
      }
    } catch (albumErr) {
      console.log(
        "[PinVid] Album message failed, sending individually:",
        albumErr.message,
      );

      const saluranId = config.saluran?.id || "@newsletter";
      const saluranName =
        config.saluran?.name || config.bot?.name || "Rara-AI";

      for (const content of mediaList) {
        await sock.sendMessage(
          m.chat,
          {
            video: content.video,
            caption: content.caption,
            contextInfo: {
              forwardingScore: 0,
              isForwarded: false,
            },
          },
          { quoted: m },
        );
      }
    }
  } catch (error) {
    console.error("[PinVid] Error:", error.message);
    m.reply(raraWrap("pinvid", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
