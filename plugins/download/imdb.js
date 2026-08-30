// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// imdb.js — Info film dari IMDB
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "imdb",
  alias: ["imdb", "imdbinfo", "movie"],
  category: "download",
  description: "Info film dari IMDB",
  usage: ".imdb <judul_film>",
  example: ".imdb Inception",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await m.react("🕒");
    const query = m.args?.join(" ").trim();
    if (!query) return m.reply(claraWrap("imdb", `Masukkan judul film!\n\nContoh: .imdb Inception`, "guide"));

    const res = await axios.get(`https://www.omdbapi.com/?t=${encodeURIComponent(query)}&apikey=af9b9e87`);
    const d = res.data;
    if (d.Response === "False") return m.reply(claraWrap("imdb", `Film "${query}" tidak ditemukan!`, "error"));

    let msg = `╭──「 *IMDB* 」\n`;
    msg += `│ 🎬 Title: ${d.Title}\n`;
    msg += `│ 📅 Year: ${d.Year}\n`;
    msg += `│ ⭐ Rating: ${d.imdbRating}/10 (${d.imdbVotes} votes)\n`;
    msg += `│ 🎭 Genre: ${d.Genre}\n`;
    msg += `│ 🎬 Director: ${d.Director}\n`;
    msg += `│ 🎭 Actors: ${d.Actors}\n`;
    msg += `│ 📝 Plot: ${d.Plot}\n`;
    msg += `│ ⏱️ Runtime: ${d.Runtime}\n`;
    msg += `╰──────────`;

    if (d.Poster && d.Poster !== "N/A") {
      await sock.sendMessage(from, { image: { url: d.Poster }, caption: msg }, { quoted: m });
    } else {
      await m.reply(msg);
    }
    await m.react("🐣");
  } catch (err) {
    console.error("imdb error:", err);
    await m.react("❌");
    return m.reply(claraWrap("imdb", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
