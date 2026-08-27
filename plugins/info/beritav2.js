// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// beritav2.js — Berita via NewsAPI.org + NewsData.io fallback (needs API key)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import config from "../../config.js";

const pluginConfig = {
  name: "beritav2",
  alias: ["beritav2"],
  category: "info",
  description: "Berita terkini dari NewsAPI & NewsData (global + Indonesia)",
  usage: ".beritav2 [topik] atau .beritav2 id (berita Indonesia)",
  example: ".beritav2 teknologi\n.beritav2 id\n.beritav2",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 20,
  energi: 2,
  isEnabled: true,
};

const aiConfig = config.aiHelp || {};

async function fetchNewsAPI(query, isIndonesia) {
  const key = aiConfig.newsApiKey || config.newsApiKey || "";
  if (!key) return null;

  let url;
  if (query && query !== "id") {
    url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${key}&pageSize=8&sortBy=publishedAt&language=${isIndonesia ? "id" : "en"}`;
  } else {
    url = `https://newsapi.org/v2/top-headlines?country=${isIndonesia ? "id" : "us"}&apiKey=${key}&pageSize=8`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`NewsAPI ${res.status}`);
  const json = await res.json();
  return (json.articles || []).map(a => ({
    title: a.title,
    source: a.source?.name || "Unknown",
    url: a.url,
    publishedAt: a.publishedAt,
  }));
}

async function fetchNewsData(query, isIndonesia) {
  const key = aiConfig.newsDataKey || config.newsDataKey || "";
  if (!key) return null;

  let url;
  if (query && query !== "id") {
    url = `https://newsdata.io/api/1/news?q=${encodeURIComponent(query)}&apikey=${key}&size=8&country=id`;
  } else {
    url = `https://newsdata.io/api/1/news?country=id&apikey=${key}&size=8`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`NewsData ${res.status}`);
  const json = await res.json();
  return (json.results || []).map(a => ({
    title: a.title,
    source: a.source_id || "Unknown",
    url: a.link,
    publishedAt: a.pub_date,
  }));
}

function formatNews(items) {
  return items.slice(0, 8).map((n, i) => {
    const date = n.publishedAt ? new Date(n.publishedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "";
    return `${i + 1}. ${n.title}\n   ${n.source} | ${date}\n   ${n.url || ""}`;
  }).join("\n\n");
}

async function handler(m, { sock, config: botConfig, db }) {
  try {
    const input = m.args?.join(" ") || "";
    const isIndonesia = input.toLowerCase() === "id" || input === "";
    const query = input.toLowerCase() === "id" ? "" : input;

    await m.react("🕒");

    let news = null;
    let source = "";

    // Try NewsAPI first
    try {
      news = await fetchNewsAPI(query, isIndonesia);
      if (news && news.length) source = "NewsAPI.org";
    } catch (e) {
      console.log("[beritav2] NewsAPI failed:", e.message);
    }

    // Fallback to NewsData
    if (!news || !news.length) {
      try {
        news = await fetchNewsData(query, isIndonesia);
        if (news && news.length) source = "NewsData.io";
      } catch (e) {
        console.log("[beritav2] NewsData failed:", e.message);
      }
    }

    if (!news || !news.length) {
      await m.react("🐣");
      return m.reply(claraWrap("Berita v2", [
        "Tidak ada API key berita yang aktif.",
        "",
        "Set API key di config.js:",
        "• newsApiKey (NewsAPI.org — free 100 req/day)",
        "• newsDataKey (NewsData.io — free 200 req/day)",
        "",
        `Atau gunakan ${m.prefix}berita (via Google search)`,
      ]));
    }

    await m.react("🐣");
    const heading = isIndonesia ? "Berita Indonesia" : query ? `Berita: "${query}"` : "Berita Global";
    return m.reply(claraWrap("Berita v2", [
      `${heading} (${source})`,
      "",
      formatNews(news),
    ]));
  } catch (e) {
    console.error("[beritav2] error:", e.message);
    await m.react("❌");
    return m.reply(te(m.prefix, m.command, m.pushName), "beritav2");
  }
}

export { pluginConfig as config, handler };
