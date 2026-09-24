// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { f } from "../../src/lib/nova-http.js";
import te from "../../src/lib/nova-error.js";
import { haidarTxt2img } from "../../src/scraper/haidar-ai.js";
import { claraWrap, toSC } from "../../src/lib/nova-menu-style.js";

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
  name: "text2imgv2",
  alias: ["text2imgv2", "text2img"],
  category: 'ai image',
  description: "Buat gambar dari teks",
  usage: ".text2img <teks>",
  example: ".text2img Buat gambar dari teks",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ");
  if (!text) {
    return m.reply(claraWrap("Text To Image", `Masukkan teks\n\n\`Contoh: ${m.prefix}text2img Buat gambar dari teks\``), "text2img");
  }
  try {
  await m.react("🕒");
    const content = await haidarTxt2img(text);
    const caption = mediaCaption({
      platformIcon: "🎨",
      platformName: "AI Image",
      title: text.slice(0, 60),
      format: "Image",
      method: "HaidarApis nano-banana",
    });
    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      image: { url: content },
      caption,
    }, { quoted: m });
  } catch (error) {
    console.error(error);
    m.reply(claraWrap("text2imgv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
