// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// applemusicdl — Download lagu dari Apple Music via IkyyXD
// Primary: IkyyXD /download/applemusic | Fallback: manual info (no audio)
import { ikyyDl } from "../../src/scraper/ikyydl.js";
import { raraWrap, raraError, raraGuide, raraNoInput, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
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
  name: "applemusicdl",
  alias: ["applemusicdl", "amdl"],
  category: "download",
  description: "Download lagu dari Apple Music",
  usage: ".amdl <url>",
  example: ".amdl https://music.apple.com/id/song/1619595900",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  const url = m.text?.trim();

  if (!url) {
    return m.reply(raraGuide("AppleMusic DL", "Download lagu dari Apple Music! Kasih linknya ya!", `${m.prefix}amdl https://music.apple.com/id/song/xxx`));
  }

  if (!url.match(/music\.apple\.com/i)) {
    return m.reply(raraGuide("AppleMusic DL", "URL-nya gak valid nih! Pakai link Apple Music ya.", `${m.prefix}amdl https://music.apple.com/id/song/xxx`));
  }

  try {
    await m.react("🕒");

    // Try IkyyXD applemusic endpoint
    const result = await ikyyDl("applemusic", url);

    if (result?.medias?.length) {
      const audio = result.medias.find(m => m.type === "audio") || result.medias[0];

      await m.react("🐣");
      const _cap = mediaCaption({ platformIcon: "🍎", platformName: "Apple Music", title: result.title || "Apple Music Track", author: result.author || null, format: "🎵 MP3", method: "IkyyXD" });
      await m.reply(_cap);
      await sock.sendMessage(m.chat, {
        audio: { url: audio.url },
        mimetype: "audio/mpeg",
      }, { quoted: m });
      // kartu teks setelah audio (audio gak bisa caption)
      const musCard = await dlCard("audio", { url: audio.url }, [["Judul", String(result.title || "Apple Music Track").slice(0, 40)], ["Penyanyi", result.author || "-"]]);
      if (musCard) await m.reply(musCard);
    } else {
      await m.react("❌");
      await m.reply(raraWrap("AppleMusic DL", [
        "Gagal download — endpoint Apple Music sedang down.",
        "Coba lagi nanti atau gunakan .applemusic untuk cari lagunya dulu.",
      ].join("\n"), "error"));
      await m.reply(raraBerhasil("applemusicdl"));
    }
  } catch (error) {
    console.error("[applemusicdl.js]:", error.message);
    await m.react("❌");
    return m.reply(raraGangguan("AppleMusic DL"));
  }
}

export { pluginConfig as config, handler };
