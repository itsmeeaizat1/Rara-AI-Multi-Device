// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ringtone.js — Search & download ringtone (meloboom scrape, no API)
import axios from "axios";
import * as cheerio from "cheerio";
import { novaBox, novaError, novaGuide, mediaCaption } from "../../src/lib/nova-menu-style.js";

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
      return m.reply(novaGuide("Ringtone", "Masukkan kata kunci ringtone!", ".ringtone iphone"));
    }

    const results = await searchRingtone(query);
    if (!results.length) {
      await m.react("❌");
      return m.reply(novaError("Ringtone", `Ringtone tidak ditemukan untuk: *${query}*`));
    }

    // Download ringtone pertama
    const first = results[0];
    const audioRes = await axios.get(first.audio, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const buffer = Buffer.from(audioRes.data);

    const _cap = mediaCaption({
      platformIcon: "🔔", platformName: "Ringtone",
      title: first.title,
      format: "MP3 Audio",
      method: "meloboom",
    });
    await m.reply(_cap);

    await sock.sendMessage(m.chat, {
      audio: buffer,
      mimetype: "audio/mpeg",
      ptt: false,
      fileName: `${first.title}.mp3`,
    }, { quoted: m });

    // List hasil lainnya
    const lines = [`Hasil: ${query}`, ""];
    results.slice(0, 10).forEach((item, i) => {
      lines.push(`${i + 1}. ${item.title}`);
    });

    await m.reply(novaBox("Ringtone", lines));
    await m.react("🐣");
  } catch (err) {
    console.error("[Ringtone]", err);
    await m.react("❌");
    m.reply(novaError("Ringtone", "Gagal mencari ringtone. Coba lagi nanti!"));
  }
}

export { pluginConfig as config, handler };
