// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-rss-news.js — Engine berita RSS (fallback siputzx mati)
// Sumber langsung: RSS situs berita (lebih stabil dr 3rd-party API) + Google News RSS
// untuk situs yang gak punya RSS publik.
import Parser from "rss-parser";

const parser = new Parser({
  headers: {
    "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
  timeout: 15000,
});

// Google News RSS helpers
export const gnews = {
  // berita top Indonesia
  top: "https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id",
  // berita yang ngebahas keyword
  query: (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=id&gl=ID&ceid=ID:id`,
  // berita dari situs tertentu
  site: (domain) => `https://news.google.com/rss/search?q=${encodeURIComponent("site:" + domain)}&hl=id&gl=ID&ceid=ID:id`,
};

/**
 * Ambil daftar berita dari feed RSS/Atom.
 * @param {string} feedUrl URL RSS
 * @param {number} limit jumlah item (default 8)
 * @returns {Promise<Array<{title: string, link: string}>>}
 */
export async function fetchNewsList(feedUrl, limit = 8) {
  const res = await fetch(feedUrl, {
    signal: AbortSignal.timeout(15000),
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
  });
  if (!res.ok) throw new Error(`RSS ${res.status}`);
  const xml = await res.text();
  const parsed = await parser.parseString(xml);
  const items = (parsed.items || [])
    .map((it) => ({
      title: String(it.title || "").trim(),
      link: String(it.link || it.url || "").trim(),
    }))
    .filter((it) => it.title);
  if (!items.length) throw new Error("RSS kosong");
  return items.slice(0, limit);
}
