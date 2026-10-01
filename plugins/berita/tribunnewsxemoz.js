// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap } from "../../src/lib/nova-menu-style.js";

/**
 * plugins/news/tribunnewsxemoz.js
 * Command .tribunnewsxemoz — Berita Tribunnews via API xemoz
 * Kirim gambar berita + caption (judul + link tanpa preview)
 * API: https://api-xemoz-official.my.id/api/news/news-tribun.php?search=<query>
 */

const pluginConfig = {
  name: "tribunnewsxemoz",
  alias: ["tribunnewsxemoz"],
  category: "berita",
  description: "Berita Tribunnews via API xemoz",
  usage: ".tribunnewsxemoz <kata kunci>\n.tribunnewsxemoz (tanpa argumen = headline)",
  example: ".tribunnewsxemoz olahraga",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const API_URL = "https://api-xemoz-official.my.id/api/news/news-tribun.php";
const MAX_ARTICLES = 5;

async function fetchTribunNews(search) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);

  const res = await fetch(`${API_URL}?${params}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30000),
  });

  let data;
  try { data = await res.json(); } catch {
    throw new Error("Response server tidak dapat dibaca.");
  }

  if (!res.ok || !data?.status) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }

  return data?.result || null;
}

function getAllArticles(data) {
  const all = [];
  const sections = [
    ...(data.headline || []),
    ...(data.latest || []),
    ...(data.trending || []),
  ];
  // Dedup by title
  const seen = new Set();
  for (const a of sections) {
    if (a.title && !seen.has(a.title)) {
      seen.add(a.title);
      all.push(a);
    }
  }
  return all;
}

async function sendNewsImage(sock, m, article, index, total) {
  const caption = `${index + 1}/${total} — ${article.title}\n\n${article.link || ""}`;

  // If article has image, send as image with caption (no link preview)
  if (article.image) {
    try {
      const imgRes = await fetch(article.image, {
        signal: AbortSignal.timeout(15000),
      });
      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        await sock.sendMessage(
          m.chat,
          { image: buffer, caption },
          { quoted: m }
        );
        return;
      }
    } catch (e) { console.error('[tribunnewsxemoz.js]:', e.message); }
  }

  // Fallback: text only, no link preview
  await sock.sendMessage(
    m.chat,
    {
      text: caption,
      linkPreview: { url: "" },
    },
    { quoted: m }
  );
}

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  const search = text || "";
  try {
    await m.react("🕒");
    const result = await fetchTribunNews(search);
    if (!result) throw new Error("Data berita kosong.");

    const data = result.data || {};
    const articles = getAllArticles(data);

    if (articles.length === 0) {
      return m.reply(novaWrap("Tribunnews", `Tidak ada berita ditemukan untuk "${search}".`));
    }

    const header = search
      ? `Tribunnews — ${articles.length} berita untuk "${search}"`
      : `Tribunnews — ${articles.length} headline`;

    await m.react("🐣");
    // Send header text first (no preview)
    await m.reply(novaWrap("Tribunnews", header));

    // Send each article as image + caption
    const toSend = articles.slice(0, MAX_ARTICLES);
    for (let i = 0; i < toSend.length; i++) {
      await sendNewsImage(sock, m, toSend[i], i, toSend.length);
    }
  } catch (error) {
    await m.react("❌");
    return m.reply(novaWrap("Tribunnews Error", error.message || "Gagal ambil nih berita."));
  }
}

export { pluginConfig as config, handler };
