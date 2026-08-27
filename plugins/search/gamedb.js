// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// gamedb.js — Game database via RAWG.io API (needs API key)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import config from "../../config.js";

const pluginConfig = {
  name: "gamedb",
  alias: ["gamedb"],
  category: "search",
  description: "Cari info game dari RAWG (rating, release, platform, genre)",
  usage: ".gamedb <judul game>",
  example: ".gamedb God of War\n.gamedb GTA V",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

const API = "https://api.rawg.io/api";

async function handler(m, { sock, config: botConfig, db }) {
  try {
    const query = m.args?.join(" ") || "";

    if (!query) {
      return m.reply(claraWrap("Game Database", [
        "Cari info game dari RAWG.io",
        "",
        "📌 *Cara Pakai:*",
        `${m.prefix}gamedb <judul game>`,
        "",
        "💡 *Contoh:*",
        `${m.prefix}gamedb God of War`,
        `${m.prefix}gamedb GTA V`,
      ]));
    }

    const apiKey = config.rawgApiKey || config.APIkey?.rawg || "";

    if (!apiKey) {
      return m.reply(claraWrap("Game Database", [
        "API key RAWG.io belum diset.",
        "",
        "Dapatkan gratis di: https://rawg.io/apidocs",
        "Set di config.js: rawgApiKey: \"YOUR_KEY\"",
      ]));
    }

    await m.react("🕒");

    const res = await fetch(`${API}/games?key=${apiKey}&search=${encodeURIComponent(query)}&page_size=5`);
    if (!res.ok) throw new Error(`RAWG API ${res.status}`);
    const json = await res.json();
    const games = json.results || [];

    if (!games.length) {
      await m.react("🐣");
      return m.reply(claraWrap("Game Database", `Tidak ditemukan game untuk: "${query}"`));
    }

    const lines = games.slice(0, 5).map((g, i) => {
      const name = g.name || "Unknown";
      const rating = g.rating ? `★ ${g.rating}/5` : "★ N/A";
      const released = g.released || "Unknown";
      const platforms = (g.platforms || []).map(p => p.platform?.name).filter(Boolean).join(", ") || "N/A";
      const genres = (g.genres || []).map(g => g.name).join(", ") || "N/A";
      return `${i + 1}. ${name}\n   ${rating} | Released: ${released}\n   Platform: ${platforms}\n   Genre: ${genres}`;
    });

    await m.react("🐣");
    return m.reply(claraWrap("Game Database", [
      `Hasil pencarian: "${query}"`,
      "",
      lines.join("\n\n"),
    ]));
  } catch (e) {
    console.error("[gamedb] error:", e.message);
    await m.react("❌");
    return m.reply(te(m.prefix, m.command, m.pushName), "gamedb");
  }
}

export { pluginConfig as config, handler };
