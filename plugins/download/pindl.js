// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import { pinterestdl } from "../../src/lib/nova-pinterest.js";
import path from "path";
import { queueFFmpeg } from "../../src/lib/nova-ffmpeg.js";
import { f } from "../../src/lib/nova-http.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

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
    return m.reply(novaGuide("Pinterest DL", "Masukkan URL Pinterest yang ingin kamu unduh!", `${m.prefix}pindl https://pin.it/xxx`));
  }
  if (!url.includes("pinterest") && !url.includes("pin.it")) {
    return m.reply(novaError("Pinterest DL", "URL tidak valid. Pastikan pakai link Pinterest (pin.it atau pinterest.com)!"));
  }
  m.react("🕒");
  try {
    const result = await pinterestdl(url);
    if (!result || !result.media || result.media.length === 0) {
      return m.reply(novaEmpty("Pinterest DL", "Tidak ada media yang ditemukan dari link Pinterest tersebut."));
    }
    for (const media of result.media) {
      if (media.type === "video") {
        await sock.sendMedia(m.chat, media.url, null, m, {
          type: "video",
          contextInfo: {
            forwardingScore: 0,
            isForwarded: false,
          },
        });
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
            if (!raw) throw new Error("Gagal download GIF");
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
          await sock.sendMedia(m.chat, media.url, null, m, {
            type: "image",
            contextInfo: {
              forwardingScore: 0,
              isForwarded: false,
            },
          });
        }
      }
    }
    m.react("🐣");
  } catch (error) {
    console.error("[PinDL] Error:", error);
    m.reply(novaError("Pinterest DL", `Gagal mengunduh media Pinterest — ${error.message || 'terjadi kesalahan'}`));
  }
}
export { pluginConfig as config, handler };