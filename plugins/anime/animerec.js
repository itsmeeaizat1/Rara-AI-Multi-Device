// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import { raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";
import { raraWrap } from '../../src/lib/rara-menu-style.js'

const pluginConfig = {
  name: "animerec",
  alias: ["animerec"],
  aliases: ["animerec", "animeinfo", "animewiki", "animesearch2", "malinfo"],
  category: "anime",
  description: "Cari & rekomendasi anime dari MyAnimeList (Jikan API, gratis)",
  usage: ".animerec <judul anime> | .animerec top | .animerec season | .animerec random",
  example: ".animerec Naruto | .animerec top | .animerec season | .animerec random",
  isGroupOnly: false,
};

const JIKAN_API = "https://api.jikan.moe/v4";

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = text.trim();

    if (!input) {
      return m.reply(raraWrap("Anime Rec", [
        "Cari & rekomendasi anime dari MyAnimeList.",
        "",
        "Contoh:",
        usedPrefix + "animerec Naruto (cari by judul)",
        usedPrefix + "animerec top (top anime)",
        usedPrefix + "animerec season (anime musim ini)",
        usedPrefix + "animerec random (anime random)",
      ].join("\n")));
    }

    const sub = input.toLowerCase();

    if (sub === "top") {
      const res = await axios.get(JIKAN_API + "/top/anime?limit=10", { timeout: 10000 });
      const animes = res.data?.data || [];
      if (!animes.length) return m.reply(raraWrap("Anime Rec", "Gagal ambil top anime."));

      let lines = ["Top Anime (MyAnimeList)", ""];
      animes.forEach((a, i) => {
        lines.push((i + 1) + ". " + a.title_english || a.title);
        lines.push("   Score: " + (a.score || "N/A") + " | Episodes: " + (a.episodes || "?") + " | Type: " + (a.type || "?"));
        lines.push("");
      });
      return m.reply(raraWrap("Anime Rec - Top", lines.join("\n")));
    }

    if (sub === "season") {
      const res = await axios.get(JIKAN_API + "/seasons/now?limit=10", { timeout: 10000 });
      const animes = res.data?.data || [];
      if (!animes.length) return m.reply(raraWrap("Anime Rec", "Gagal ambil anime musim ini."));

      let lines = ["Anime Musim Ini", ""];
      animes.forEach((a, i) => {
        lines.push((i + 1) + ". " + (a.title_english || a.title));
        lines.push("   Score: " + (a.score || "N/A") + " | Type: " + (a.type || "?") + " | " + (a.studios?.[0]?.name || "Unknown"));
        lines.push("");
      });
      return m.reply(raraWrap("Anime Rec - Season", lines.join("\n")));
    }

    if (sub === "random") {
      const res = await axios.get(JIKAN_API + "/random/anime", { timeout: 10000 });
      const a = res.data?.data;
      if (!a) return m.reply(raraWrap("Anime Rec", "Gagal ambil anime random."));

      const genres = a.genres?.map(g => g.name).join(", ") || "N/A";
      const studios = a.studios?.map(s => s.name).join(", ") || "N/A";
      let lines = [
        (a.title_english || a.title) + (a.title_japanese ? " (" + a.title_japanese + ")" : ""),
        "",
        "Type: " + (a.type || "N/A"),
        "Episodes: " + (a.episodes || "N/A"),
        "Score: " + (a.score || "N/A") + "/10",
        "Status: " + (a.status || "N/A"),
        "Genres: " + genres,
        "Studio: " + studios,
        "Year: " + (a.year || (a.aired?.from ? a.aired.from.slice(0, 4) : "N/A")),
        "",
        a.synopsis ? a.synopsis.slice(0, 300) + "..." : "No synopsis",
      ];
      return m.reply(raraWrap("Anime Rec - Random", lines.join("\n")));
    }

    // Search by title
    const res = await axios.get(JIKAN_API + "/anime?q=" + encodeURIComponent(input) + "&limit=5&order_by=score&sort=desc", { timeout: 10000 });
    const animes = res.data?.data || [];
    if (!animes.length) return m.reply(raraWrap("Anime Rec", "Anime tidak ditemukan untuk: " + input));

    let lines = ["Hasil pencarian: " + input, ""];
    animes.forEach((a, i) => {
      lines.push((i + 1) + ". " + (a.title_english || a.title));
      lines.push("   Score: " + (a.score || "N/A") + " | Type: " + (a.type || "?") + " | Episodes: " + (a.episodes || "?"));
      lines.push("   Genres: " + (a.genres?.map(g => g.name).join(", ") || "N/A"));
      lines.push("   " + (a.synopsis ? a.synopsis.slice(0, 100) + "..." : "No synopsis"));
      lines.push("");
    });
    return m.reply(raraWrap("Anime Rec - Search", lines.join("\n")));
  } catch (e) {
    console.error("animerec error:", e.message);
    return m.reply(raraWrap("Anime Rec", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
