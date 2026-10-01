// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import { raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";
import { raraWrap } from '../../src/lib/rara-menu-style.js'

const pluginConfig = {
  name: "kompasnews",
  alias: ["kompasnews"],
  aliases: ["kompasnews", "kompas", "kompascom"],
  category: "berita",
  description: "Berita terbaru Kompas.com (RSS scraping, no API key)",
  usage: ".kompasnews | .kompasnews <kategori> | .kompasnews list",
  example: ".kompasnews | .kompasnews nasional | .kompasnews list",
  isGroupOnly: false,
};

const CATEGORIES = {
  "terbaru": "https://www.kompas.com/rss",
  "nasional": "https://www.kompas.com/rss/nasional.xml",
  "internasional": "https://www.kompas.com/rss/internasional.xml",
  "ekonomi": "https://www.kompas.com/rss/ekonomi.xml",
  "olahraga": "https://www.kompas.com/rss/olahraga.xml",
  "teknologi": "https://www.kompas.com/rss/tekno.xml",
  "hiburan": "https://www.kompas.com/rss/entertainment.xml",
  "otomotif": "https://www.kompas.com/rss/otomotif.xml",
  "sains": "https://www.kompas.com/rss/sains.xml",
  "edukasi": "https://www.kompas.com/rss/edukasi.xml",
  "lifestyle": "https://www.kompas.com/rss/lifestyle.xml",
  "travel": "https://www.kompas.com/rss/travel.xml",
  "food": "https://www.kompas.com/rss/food.xml",
  "health": "https://www.kompas.com/rss/health.xml",
  "properti": "https://www.kompas.com/rss/properti.xml",
};

function stripHTML(str) {
  return str.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function parseRSS(xml, limit = 10) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  let count = 0;
  while ((match = itemRegex.exec(xml)) !== null && count < limit) {
    const block = match[1];
    const title = (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]>/) || block.match(/<title>([\s\S]*?)<\/title>/))?.[1] || '';
    const link = (block.match(/<link>([\s\S]*?)<\/link>/))?.[1] || '';
    const desc = (block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]>/) || block.match(/<description>([\s\S]*?)<\/description>/))?.[1] || '';
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/))?.[1] || '';
    items.push({
      title: stripHTML(title),
      link: link.trim(),
      desc: stripHTML(desc).slice(0, 120),
      date: pubDate.trim(),
    });
    count++;
  }
  return items;
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = (args[0] || "").toLowerCase().trim();

    if (input === "list" || input === "kategori") {
      return m.reply(raraWrap("Kompas.com", [
        "Kategori tersedia:",
        Object.keys(CATEGORIES).map((k, i) => (i + 1) + ". " + k).join("\n"),
        "",
        "Contoh: " + usedPrefix + "kompasnews sains",
      ].join("\n")));
    }

    let url = CATEGORIES.terbaru;
    if (input && CATEGORIES[input]) {
      url = CATEGORIES[input];
    }

    const res = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      responseType: 'text',
    });

    const items = parseRSS(res.data, 10);
    if (!items.length) return m.reply(raraWrap("Kompas.com", "Gagal ambil nih berita. Coba lagi nanti."));

    const catName = input && CATEGORIES[input] ? input : "terbaru";
    let newsText = [];
    newsText.push("Kompas.com - " + catName.toUpperCase());
    newsText.push("");
    items.forEach((item, i) => {
      newsText.push((i + 1) + ". " + item.title);
      newsText.push("   " + item.link);
      if (item.desc) newsText.push("   " + item.desc + "...");
      newsText.push("");
    });

    return m.reply(raraWrap("Kompas News", newsText.join("\n")));
  } catch (e) {
    console.error("kompasnews error:", e.message);
    return m.reply(raraWrap("Kompas.com", "Gagal ambil nih berita: " + e.message));
  }
}

export { pluginConfig as config, handler };
