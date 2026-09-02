// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import path from "path";
import { DailymotionDL } from "../../src/scraper/dailymotion.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, mediaCaption } from "../../src/lib/nova-menu-style.js";

const exec = promisify(execFile);

const pluginConfig = {
  name: "dailymotiondl",
  alias: ["dailymotiondl"],
  category: "download",
  description: "Download video dari Dailymotion",
  usage: ".dailymotiondl <url>",
  example: ".dailymotiondl https://www.dailymotion.com/video/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.text?.trim();
  if (!text) {
    return m.reply( `🎬 *ᴅᴀɪʟʏᴍᴏᴛɪᴏɴ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*\n\n` +
        `Download video dari Dailymotion, otomatis dikonversi ke MP4.\n\n` +
        `*ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*\n` +
        `*${m.prefix}dailymotiondl <link>*\n\n` +
        `*ᴄᴏɴᴛᴏʜ:*\n` +
        `*${m.prefix}dailymotiondl https://www.dailymotion.com/video/xxx*\n\n` +
        `_Proses konversi mungkin agak lama_`, "dailymotiondl");
  }
  try {
    const result = await DailymotionDL(text);

    if (!result.status) {
      return m.reply(novaError("Dailymotion", result.error || "Gagal download nih"));
    }

    const caption = mediaCaption({
      platformIcon: "🎬", platformName: "Dailymotion",
      title: result.title || "Dailymotion Video",
      duration: result.duration || null,
      format: result.quality || "Video",
      method: "dailymotion",
    });

    if (result.thumbnail) {
      await sock.sendMessage(m.chat, {
        image: { url: result.thumbnail }, caption,
      }, { quoted: m });
    }

    if (result.video) {
      const tmpFile = path.join(os.tmpdir(), `dm_${Date.now()}.mp4`);

      await exec(
        "ffmpeg",
        [
          "-y",
          "-i",
          result.video,
          "-c",
          "copy",
          "-bsf:a",
          "aac_adtstoasc",
          tmpFile,
        ],
        { timeout: 120000 },
      );

      const buffer = fs.readFileSync(tmpFile);
      fs.unlinkSync(tmpFile);

      await sock.sendMessage(
        m.chat,
        {
          document: buffer,
          mimetype: "video/mp4",
          fileName:
            (result.title || "video").replace(/[<>:"/\\|?*]/g, "") + ".mp4",
          caption,
        },
        { quoted: m },
      );
    }
  } catch (e) {
    console.error(e);
    m.reply(novaError("Dailymotion", "Gagal ambil data — coba lagi ya"));
  }
}

export { pluginConfig as config, handler };
