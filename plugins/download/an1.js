// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// an1.js — Search game mod dari AN1 (direct scrape, no API)
import axios from "axios";
import * as cheerio from "cheerio";
import { novaBox, novaError, novaGuide, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "an1",
  alias: ["an1", "an1dl"],
  category: "download",
  description: "Search game mod dari AN1",
  usage: ".an1 <nama_game>",
  example: ".an1 minecraft",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

const BASE_URL = "https://an1.com";

async function scrapeAN1(query) {
  const { data } = await axios.get(`${BASE_URL}/?s=${encodeURIComponent(query)}`, {
    headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36" },
    timeout: 15000,
  });
  const $ = cheerio.load(data);
  const results = [];

  $(".post-item, .list-item, article").each((i, el) => {
    const title = $(el).find(".entry-title a, h2 a, h3 a, a.title").text().trim() || $(el).find("a").attr("title");
    const link = $(el).find(".entry-title a, h2 a, h3 a, a.title").attr("href");
    if (title && link) {
      results.push({ title, url: link });
    }
  });

  // Fallback: parse semua link ke .html
  if (results.length === 0) {
    $("a[href*='.html']").each((i, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr("href");
      if (title && title.length > 3 && link && link.includes(BASE_URL)) {
        results.push({ title, url: link });
      }
    });
  }

  return results;
}

async function getDownloadPage(url) {
  const { data } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36" },
    timeout: 15000,
  });
  const $ = cheerio.load(data);

  const downloadLinks = [];
  $("a[href*='download'], a[href*='.apk'], a.btn").each((i, el) => {
    const link = $(el).attr("href");
    if (link && (link.includes(".apk") || link.includes("download"))) {
      downloadLinks.push({ text: $(el).text().trim(), url: link });
    }
  });

  // Cari versi dan info
  const version = $(".version, .info-version").first().text().trim();
  const size = $(".size, .info-size").first().text().trim();

  return { downloadLinks, version, size };
}

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const query = m.args?.join(" ").trim();
    if (!query) {
      return m.reply(novaGuide("AN1", "Masukkan nama game yang mau dicari!", ".an1 minecraft"));
    }

    const results = await scrapeAN1(query);
    if (!results.length) {
      await m.react("❌");
      return m.reply(novaError("AN1", `Game tidak ditemukan untuk: *${query}*`));
    }

    const lines = [`Hasil pencarian: ${query}`, ""];
    results.slice(0, 8).forEach((item, i) => {
      lines.push(`${i + 1}. ${item.title}`);
      lines.push(`Link: ${item.url}`);
    });

    await m.reply(novaBox("AN1 Search", lines));
    await m.react("🐣");
  } catch (err) {
    console.error("[AN1]", err);
    await m.react("❌");
    m.reply(novaGagal("AN1"));
  }
}

export { pluginConfig as config, handler };
