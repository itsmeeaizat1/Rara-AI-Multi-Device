// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// facebookdl — Download video Facebook
// Primary: IkyyXD /download/facebook → all-in-one | Fallback: btch-downloader
import { ikyyDownload } from "../../src/scraper/ikyydl.js";
import { fbdown } from "btch-downloader";
import te from "../../src/lib/nova-error.js";
import { novaDlUsage, claraWrap, claraLine, toSC, novaError, novaEmpty, novaGuide, novaNoInput, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

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
  name: "facebookdl",
  alias: ["facebookdl"],
  category: "download",
  description: "Download video Facebook",
  usage: ".facebookdl <url>",
  example: ".facebookdl https://www.facebook.com/watch?v=xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const url = m.text?.trim();
  if (!url) {
    return m.reply(novaDlUsage("Facebook", {
      prefix: m.prefix,
      command: m.command || "facebookdl",
      cara: [`${m.prefix}${m.command || "facebookdl"} [link]`],
      contoh: [`${m.prefix}${m.command || "facebookdl"} https://www.facebook.com/watch?v=xxx`],
    }));
  }
  if (!url.match(/facebook\.com|fb\.watch|fb\.com/i)) {
    return m.reply(novaGuide("Facebook DL", "URL-nya gak valid nih! Pakai link Facebook ya.", `${m.prefix}facebookdl https://www.facebook.com/watch?v=xxx`));
  }

  try {
    await m.react("🕒");

    // Step 1: Try IkyyXD (facebook endpoint → all-in-one fallback)
    const result = await ikyyDownload(url, "facebook");

    if (result?.medias?.length) {
      const video = result.medias.find(m => m.type === "video") || result.medias[0];
      await m.react("🐣");
      return await sock.sendMedia(m.chat, video.url, result.title || null, m, {
        type: "video",
        contextInfo: { forwardingScore: 0, isForwarded: false },
      });
    }

    // Step 2: Fallback to btch-downloader
    console.log("[facebookdl.js] IkyyXD failed, falling back to btch-downloader...");
    try {
      const data = await fbdown(url);
      if (data?.status) {
        const videoUrl = data?.HD || data?.hd || data?.SD || data?.sd || data?.url;
        if (videoUrl) {
          await m.react("🐣");
          await sock.sendMedia(m.chat, videoUrl, data?.title || null, m, {
            type: "video",
            contextInfo: { forwardingScore: 0, isForwarded: false },
          });
          await m.reply(novaBerhasil("facebookdl"));
          return;
        }
      }
    } catch (e) {
      console.error("[facebookdl.js] btch fallback failed:", e.message);
    }

    await m.react("❌");
    return m.reply(novaGagal("Facebook DL"));
  } catch (error) {
    console.error("[facebookdl.js]:", error.message);
    await m.react("❌");
    return m.reply(novaError("Facebook DL", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
