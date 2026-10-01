// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// imdb.js — Info film dari IMDB
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { novaWrap, novaBox, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

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
    if (!query) return m.reply(novaWrap("imdb", `Masukkan judul film!\n\nContoh: .imdb Inception`, "guide"));

    const res = await axios.get(`https://www.omdbapi.com/?t=${encodeURIComponent(query)}&apikey=af9b9e87`);
    const d = res.data;
    if (d.Response === "False") return m.reply(novaWrap("imdb", `Film "${query}" tidak ditemukan!`, "error"));

    let _lines = [];
      _lines.push(`🎬 Title: ${d.Title}`);
      _lines.push(`📅 Year: ${d.Year}`);
      _lines.push(`⭐ Rating: ${d.imdbRating}/10 (${d.imdbVotes} votes)`);
      _lines.push(`🎭 Genre: ${d.Genre}`);
      _lines.push(`🎬 Director: ${d.Director}`);
      _lines.push(`🎭 Actors: ${d.Actors}`);
      _lines.push(`📝 Plot: ${d.Plot}`);
      _lines.push(`⏱️ Runtime: ${d.Runtime}`);
    let msg = novaBox("IMDB", _lines);

    if (d.Poster && d.Poster !== "N/A") {
      await sock.sendMessage(from, { image: { url: d.Poster }, caption: msg }, { quoted: m });
    } else {
      await m.reply(msg);
    }
    await m.react("🐣");
  } catch (err) {
    console.error("imdb error:", err);
    await m.react("❌");
    return m.reply(novaGangguan("imdb"));
  }
}

export { pluginConfig as config, handler };
