// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// happymod.js — Search game mod dari Happymod (direct scrape, no API)
import axios from "axios";
import * as cheerio from "cheerio";
import { raraBox, raraError, raraGuide, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "happymod",
  alias: ["happymod", "hmdl"],
  category: "download",
  description: "Search game/app mod dari Happymod",
  usage: ".happymod <nama_app>",
  example: ".happymod minecraft",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

const BASE_URL = "https://happymod.com";

async function searchHappymod(query) {
  const { data } = await axios.get(`${BASE_URL}/search.html?q=${encodeURIComponent(query)}`, {
    headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36" },
    timeout: 15000,
  });
  const $ = cheerio.load(data);
  const results = [];

  $(".search-item, .commodity-item, .pdt-item, article").each((i, el) => {
    const title = $(el).find(".title, h3, h2, a.title").text().trim() || $(el).find("a").attr("title");
    const link = $(el).find("a").attr("href");
    const img = $(el).find("img").attr("src") || $(el).find("img").attr("data-original");
    if (title && link) {
      results.push({ title, url: link.startsWith("http") ? link : `${BASE_URL}${link}`, thumbnail: img });
    }
  });

  // Fallback: semua link ke .html
  if (results.length === 0) {
    $("a[href*='.html']").each((i, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr("href");
      if (title && title.length > 3 && link && !link.includes("search.html")) {
        results.push({ title, url: link.startsWith("http") ? link : `${BASE_URL}${link}` });
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
  $("a[href*='download'], a.btn-download, .download-btn a").each((i, el) => {
    const link = $(el).attr("href");
    if (link) downloadLinks.push({ text: $(el).text().trim(), url: link.startsWith("http") ? link : `${BASE_URL}${link}` });
  });

  const version = $(".version, .info-row .ver").first().text().trim();
  const size = $(".size, .info-row .size").first().text().trim();
  const mod = $(".mod-info, .feature").first().text().trim();

  return { downloadLinks, version, size, mod };
}

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const query = m.args?.join(" ").trim();
    if (!query) {
      return m.reply(raraGuide("Happymod", "Masukkan nama game/app!", ".happymod minecraft"));
    }

    const results = await searchHappymod(query);
    if (!results.length) {
      await m.react("❌");
      return m.reply(raraError("Happymod", `Tidak ditemukan untuk: *${query}*`));
    }

    const lines = [`Hasil pencarian: ${query}`, ""];
    results.slice(0, 8).forEach((item, i) => {
      lines.push(`${i + 1}. ${item.title}`);
      lines.push(`Link: ${item.url}`);
    });

    await m.reply(raraBox("Happymod Search", lines));
    await m.react("🐣");
  } catch (err) {
    console.error("[Happymod]", err);
    await m.react("❌");
    m.reply(raraGagal("Happymod"));
  }
}

export { pluginConfig as config, handler };
