// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

/**
 * plugins/tools/wallpaper.js
 * Command .wallpaper — Unduh wallpaper HD dari Wallhaven
 *
 * Cara pakai:
 * .wallpaper <kata kunci> — Cari wallpaper HD (1 foto random)
 * .wallpaper random — Wallpaper random
 * .wallpaper <kata kunci> hd — Cari resolusi 1920x1080+
 * .wallpaper <kata kunci> 4k — Cari resolusi 4K (3840x2160+)
 *
 * API: Wallhaven.cc (gratis, no key, jutaan wallpaper)
 */

const pluginConfig = {
  name: "wallpaper",
  alias: ["wallpaper"],
  category: "tools",
  description: "Unduh wallpaper HD/4K dari Wallhaven",
  usage: ".wallpaper <kata kunci>\n.wallpaper random\n.wallpaper <kata kunci> hd\n.wallpaper <kata kunci> 4k",
  example: ".wallpaper mekkah hd\n.wallpaper mosque\n.wallpaper nature 4k",
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
const CATEGORIES = "111"; // Semua kategori
const PURITY = "100"; // SFW only

// Resolusi minimum
const RESOLUTIONS = {
  "hd": "1920x1080",
  "fullhd": "1920x1080",
  "2k": "2560x1440",
  "4k": "3840x2160",
  "mobile": "1080x1920", // Portrait untuk HP
};

// Popular keywords (untuk suggestions)
const POPULAR = [
  "mosque", "mecca", "islamic", "nature", "mountain",
  "space", "galaxy", "ocean", "city", "sunset",
  "anime", "gaming", "cyberpunk", "minimalist", "flowers",
  "ramadan", "masjid", "kaaba",
];

async function searchWallpapers(query, minRes) {
  const params = new URLSearchParams({
    q: query,
    categories: CATEGORIES,
    purity: PURITY,
    sorting: "random",
    atleast: minRes || "",
  });

  // Remove empty params
  if (!minRes) params.delete("atleast");

  const res = await fetch(`${API_URL}?${params}`, {
    signal: AbortSignal.timeout(15000),
    headers: {
      "User-Agent": "Mozilla/5.0 (NovaBot/1.0)",
    },
  });

  if (!res.ok) throw new Error(`Wallhaven error: HTTP ${res.status}`);

  const data = await res.json();
  if (!data.data || data.data.length === 0) {
    throw new Error(`Tidak ada wallpaper untuk "${query}". Coba kata kunci lain.`);
  }

  return data;
}

async function downloadImage(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    headers: {
      "User-Agent": "Mozilla/5.0 (NovaBot/1.0)",
    },
  });

  if (!res.ok) throw new Error(`Gagal mengunduh gambar: HTTP ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  return buffer;
}

async function handler(m, { sock, config: botConfig }) {
  const text = m.args.join(" ").trim();

  // Validasi input
  if (!text) {
    const help = `Unduh Wallpaper HD\n\nCara pakai:\n.wallpaper <kata kunci> — Cari wallpaper\n.wallpaper random — Wallpaper acak\n.wallpaper <kata kunci> hd — HD 1920x1080+\n.wallpaper <kata kunci> 2k — 2K 2560x1440+\n.wallpaper <kata kunci> 4k — 4K 3840x2160+\n.wallpaper <kata kunci> mobile — Untuk HP (portrait)\n\nContoh:\n.wallpaper mekkah hd\n.wallpaper mosque\n.wallpaper nature 4k\n.wallpaper anime mobile\n\nKata kunci populer:\nmosque, mecca, islamic, nature, mountain, space, galaxy, ocean, city, sunset, anime, gaming, cyberpunk, minimalist, flowers, ramadan, masjid, kaaba`;
    return m.reply( claraWrap("Wallpaper", help));
  }
  try {
    await m.react("🕒");
    // Parse input: cek ada keyword resolusi atau tidak
    let query = text;
    let minRes = "";

    // Cek keyword resolusi di akhir
    const parts = text.split(/\s+/);
    const lastWord = parts[parts.length - 1].toLowerCase();

    if (parts.length > 1 && RESOLUTIONS[lastWord]) {
      minRes = RESOLUTIONS[lastWord];
      query = parts.slice(0, -1).join(" ");
    }

    // Jika "random", kosongkan query
    if (query.toLowerCase() === "random") {
      query = "";
    }

    // Search wallpaper
    const data = await searchWallpapers(query, minRes);

    // Ambil 1 random dari hasil
    const total = data.meta?.total || 0;
    const wallpapers = data.data;

    if (wallpapers.length === 0) {
      return m.reply(claraWrap("Wallpaper", `Tidak ada wallpaper untuk "${query}".\n\nCoba kata kunci lain:\nmosque, nature, space, anime, city`));
    }

    // Pilih 1 random dari hasil
    const randomIndex = Math.floor(Math.random() * Math.min(wallpapers.length, 10));
    const wp = wallpapers[randomIndex];

    // Download gambar
    const imageUrl = wp.path;
    const imageBuffer = await downloadImage(imageUrl);

    // Kirim gambar dengan caption
    const caption = `Wallpaper: ${query || "Random"}\nResolusi: ${wp.resolution}\nUkuran: ${(wp.file_size / 1024).toFixed(0)} KB\nTipe: ${wp.file_type}\n\nSumber: wallhaven.cc`;

    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      image: imageBuffer,
      caption: claraWrap("Wallpaper HD", caption),
    }, { quoted: m });
  } catch (error) {
    await m.react("❌");
    let errMsg = error.message || "Gagal mencari wallpaper.";

    if (errMsg.includes("Tidak ada wallpaper")) {
      errMsg += "\n\nCoba kata kunci Inggris:\nmosque, nature, space, anime, city";
    }

    return m.reply(claraWrap("Wallpaper Error", errMsg));
  }
}

export { pluginConfig as config, handler };
