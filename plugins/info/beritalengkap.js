// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Berita API — 5 source berita Indonesia via Andaraz API
// Source: antaranews, bbc, beritajakarta, bola, cnn
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "beritalengkap",
  alias: ["sumberberita", "news5", "berita5"],
  category: "info",
  description: "Berita Lengkap — 5 sumber berita Indonesia via Andaraz API",
  usage: ".beritalengkap <source> — Lihat berita\n.beritalengkap list — Lihat semua sumber\n.beritalengkap — Info plugin",
  example: ".beritalengkap antaranews\n.beritalengkap cnn\n.beritalengkap bola",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const API_KEY = "e1cc39d5";
const API_BASE = "https://api.andaraz.com/api/berita";

const SOURCES = {
  antaranews: { label: "Antara News", url: "antaranews", desc: "Berita nasional & internasional" },
  bbc: { label: "BBC Indonesia", url: "bbc", desc: "Berita dunia & Indonesia" },
  beritajakarta: { label: "Berita Jakarta", url: "beritajakarta", desc: "Berita Jakarta & sekitar" },
  bola: { label: "Bola Sports", url: "bola", desc: "Berita olahraga & sepak bola" },
  cnn: { label: "CNN Indonesia", url: "cnn", desc: "Berita nasional, ekonomi, hiburan" },
};

async function fetchBerita(sourceKey) {
  const source = SOURCES[sourceKey];
  if (!source) throw new Error("Sumber tidak ditemukan");

  const url = API_BASE + "/" + source.url + "?apikey=" + API_KEY;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });

  if (!res.ok) {
    throw new Error("HTTP " + res.status);
  }

  const data = await res.json();
  if (!data.status) {
    throw new Error(data.message || "Gagal mengambil berita");
  }

  const articles = data.data || data.result || [];
  if (!Array.isArray(articles) || articles.length === 0) {
    throw new Error("Tidak ada berita tersedia");
  }

  return { source: source.label, articles };
}

function formatBerita(sourceLabel, articles) {
  const maxShow = Math.min(articles.length, 12);
  const lines = [
    "BERITA TERBARU: " + sourceLabel.toUpperCase(),
    "Total: " + articles.length + " berita | Menampilkan: " + maxShow,
    "",
  ];

  for (let i = 0; i < maxShow; i++) {
    const article = articles[i];
    const title = article.title || "N/A";
    const link = article.link || "";
    const image = article.image || null;

    lines.push((i + 1) + ". " + title);
    if (link) lines.push("   " + link);
    lines.push("");
  }

  if (articles.length > 12) {
    lines.push("Total " + articles.length + " berita. Hanya 12 ditampilkan.");
  }
  lines.push("Source: " + sourceLabel + " via Andaraz API");

  return claraWrap("Berita Lengkap", lines, "info");
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = (args[0] || "").toLowerCase().trim();

    if (!input || input === "help" || input === "info") {
      return m.reply(claraWrap("Berita Lengkap", [
        "Berita terbaru dari 5 sumber Indonesia",
        "Source: Andaraz API",
        "",
        "SUMBER TERSEDIA:",
        "1. antaranews - Antara News (nasional)",
        "2. bbc - BBC Indonesia (dunia)",
        "3. beritajakarta - Berita Jakarta (lokal)",
        "4. bola - Bola Sports (olahraga)",
        "5. cnn - CNN Indonesia (lengkap)",
        "",
        "CARA PAKAI:",
        usedPrefix + "beritaapi <source> - Lihat berita",
        usedPrefix + "beritaapi list - Lihat semua sumber",
        "",
        "Contoh:",
        usedPrefix + "beritaapi cnn",
        usedPrefix + "beritaapi bola",
      ]));
    }

    if (input === "list" || input === "sumber" || input === "sources") {
      const lines = [
        "DAFTAR SUMBER BERITA",
        "",
      ];
      let i = 1;
      for (const [key, src] of Object.entries(SOURCES)) {
        lines.push(i + ". " + src.label + " (" + key + ")");
        lines.push("   " + src.desc);
        i++;
      }
      lines.push("");
      lines.push("Ketik: " + usedPrefix + "beritaapi <source>");
      return m.reply(claraWrap("Berita Lengkap", lines, "info"));
    }

    // Validate source
    if (!SOURCES[input]) {
      const available = Object.keys(SOURCES).join(", ");
      return m.reply(claraWrap("Berita Lengkap", [
        "Sumber tidak ditemukan: " + input,
        "",
        "Sumber tersedia: " + available,
        "",
        "Ketik " + usedPrefix + "beritaapi list untuk lihat semua sumber",
      ], "warn"));
    }

    m.reply(claraWrap("Berita Lengkap", "Mengambil berita dari " + SOURCES[input].label + "..."));

    const result = await fetchBerita(input);
    return m.reply(formatBerita(result.source, result.articles));
  } catch (e) {
    console.error("[BeritaAPI]", e);
    m.reply(claraWrap("Berita Lengkap", [
      "Error: " + e.message,
      "",
      "Kemungkinan penyebab:",
      "1. API Andaraz sedang maintenance",
      "2. Sumber berita sedang offline",
      "3. Koneksi timeout",
    ], "warn"));
  }
}

export { pluginConfig as config, handler };
