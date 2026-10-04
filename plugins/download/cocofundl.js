// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { cocofun } from 'btch-downloader'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
// kartu info media (batch download) — helper ringkas, best-effort tak pernah ganggu kirim
async function dlCard(type, probe, request) {
  try {
    const info = probe.buffer != null ? await probeBuffer(probe.buffer, { mime: probe.mime }) : await probeMedia(probe.url);
    return mediaResultCard({
      header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
      type, request,
      size: info?.size, mime: info?.mime, width: info?.width, height: info?.height, duration: info?.duration,
    });
  } catch { return null; }
}


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
    name: 'cocofundl',
    alias: ["cocofundl", "cfdl"],
    category: 'download',
    description: 'Download video CocoFun',
    usage: '.cfdl <url>',
    example: '.cfdl https://www.cocofun.com/share/post/xxx',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const url = m.text?.trim()
    
    if (!url) {
        return m.reply(raraGuide('CocoFun', 'Mau download video CocoFun? Kasih linknya ya!', `${m.prefix}cfdl https://www.cocofun.com/share/post/xxx`))
    }
    
    if (!url.match(/cocofun\.com/i)) {
        return m.reply(raraGuide('CocoFun', 'URL-nya gak valid nih! Pakai link CocoFun ya.', `${m.prefix}cfdl https://www.cocofun.com/share/post/xxx`))
    }
    try {
        await m.react("🕒");
        const data = await cocofun(url)
        
        if (!data?.status || !data?.result) {
            return m.reply(raraError('CocoFun', 'Gagal ambil video — coba link lain ya'))
        }
        
        const result = data.result
        const videoUrl = result.no_watermark || result.watermark
        
        if (!videoUrl) {
            return m.reply(raraEmpty('CocoFun', 'Video-nya gak nemu nih'))
        }
        
        const _cap = mediaCaption({ platformIcon: "🥥", platformName: "CocoFun", title: "CocoFun Video", format: "Video", method: "btch-downloader" });
        await sock.sendMessage(m.chat, {
          video: { url: videoUrl }, caption: ((await dlCard("video", { url: videoUrl }, [["Judul", "CocoFun Video"], ["Watermark", result.no_watermark ? "tanpa watermark" : "ada watermark"]])) || _cap),
          contextInfo: { forwardingScore: 0, isForwarded: false },
        }, { quoted: m });
        await m.react("🐣"); await m.react("🐣"); m.reply(raraBerhasil("Cocofundl"));
    } catch (err) {
        return m.reply(raraError('CocoFun', 'Ada error nih, coba lagi ya'))
    }
}

export { pluginConfig as config, handler }
