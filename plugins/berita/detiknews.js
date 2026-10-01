// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import { raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";
import { raraWrap } from '../../src/lib/rara-menu-style.js'

const pluginConfig = {
  name: "detiknews",
  alias: ["detiknews"],
  aliases: ["detiknews", "detik", "detikcom"],
  category: "berita",
  description: "Berita terbaru Detik.com (RSS scraping, no API key)",
  usage: ".detiknews | .detiknews <kategori> | .detiknews list",
  example: ".detiknews | .detiknews detiknews | .detiknews list",
  isGroupOnly: false,
};

const CATEGORIES = {
  "terbaru": "https://www.detik.com/rss",
  "detiknews": "https://rss.detik.com/index.php/detiknews",
  "terpopuler": "https://rss.detik.com/index.php/terpopuler",
  "nasional": "https://rss.detik.com/index.php/news/nasional",
  "internasional": "https://rss.detik.com/index.php/news/internasional",
  "ekonomi": "https://rss.detik.com/index.php/finance",
  "olahraga": "https://rss.detik.com/index.php/sport",
  "teknologi": "https://rss.detik.com/index.php/inet",
  "hiburan": "https://rss.detik.com/index.php/entertainment",
  "otomotif": "https://rss.detik.com/index.php/otomotif",
  "travel": "https://rss.detik.com/index.php/travel",
  "food": "https://rss.detik.com/index.php/food",
  "health": "https://rss.detik.com/index.php/health",
};

function stripHTML(str) {
  return str.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
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
      return m.reply(raraWrap("Detik.com", [
        "Kategori tersedia:",
        Object.keys(CATEGORIES).map((k, i) => (i + 1) + ". " + k).join("\n"),
        "",
        "Contoh: " + usedPrefix + "detiknews ekonomi",
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
    if (!items.length) return m.reply(raraWrap("Detik.com", "Gagal ambil nih berita. Coba lagi nanti."));

    const catName = input && CATEGORIES[input] ? input : "terbaru";
    let newsText = [];
    newsText.push("Detik.com - " + catName.toUpperCase());
    newsText.push("");
    items.forEach((item, i) => {
      newsText.push((i + 1) + ". " + item.title);
      newsText.push("   " + item.link);
      if (item.desc) newsText.push("   " + item.desc + "...");
      newsText.push("");
    });

    return m.reply(raraWrap("Detik News", newsText.join("\n")));
  } catch (e) {
    console.error("detiknews error:", e.message);
    return m.reply(raraWrap("Detik.com", "Gagal ambil nih berita: " + e.message));
  }
}

export { pluginConfig as config, handler };
