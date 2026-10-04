// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ringtone.js — Search & download ringtone (meloboom scrape, no API)
import axios from "axios";
import * as cheerio from "cheerio";
import { raraBox, raraError, raraGuide, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

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
  name: "ringtone",
  alias: ["ringtone", "ringtonedl"],
  category: "download",
  description: "Search dan download ringtone",
  usage: ".ringtone <query>",
  example: ".ringtone iphone",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

const BASE_URL = "https://meloboom.com";

async function searchRingtone(query) {
  const { data } = await axios.get(`${BASE_URL}/en/search/${encodeURIComponent(query)}`, {
    headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36" },
    timeout: 15000,
  });
  const $ = cheerio.load(data);
  const results = [];

  $("ul > li").each((i, el) => {
    const title = $(el).find("h4").text().trim();
    const link = $(el).find("a").attr("href");
    const audio = $(el).find("audio").attr("src");
    if (title && audio) {
      results.push({ title, source: link ? `${BASE_URL}/${link}` : null, audio });
    }
  });

  return results;
}

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const query = m.args?.join(" ").trim();
    if (!query) {
      return m.reply(raraGuide("Ringtone", "Masukkan kata kunci ringtone!", ".ringtone iphone"));
    }

    const results = await searchRingtone(query);
    if (!results.length) {
      await m.react("❌");
      return m.reply(raraError("Ringtone", `Ringtone tidak ditemukan untuk: *${query}*`));
    }

    // Download ringtone pertama
    const first = results[0];
    const audioRes = await axios.get(first.audio, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const buffer = Buffer.from(audioRes.data);

    await sock.sendMessage(m.chat, {
      audio: buffer,
      mimetype: "audio/mpeg",
      ptt: false,
      fileName: `${first.title}.mp3`,
    }, { quoted: m });

    try {
      const info = await probeBuffer(buffer, { mime: "audio/mpeg" });
      const card = mediaResultCard({
        header: pluginConfig.name,
        type: "audio",
        title: first.title || "Ringtone",
        platform: "Meloboom",
        request: [["Kata Kunci", query]],
        size: info.size, mime: info.mime, duration: info.duration,
      });
      if (card) await m.reply(card);
    } catch { /* best-effort */ }

    // List hasil lainnya
    const lines = [`Hasil: ${query}`, ""];
    results.slice(0, 10).forEach((item, i) => {
      lines.push(`${i + 1}. ${item.title}`);
    });

    await m.reply(raraBox("Ringtone", lines));
    await m.react("🐣");
  } catch (err) {
    console.error("[Ringtone]", err);
    await m.react("❌");
    m.reply(raraGagal("Ringtone"));
  }
}

export { pluginConfig as config, handler };
