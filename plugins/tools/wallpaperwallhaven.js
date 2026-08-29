// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

/**
 * plugins/tools/wallpaperwallhaven.js
 * Command .wallpaperwallhaven — Unduh wallpaper HD/4K dari Wallhaven (semua kategori + anime)
 *
 * Wallhaven.cc — jutaan wallpaper, gratis, no key
 * Kategori: general, anime, people (bisa kombinasi)
 *
 * Cara pakai:
 * .wh <kata kunci> — Cari wallpaper (semua kategori)
 * .wh anime <karakter> — Cari wallpaper anime
 * .wh <kata kunci> hd — HD 1920x1080+
 * .wh <kata kunci> 4k — 4K 3840x2160+
 * .wh <kata kunci> mobile — Portrait HP
 * .wh random — Wallpaper acak
 * .wh anime random — Anime acak
 */

const pluginConfig = {
  name: "wallpaperwallhaven",
  alias: ["wallpaperwallhaven", "wh"],
  category: "tools",
  description: "Unduh wallpaper HD/4K dari Wallhaven (general + anime)",
  usage: ".wh <kata kunci>\n.wh anime <karakter>\n.wh <kata kunci> hd\n.wh <kata kunci> 4k\n.wh <kata kunci> mobile\n.wh random\n.wh anime random",
  example: ".wh mekkah hd\n.wh anime miku\n.wh nature 4k\n.wh anime gojo mobile",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const API_URL = "https://wallhaven.cc/api/v1/search";

// Kategori Wallhaven: general=1, anime=1, people=1
// "100" = general only, "010" = anime only, "001" = people only, "111" = all
const CATEGORY_MAP = {
  "general": "100",
  "anime": "010",
  "people": "001",
  "all": "111",
};

const RESOLUTIONS = {
  "hd": "1920x1080",
  "fullhd": "1920x1080",
  "2k": "2560x1440",
  "4k": "3840x2160",
  "mobile": "1080x1920",
};

async function searchWallhaven(query, category, minRes) {
  const params = new URLSearchParams({
    q: query,
    categories: category || "111",
    purity: "100", // SFW only
    sorting: "random",
  });
  if (minRes) params.set("atleast", minRes);

  const res = await fetch(`${API_URL}?${params}`, {
    signal: AbortSignal.timeout(15000),
    headers: { "User-Agent": "Mozilla/5.0 (NovaBot/1.0)" },
  });

  if (!res.ok) throw new Error(`Wallhaven error: HTTP ${res.status}`);
  const data = await res.json();

  if (!data.data || data.data.length === 0) return null;
  return data;
}

async function downloadImage(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    headers: { "User-Agent": "Mozilla/5.0 (NovaBot/1.0)" },
  });
  if (!res.ok) throw new Error(`Gagal mengunduh: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function handler(m, { sock, config: botConfig }) {
  const text = m.args.join(" ").trim();

  if (!text) {
    const help = `Wallhaven Wallpaper\n\nCara pakai:\n.wh <kata kunci> — Cari wallpaper\n.wh anime <karakter> — Wallpaper anime\n.wh <kata kunci> hd — HD 1920x1080+\n.wh <kata kunci> 2k — 2K 2560x1440+\n.wh <kata kunci> 4k — 4K 3840x2160+\n.wh <kata kunci> mobile — Portrait HP\n.wh random — Wallpaper acak\n.wh anime random — Anime acak\n\nContoh:\n.wh mekkah hd\n.wh anime miku\n.wh nature 4k\n.wh anime gojo mobile\n.wh mosque\n.wh space 2k`;
    return m.reply( claraWrap("Wallhaven", help));
  }
  try {
    let query = text;
    let category = "111"; // Default: semua kategori
    let minRes = "";

    const parts = text.split(/\s+/);

    // Cek keyword kategori di awal (anime/general/people)
    if (parts.length > 1 && CATEGORY_MAP[parts[0].toLowerCase()]) {
      category = CATEGORY_MAP[parts[0].toLowerCase()];
      parts.shift(); // Hapus kata kategori
    }

    // Cek keyword resolusi di akhir
    const lastWord = parts[parts.length - 1]?.toLowerCase();
    if (parts.length > 1 && RESOLUTIONS[lastWord]) {
      minRes = RESOLUTIONS[lastWord];
      parts.pop(); // Hapus kata resolusi
    }

    query = parts.join(" ").trim();

    // Handle "random"
    if (query.toLowerCase() === "random") {
      query = "";
    }

    // Search
    const data = await searchWallhaven(query, category, minRes);

    if (!data || data.data.length === 0) {
      const catLabel = category === "010" ? "anime" : category === "100" ? "general" : "semua";
      return m.reply(claraWrap("Wallhaven", `Tidak ada wallpaper untuk "${query || "random"}" (kategori: ${catLabel}).\n\nCoba kata kunci lain.`));
    }

    // Pilih 1 random dari top 10 hasil
    const total = data.meta?.total || 0;
    const wallpapers = data.data;
    const randomIndex = Math.floor(Math.random() * Math.min(wallpapers.length, 10));
    const wp = wallpapers[randomIndex];

    // Download & kirim
    const imageBuffer = await downloadImage(wp.path);

    const catLabel = category === "010" ? "Anime" : category === "100" ? "General" : "Mixed";
    const caption = `Wallhaven: ${query || "Random"}\nKategori: ${catLabel}\nResolusi: ${wp.resolution}\nUkuran: ${(wp.file_size / 1024).toFixed(0)} KB\nTotal hasil: ${total.toLocaleString()}`;

    await sock.sendMessage(m.chat, {
      image: imageBuffer,
      caption: claraWrap("Wallhaven Wallpaper", caption),
    }, { quoted: m });
  } catch (error) {
    return m.reply(claraWrap("Wallhaven Error", error.message || "Gagal mencari wallpaper."));
  }
}

export { pluginConfig as config, handler };
