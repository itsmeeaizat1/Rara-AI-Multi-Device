// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { saluranCtx } from "../../src/lib/rara-context.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
const NEOXR_APIKEY = config.APIkey?.neoxr || "Milik-Bot-RaraMD";

const pluginConfig = {
  name: "filmget",
  alias: ["filmget"],
  category: "search",
  description: "Ambil detail film",
  usage: ".filmget <url>",
  example: ".filmget https://tv.neoxr.eu/film/civil-war-2024",
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};


async function handler(m, { sock }) {
  const args = m.args || [];
  const url = args[0]?.trim();

  if (!url || !url.includes("neoxr.eu")) {
    return m.reply( raraWrap("filmget", `🎬 *film detail*\n\n` +
        `Ambil detail film dari URL\n\n` +
        `*format:*\n` +
        `\`${m.prefix}filmget <url>\`\n\n` +
        `Gunakan \`${m.prefix}film <judul>\` untuk cari film dulu`, "guide"), "filmget");
  }


  try {
    const apiUrl = `https://api.neoxr.eu/api/film-get?url=${encodeURIComponent(url)}&apikey=${NEOXR_APIKEY}`;
    const { data } = await axios.get(apiUrl, { timeout: 30000 });

    if (!data?.status || !data?.data) {
      return m.reply(raraWrap("filmget", "❌ *gagal*\n\nFilm tidak ditemukan"));
    }

    const film = data.data;
    const streams = data.stream || [];
    const downloads = data.download || [];

    let thumbBuffer = null;
    if (film.thumbnail) {
      try {
        const thumbRes = await axios.get(film.thumbnail, {
          responseType: "arraybuffer",
          timeout: 10000,
        });
        thumbBuffer = Buffer.from(thumbRes.data);
      } catch (e) { console.error('[filmget.js]:', e.message); }
    }

    let text = `🎬 *${film.title || "Film"}*\n\n`;
        text += `⭐ Rating: ${film.rating || "-"}\n`;
    text += `📺 Quality: ${film.quality || "-"}\n`;
    text += `⏱️ Duration: ${film.duration || "-"}\n`;
    text += `📅 Release: ${film.release || "-"}\n`;
    text += `🎭 Genre: ${film.tags || "-"}\n`;
    text += `🎬 Director: ${film.director || "-"}\n`;
    text += `👥 Actors: ${film.actors || "-"}\n`;
    text += `---\n\n`;

    text += `📝 *synopsis:*\n`;
    text += `${film.synopsis || "-"}\n\n`;

    if (streams.length > 0) {
      text += `▶️ *streaming:*\n`;
      streams.forEach((s, i) => {
        text += `${i + 1}. ${s.server}\n`;
      });
      text += `\n`;
    }

    if (downloads.length > 0) {
      text += `📥 *download:*\n`;
      downloads.forEach((d, i) => {
        text += `${i + 1}. ${d.provider}\n`;
      });
    }

    const buttons = [];

    if (streams.length > 0) {
      buttons.push({
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: `${streams[0].server}`,
          url: streams[0].url,
        }),
      });
    }

    downloads.slice(0, 2).forEach((d) => {
      buttons.push({
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: `📥 ${d.provider}`,
          url: d.url,
        }),
      });
    });

    const saluranId = config.saluran?.id || "@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Rara-AI";

    const msgContent = {
      text,
      footer: `🎬 Nonton Film Online`,
      contextInfo: saluranCtx(),
    };

    if (buttons.length > 0) {
      msgContent.interactiveButtons = buttons;
    }

    await sock.sendMessage(m.chat, msgContent, { quoted: m });
  } catch (error) {
    m.reply(raraWrap("filmget", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
