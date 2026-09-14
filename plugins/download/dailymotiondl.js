// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { mediaPreviewCard } from "../../src/lib/nova-media-card.js";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import path from "path";
import { DailymotionDL } from "../../src/scraper/dailymotion.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

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
        await m.react("🕒");
    const result = await DailymotionDL(text);

    if (!result.status) {
      return m.reply(novaGagal("Dailymotion"));
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
        contextInfo: mediaPreviewCard({ title: result.title || "Dailymotion Video", body: "Dailymotion", sourceUrl: text, thumbnailUrl: result.thumbnail }),
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
          contextInfo: mediaPreviewCard({ title: result.title || "Dailymotion Video", body: "Dailymotion • MP4", sourceUrl: text, thumbnailUrl: result.thumbnail || "" }),
          mimetype: "video/mp4",
          fileName:
            (result.title || "video").replace(/[<>:"/\\|?*]/g, "") + ".mp4",
          caption,
        },
        { quoted: m },
      );
      await m.react("🐣"); await m.react("🐣"); m.reply(novaBerhasil("Dailymotion"));
      await offerConvert(sock, m, { buffer, type: "video", platform: "Dailymotion", title: result.title, sourceUrl: text });
    }
  } catch (e) {
    console.error(e);
    m.reply(novaGangguan("Dailymotion"));
  }
}

export { pluginConfig as config, handler };
