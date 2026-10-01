// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// anilist.js — AniList GraphQL: search, seasonal, top, detail (no API key)
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "anilist",
  alias: ["anilist"],
  category: "search",
  description: "Cari & lihat detail anime/manga dari AniList (seasonal, top, search)",
  usage: ".anilist <command> <judul>",
  example: ".anilist search Naruto\n.anilist seasonal\n.anilist top\n.anilist detail 21",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

const API = "https://graphql.anilist.co";

async function gql(query, variables) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList API ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || "GraphQL error");
  return json.data;
}

function fmtAnime(media) {
  const title = media.title?.romaji || media.title?.english || "Unknown";
  const score = media.averageScore ? `★ ${media.averageScore}/100` : "★ N/A";
  const eps = media.episodes ? `${media.episodes} eps` : "? eps";
  const status = media.status || "Unknown";
  return `• ${title}\n  ${score} | ${eps} | ${status}`;
}

async function handler(m, { sock, config, db }) {
  try {
    const sub = (m.args?.[0] || "").toLowerCase();
    const query = m.args?.slice(1).join(" ") || "";

    if (!sub || sub === "help") {
      return m.reply(novaWrap("AniList", [
        "Cari anime dari AniList database",
        "",
        "📌 *Cara Pakai:*",
        `${m.prefix}anilist search <judul> — cari anime`,
        `${m.prefix}anilist seasonal — anime musim ini`,
        `${m.prefix}anilist top — top trending anime`,
        `${m.prefix}anilist detail <id> — detail by ID`,
      ]));
    }
    await m.react("🕒");
    let text = "";

    if (sub === "search" && query) {
      const data = await gql(
        `query($search: String) { Page(page: 1, perPage: 8) { media(search: $search, type: ANIME) { id title { romaji english } averageScore episodes status } } }`,
        { search: query }
      );
      const list = data?.Page?.media || [];
      if (!list.length) {
        return m.reply(novaError("AniList", `Gak nemu anime untuk: "${query}" nih`));
      }
      text = `Hasil pencarian: "${query}"\n\n` + list.map(fmtAnime).join("\n\n");
    }
    else if (sub === "seasonal") {
      const now = new Date();
      const month = now.getMonth();
      const season = ["WINTER", "SPRING", "SUMMER", "FALL"][Math.floor(month / 3)];
      const year = now.getFullYear();
      const data = await gql(
        `query($season: MediaSeason, $year: Int) { Page(page: 1, perPage: 10) { media(season: $season, seasonYear: $year, type: ANIME, sort: POPULARITY_DESC) { id title { romaji english } averageScore episodes status } } }`,
        { season, year }
      );
      const list = data?.Page?.media || [];
      if (!list.length) {
        return m.reply(novaWrap("AniList", "Tidak ada anime musim ini."));
      }
      text = `Anime Musim ${season} ${year}\n\n` + list.map(fmtAnime).join("\n\n");
    }
    else if (sub === "top") {
      const data = await gql(
        `{ Page(page: 1, perPage: 10) { media(type: ANIME, sort: TRENDING_DESC) { id title { romaji english } averageScore episodes status } } }`
      );
      const list = data?.Page?.media || [];
      text = "Top Trending Anime\n\n" + list.map(fmtAnime).join("\n\n");
    }
    else if (sub === "detail" && query) {
      const id = parseInt(query);
      if (!id) {
        return m.reply(novaGuide("AniList", "ID gak valid nih!", ".anilist detail 21"));
      }
      const data = await gql(
        `query($id: Int) { Media(id: $id, type: ANIME) { id title { romaji english } description averageScore episodes status format duration genres studios { nodes { name } } } }`,
        { id }
      );
      const a = data?.Media;
      if (!a) {
        return m.reply(novaWrap("AniList", `Anime dengan ID ${id} tidak ditemukan.`));
      }
      const title = a.title?.romaji || a.title?.english || "Unknown";
      const desc = (a.description || "No description").replace(/<[^>]+>/g, "").slice(0, 300);
      const genres = a.genres?.join(", ") || "N/A";
      const studio = a.studios?.nodes?.[0]?.name || "Unknown";
      text = `${title}\n\n★ ${a.averageScore || "N/A"}/100\n${a.format || "?"} | ${a.episodes || "?"} eps | ${a.duration || "?"} min/eps\nStatus: ${a.status || "?"}\nGenre: ${genres}\nStudio: ${studio}\n\n${desc}...`;
    }
    else {
      return m.reply(novaWrap("AniList", [
        "Command tidak dikenal.",
        `Lihat: ${m.prefix}anilist help`,
      ]));
    }
    await m.react("🐣");
    return m.reply(novaWrap("AniList", text));
  } catch (e) {
    console.error("[anilist] error:", e.message);
    await m.react("❌");
    return m.reply(te(m.prefix, m.command, m.pushName), "anilist");
  }
}

export { pluginConfig as config, handler };
