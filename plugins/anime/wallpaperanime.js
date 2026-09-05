// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

/**
 * plugins/anime/wallpaperanime.js
 * Command .wallpaperanime — Unduh wallpaper anime HD dari multi-source
 *
 * Source: Wallhaven (anime category) + Konachan (Japan)
 * Wallhaven: 99,000+ anime wallpapers, HD/4K
 * Konachan: Anime wallpaper dari Jepang, high quality
 *
 * Cara pakai:
 * .wallpaperanime <karakter/anime> — Cari wallpaper anime (1 random HD)
 * .wallpaperanime random — Anime wallpaper acak
 * .wallpaperanime <karakter> hd — HD 1920x1080+
 * .wallpaperanime <karakter> 4k — 4K 3840x2160+
 * .wallpaperanime <karakter> mobile — Portrait untuk HP
 * .wallpaperanime list — Karakter/anime populer
 */

const pluginConfig = {
  name: "wallpaperanime",
  alias: ["wallpaperanime"],
  category: "anime",
  description: "Unduh wallpaper anime HD/4K (Wallhaven + Konachan)",
  usage: ".wallpaperanime <karakter>\n.wallpaperanime random\n.wallpaperanime <karakter> hd\n.wallpaperanime <karakter> 4k\n.wallpaperanime <karakter> mobile",
  example: ".wallpaperanime naruto hd\n.wallpaperanime zero two\n.wallpaperanime rem mobile",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const WALLHAVEN_API = "https://wallhaven.cc/api/v1/search";
const KONACHAN_API = "https://konachan.com/post.json";

const RESOLUTIONS = {
  "hd": "1920x1080",
  "fullhd": "1920x1080",
  "2k": "2560x1440",
  "4k": "3840x2160",
  "mobile": "1080x1920",
};

// Karakter & anime populer
const POPULAR_ANIME = [
  "naruto", "one piece", "dragon ball", "demon slayer", "jujutsu kaisen",
  "attack on titan", "my hero academia", "chainsaw man", "spy x family",
  "bleach", "hunter x hunter", "tokyo revengers", "one punch man",
  "genshin impact", "honkai", "blue archive", "fate grand order",
  "zero two", "rem", "emilia", "makima", "gojo", "tanjiro", "nezuko",
  "luffy", "zoro", "saitama", "virgil", "nahida", "raiden shogun",
  "hu tao", "yae miko", "ganyu", "kafka", "silver wolf",
];

async function searchWallhaven(query, minRes) {
  const params = new URLSearchParams({
    q: query,
    categories: "010", // Anime only
    purity: "100", // SFW only
    sorting: "random",
  });
  if (minRes) params.set("atleast", minRes);

  const res = await fetch(`${WALLHAVEN_API}?${params}`, {
    signal: AbortSignal.timeout(15000),
    headers: { "User-Agent": "Mozilla/5.0 (NovaBot/1.0)" },
  });

  if (!res.ok) throw new Error(`Wallhaven error: HTTP ${res.status}`);
  const data = await res.json();

  if (!data.data || data.data.length === 0) return null;

  return data.data.map(w => ({
    url: w.path,
    resolution: w.resolution,
    source: "Wallhaven",
    file_size: w.file_size,
  }));
}

async function searchKonachan(query) {
  const tags = query ? `${query} order:random` : "order:random";
  const res = await fetch(`${KONACHAN_API}?tags=${encodeURIComponent(tags)}&limit=20`, {
    signal: AbortSignal.timeout(15000),
    headers: { "User-Agent": "Mozilla/5.0 (NovaBot/1.0)" },
  });

  if (!res.ok) throw new Error(`Konachan error: HTTP ${res.status}`);
  const data = await res.json();

  if (!Array.isArray(data) || data.length === 0) return null;

  // Filter hanya yang punya file_url dan resolusi wajar
  return data
    .filter(p => p.file_url && p.width && p.height)
    .map(p => ({
      url: p.file_url,
      resolution: `${p.width}x${p.height}`,
      source: "Konachan",
      file_size: p.file_size || 0,
    }));
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

  // Sub-command: list
  if (text.toLowerCase() === "list" || text.toLowerCase() === "popular") {
    let list = "Karakter & Anime Populer:\n\n";
    // Group by 4 per line
    for (let i = 0; i < POPULAR_ANIME.length; i += 4) {
      list += POPULAR_ANIME.slice(i, i + 4).join(", ") + "\n";
    }
    list += "\nCari: .wallpaperanime <nama> hd";
    return m.reply( claraWrap("Wallpaper Anime", list));
  }

  // Validasi input
  if (!text) {
    const help = `Unduh Wallpaper Anime HD\n\nCara pakai:\n.wallpaperanime <karakter> — Cari wallpaper\n.wallpaperanime random — Anime acak\n.wallpaperanime <karakter> hd — HD 1920x1080+\n.wallpaperanime <karakter> 4k — 4K 3840x2160+\n.wallpaperanime <karakter> mobile — Portrait HP\n.wallpaperanime list — Karakter populer\n\nContoh:\n.wallpaperanime naruto hd\n.wallpaperanime zero two\n.wallpaperanime rem mobile\n.wallpaperanime genshin impact 4k\n\nSource: Wallhaven (99rb+ anime) + Konachan (Jepang)`;
    return m.reply( claraWrap("Wallpaper Anime", help));
  }
  try {
    // Parse input: cek keyword resolusi
    let query = text;
    let minRes = "";

    const parts = text.split(/\s+/);
    const lastWord = parts[parts.length - 1].toLowerCase();

    if (parts.length > 1 && RESOLUTIONS[lastWord]) {
      minRes = RESOLUTIONS[lastWord];
      query = parts.slice(0, -1).join(" ");
    }

    if (query.toLowerCase() === "random") {
      query = "";
    }

    await m.react("🕒");
    // Strategy: Wallhaven dulu, kalau kosong coba Konachan
    let results = null;
    let sourceUsed = "";

    // 1. Coba Wallhaven (anime category)
    try {
      results = await searchWallhaven(query, minRes);
      if (results) sourceUsed = "Wallhaven";
    } catch (e) {
      // Wallhaven fail, coba Konachan
    }

    // 2. Kalau Wallhaven kosong, coba Konachan
    if (!results) {
      try {
        results = await searchKonachan(query);
        if (results) sourceUsed = "Konachan";
      } catch (e) {
        // Konachan juga fail
      }
    }

    // 3. Kalau semua kosong
    if (!results || results.length === 0) {
      return m.reply(claraWrap("Wallpaper Anime", `Tidak ada wallpaper anime untuk "${query}".\n\nCoba kata kunci lain:\nnaruto, one piece, demon slayer, gojo, rem\n\nAtau lihat: .wallpaperanime list`));
    }

    // Pilih 1 random dari hasil (top 10)
    const randomIndex = Math.floor(Math.random() * Math.min(results.length, 10));
    const wp = results[randomIndex];

    // Download gambar
    const imageBuffer = await downloadImage(wp.url);

    // Kirim gambar
    const sizeKB = wp.file_size ? (wp.file_size / 1024).toFixed(0) : "?";
    const caption = `Wallpaper Anime: ${query || "Random"}\nResolusi: ${wp.resolution}\nUkuran: ${sizeKB} KB\nSource: ${wp.source}`;

    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      image: imageBuffer,
      caption: claraWrap("Wallpaper Anime", caption),
    }, { quoted: m });
  } catch (error) {
    let errMsg = error.message || "Gagal mencari wallpaper anime.";
    await m.react("❌");
    return m.reply(claraWrap("Wallpaper Anime Error", errMsg));
  }
}

export { pluginConfig as config, handler };
