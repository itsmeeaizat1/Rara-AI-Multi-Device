// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// googlesearch.js — Google search via DuckDuckGo (scrape, no API key)
import axios from "axios";
import { raraBox, raraError, raraGuide, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "googlesearch",
  alias: ["googlesearch", "gsearch", "google"],
  category: "download",
  description: "Cari di Google via DuckDuckGo",
  usage: ".googlesearch <query>",
  example: ".googlesearch cara membuat nasi goreng",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function ddgSearch(query) {
  const { data } = await axios.post("https://html.duckduckgo.com/html/", `q=${encodeURIComponent(query)}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    timeout: 15000,
  });

  const results = [];
  // DDG HTML: result__a links + result__snippet
  const linkRegex = /result__a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g;
  const snippetRegex = /result__snippet[^>]*>(.*?)<\/a>/g;

  const links = [...data.matchAll(linkRegex)];
  const snippets = [...data.matchAll(snippetRegex)];

  links.forEach((m, i) => {
    let url = m[1];
    if (url.includes("uddg=")) {
      url = decodeURIComponent(url.split("uddg=")[1].split("&")[0]);
    }
    const title = m[2]?.replace(/<[^>]*>/g, "").trim();
    const snippet = snippets[i]?.[1]?.replace(/<[^>]*>/g, "").trim() || "";
    if (title && url) results.push({ title, url, snippet });
  });

  return results;
}

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const query = m.args?.join(" ").trim();
    if (!query) {
      return m.reply(raraGuide("Google Search", "Masukkan kata kunci pencarian!", ".googlesearch cara membuat nasi goreng"));
    }

    const results = await ddgSearch(query);
    if (!results.length) {
      await m.react("❌");
      return m.reply(raraError("Google Search", `Tidak ada hasil untuk: *${query}*`));
    }

    const lines = [`Query: ${query}`, ""];
    results.slice(0, 5).forEach((item, i) => {
      lines.push(`${i + 1}. ${item.title}`);
      if (item.snippet) lines.push(`${item.snippet.slice(0, 120)}`);
      lines.push(`${item.url}`);
      lines.push("");
    });

    await m.reply(raraBox("Google Search", lines));
    await m.react("🐣");
  } catch (err) {
    console.error("[GoogleSearch]", err);
    await m.react("❌");
    m.reply(raraGagal("Google Search"));
  }
}

export { pluginConfig as config, handler };
