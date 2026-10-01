// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// kitsu.js — Kitsu API: search anime & manga (no API key)
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "kitsu",
  alias: ["kitsu"],
  category: "search",
  description: "Cari anime & manga dari Kitsu database",
  usage: ".kitsu <type> <judul>",
  example: ".kitsu anime Naruto\n.kitsu manga One Piece",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

const API = "https://kitsu.io/api/edge";

async function kitsuSearch(type, query) {
  const url = `${API}/${type}?filter[text]=${encodeURIComponent(query)}&page[limit]=5`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
    },
  });
  if (!res.ok) throw new Error(`Kitsu API ${res.status}`);
  const json = await res.json();
  return json.data || [];
}

function fmtEntry(item, type) {
  const a = item.attributes;
  const title = a.canonicalTitle || a.titles?.en || "Unknown";
  const rating = a.averageRating ? `★ ${Math.round(a.averageRating)}%` : "★ N/A";
  const count = type === "anime" ? `${a.episodeCount || "?"} eps` : `${a.chapterCount || "?"} ch`;
  const status = a.status || "Unknown";
  const synopsis = (a.synopsis || "No synopsis").slice(0, 200);
  return `• ${title}\n  ${rating} | ${count} | ${status}\n  ${synopsis}...`;
}

async function handler(m, { sock, config, db }) {
  try {
    let type = (m.args?.[0] || "").toLowerCase();
    let query = m.args?.slice(1).join(" ") || "";

    if (!type || type === "help") {
      return m.reply(raraWrap("Kitsu", [
        "Cari anime & manga dari Kitsu",
        "",
        "📌 *Cara Pakai:*",
        `${m.prefix}kitsu anime <judul> — cari anime`,
        `${m.prefix}kitsu manga <judul> — cari manga`,
      ]));
    }

    // Default ke anime kalau bukan manga
    if (type !== "anime" && type !== "manga") {
      query = m.args?.join(" ") || "";
      type = "anime";
    }

    if (!query) {
      return m.reply(raraWrap("Kitsu", `Masukkan judul ${type}. Contoh: ${m.prefix}kitsu ${type} Naruto`));
    }
    await m.react("🕒");
    const results = await kitsuSearch(type, query);

    if (!results.length) {
      await m.react("❌");
      return m.reply(raraError("Kitsu", `Gak nemu ${type} untuk: "${query}" nih`));
    }

    const text = `Hasil pencarian ${type}: "${query}"\n\n` + results.map(item => fmtEntry(item, type)).join("\n\n");
    await m.react("🐣");
    return m.reply(raraWrap("Kitsu", text));
  } catch (e) {
    console.error("[kitsu] error:", e.message);
    await m.react("❌");
    return m.reply(te(m.prefix, m.command, m.pushName), "kitsu");
  }
}

export { pluginConfig as config, handler };
