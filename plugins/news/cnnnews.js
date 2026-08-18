// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "cnnnews",
  aliases: ["cnnnews", "cnnews", "cnnindonesia"],
  category: "news",
  description: "Berita terbaru CNN Indonesia (RSS scraping, no API key)",
  usage: ".cnnnews | .cnnnews <kategori> | .cnnnews list",
  example: ".cnnnews | .cnnnews nasional | .cnnnews list",
  isGroupOnly: false,
};

const RSS_URL = "https://www.cnnindonesia.com/rss";
const CATEGORIES = {
  "terbaru": "https://www.cnnindonesia.com/rss/terbaru",
  "nasional": "https://rss.cnnindonesia.com/nasional",
  "internasional": "https://rss.cnnindonesia.com/internasional",
  "ekonomi": "https://rss.cnnindonesia.com/ekonomi",
  "olahraga": "https://rss.cnnindonesia.com/olahraga",
  "teknologi": "https://rss.cnnindonesia.com/teknologi",
  "hiburan": "https://rss.cnnindonesia.com/hiburan",
  "gaya hidup": "https://rss.cnnindonesia.com/gaya-hidup",
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
      return m.reply(claraWrap("CNN Indonesia", [
        "Kategori tersedia:",
        Object.keys(CATEGORIES).map((k, i) => (i + 1) + ". " + k).join("\n"),
        "",
        "Contoh: " + usedPrefix + "cnnnews nasional",
      ].join("\n")));
    }

    let url = RSS_URL;
    if (input && CATEGORIES[input]) {
      url = CATEGORIES[input];
    } else if (input && !CATEGORIES[input] && input !== "") {
      url = "https://www.cnnindonesia.com/rss/terbaru";
    }

    const res = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      responseType: 'text',
    });

    const items = parseRSS(res.data, 10);
    if (!items.length) return m.reply(claraWrap("CNN Indonesia", "Gagal mengambil berita. Coba lagi nanti."));

    const catName = input && CATEGORIES[input] ? input : "terbaru";
    let newsText = [];
    newsText.push("CNN Indonesia - " + catName.toUpperCase());
    newsText.push("");
    items.forEach((item, i) => {
      newsText.push((i + 1) + ". " + item.title);
      newsText.push("   " + item.link);
      if (item.desc) newsText.push("   " + item.desc + "...");
      newsText.push("");
    });

    return m.reply(claraWrap("CNN News", newsText.join("\n")));
  } catch (e) {
    console.error("cnnnews error:", e.message);
    return m.reply(claraWrap("CNN Indonesia", "Gagal mengambil berita: " + e.message));
  }
}

export default { pluginConfig, handler };
