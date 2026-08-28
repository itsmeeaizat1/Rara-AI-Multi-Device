// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "animesearch",
  alias: ["animesearch"],
  category: "tools",
  description: "Cari anime, manga, dan karakter dari MyAnimeList",
  usage: ".animesearch <type> <judul>",
  example: ".animesearch anime Naruto",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

const API_BASE = "https://api.jikan.moe/v4";

// Retry wrapper for Jikan rate limiting (3 req/sec)
async function jikanGet(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(url, {
        timeout: 20000,
        headers: { "User-Agent": "Mozilla/5.0" },
        validateStatus: () => true,
      });

      if (res.status === 429) {
        // Rate limited - wait and retry
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
        continue;
      }

      if (res.status === 504) {
        // MAL temporarily unavailable - wait and retry
        await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
        continue;
      }

      return res;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw new Error("API tidak merespons setelah beberapa percobaan");
}

async function searchAnime(m, sock, query) {
  const url = `${API_BASE}/anime?q=${encodeURIComponent(query)}&limit=1&sfw=true`;
  const res = await jikanGet(url);

  if (res.status !== 200 || !res.data?.data?.length) {
    return m.reply(claraWrap("animesearch", `Anime "${query}" tidak ditemukan!`));
  }

  const a = res.data.data[0];
  const img = a.images?.jpg?.image_url || a.images?.jpg?.large_image_url;
  const genres = (a.genres || []).map((g) => g.name).join(", ") || "N/A";
  const studios = (a.studios || []).map((s) => s.name).join(", ") || "N/A";

  let txt = `Anime Search\n\n`;
  txt += `Title: ${a.title}\n`;
  if (a.title_japanese) txt += `Japanese: ${a.title_japanese}\n`;
  txt += `Score: ${a.score || "N/A"} | Rank: #${a.rank || "N/A"}\n`;
  txt += `Episodes: ${a.episodes || "N/A"}\n`;
  txt += `Status: ${a.status || "N/A"}\n`;
  txt += `Aired: ${a.aired?.string || "N/A"}\n`;
  txt += `Type: ${a.type || "N/A"}\n`;
  txt += `Genres: ${genres}\n`;
  txt += `Studio: ${studios}\n`;
  txt += `Members: ${(a.members || 0).toLocaleString()}\n`;
  txt += `Rating: ${a.rating || "N/A"}\n\n`;
  if (a.synopsis) {
    const syn = a.synopsis.length > 400 ? a.synopsis.slice(0, 400) + "..." : a.synopsis;
    txt += `Synopsis:\n${syn}\n\n`;
  }
  txt += `MAL: ${a.url || "N/A"}`;

  if (img) {
    try {
      const imgRes = await axios.get(img, {
        responseType: "arraybuffer",
        timeout: 15000,
        validateStatus: () => true,
      });
      if (imgRes.status === 200) {
        const buf = Buffer.from(imgRes.data);
        await sock.sendMessage(m.chat, {
          image: buf,
          caption: txt,
        }, { quoted: m });
        await m.react("🐣");
        return;
      }
    } catch (e) { /* fall through to text */ }
  }
  await m.reply(claraWrap("animesearch", txt));
  await m.react("🐣");
}

async function searchManga(m, sock, query) {
  const url = `${API_BASE}/manga?q=${encodeURIComponent(query)}&limit=1&sfw=true`;
  const res = await jikanGet(url);

  if (res.status !== 200 || !res.data?.data?.length) {
    return m.reply(claraWrap("animesearch", `Manga "${query}" tidak ditemukan!`));
  }

  const a = res.data.data[0];
  const img = a.images?.jpg?.image_url || a.images?.jpg?.large_image_url;
  const genres = (a.genres || []).map((g) => g.name).join(", ") || "N/A";
  const authors = (a.authors || []).map((au) => au.name).join(", ") || "N/A";

  let txt = `Manga Search\n\n`;
  txt += `Title: ${a.title}\n`;
  if (a.title_japanese) txt += `Japanese: ${a.title_japanese}\n`;
  txt += `Score: ${a.score || "N/A"} | Rank: #${a.rank || "N/A"}\n`;
  txt += `Chapters: ${a.chapters || "N/A"}\n`;
  txt += `Volumes: ${a.volumes || "N/A"}\n`;
  txt += `Status: ${a.status || "N/A"}\n`;
  txt += `Type: ${a.type || "N/A"}\n`;
  txt += `Genres: ${genres}\n`;
  txt += `Author: ${authors}\n`;
  txt += `Members: ${(a.members || 0).toLocaleString()}\n\n`;
  if (a.synopsis) {
    const syn = a.synopsis.length > 400 ? a.synopsis.slice(0, 400) + "..." : a.synopsis;
    txt += `Synopsis:\n${syn}\n\n`;
  }
  txt += `MAL: ${a.url || "N/A"}`;

  if (img) {
    try {
      const imgRes = await axios.get(img, {
        responseType: "arraybuffer",
        timeout: 15000,
        validateStatus: () => true,
      });
      if (imgRes.status === 200) {
        const buf = Buffer.from(imgRes.data);
        await sock.sendMessage(m.chat, {
          image: buf,
          caption: txt,
        }, { quoted: m });
        await m.react("🐣");
        return;
      }
    } catch (e) { /* fall through */ }
  }
  await m.reply(claraWrap("animesearch", txt));
  await m.react("🐣");
}

async function searchCharacter(m, sock, query) {
  const url = `${API_BASE}/characters?q=${encodeURIComponent(query)}&limit=1`;
  const res = await jikanGet(url);

  if (res.status !== 200 || !res.data?.data?.length) {
    return m.reply(claraWrap("animesearch", `Karakter "${query}" tidak ditemukan!`));
  }

  const a = res.data.data[0];
  const img = a.images?.jpg?.image_url;

  let txt = `Character Search\n\n`;
  txt += `Name: ${a.name}\n`;
  if (a.name_kanji) txt += `Kanji: ${a.name_kanji}\n`;
  txt += `Favorites: ${(a.favorites || 0).toLocaleString()}\n\n`;
  if (a.about) {
    const about = a.about.length > 500 ? a.about.slice(0, 500) + "..." : a.about;
    txt += `About:\n${about}\n\n`;
  }
  txt += `MAL: ${a.url || "N/A"}`;

  if (img) {
    try {
      const imgRes = await axios.get(img, {
        responseType: "arraybuffer",
        timeout: 15000,
        validateStatus: () => true,
      });
      if (imgRes.status === 200) {
        const buf = Buffer.from(imgRes.data);
        await sock.sendMessage(m.chat, {
          image: buf,
          caption: txt,
        }, { quoted: m });
        await m.react("🐣");
        return;
      }
    } catch (e) { /* fall through */ }
  }
  await m.reply(claraWrap("animesearch", txt));
  await m.react("🐣");
}

async function handler(m, { sock, args }) {
  const type = (args[0] || "").toLowerCase().trim();
  const query = args.slice(1).join(" ").trim();

  if (!type || !query) {
    let txt = `Anime Search (MyAnimeList)\n\n`;
    txt += `Source: Jikan API (gratis, no API key)\n\n`;
    txt += `\`${m.prefix}animesearch <type> <judul>\`\n\n`;
    txt += `Tipe tersedia:\n`;
    txt += `1. \`${m.prefix}animesearch anime <judul>\` - Cari anime\n`;
    txt += `2. \`${m.prefix}animesearch manga <judul>\` - Cari manga\n`;
    txt += `3. \`${m.prefix}animesearch character <nama>\` - Cari karakter\n\n`;
    txt += `Contoh:\n`;
    txt += `\`${m.prefix}animesearch anime Naruto\`\n`;
    txt += `\`${m.prefix}animesearch manga One Piece\`\n`;
    txt += `\`${m.prefix}animesearch character Luffy\`\n\n`;
    txt += `Alias: .mal, .carianime, .animefind`;
    return await m.reply( txt, { commandName: "animesearch" });
  }

  await m.react("🕒");

  try {
    if (type === "anime" || type === "a") {
      await searchAnime(m, sock, query);
    } else if (type === "manga" || type === "m") {
      await searchManga(m, sock, query);
    } else if (type === "character" || type === "char" || type === "c") {
      await searchCharacter(m, sock, query);
    } else {
      // Default: treat everything as anime search
      await searchAnime(m, sock, [type, query].join(" ").trim());
    }
  } catch (e) {
    console.error("[ANIMESEARCH] Error:", e.message);
    let txt = `Gagal mencari!\n\n`;
    txt += `Error: ${e.message}\n\n`;
    txt += `Jikan API mungkin sedang overload. Coba lagi nanti.`;
    await m.reply(claraWrap("animesearch", txt));
  }
}

export { pluginConfig as config, handler };
