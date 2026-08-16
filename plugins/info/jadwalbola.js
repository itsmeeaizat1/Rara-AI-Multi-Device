// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import { f } from "../../src/lib/nova-http.js";
import te from "../../src/lib/nova-error.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import {  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "jadwalbola",
  alias: ["bola", "football", "soccer", "jadwalsepakbola"],
  category: "info",
  description: "Lihat jadwal pertandingan sepak bola",
  usage: ".jadwalbola [liga]",
  example: ".jadwalbola inggris",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const NEOXR_APIKEY = config.APIkey?.neoxr || "Milik-Bot-NovaMD";

const LEAGUE_EMOJI = {
  "liga inggris": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "liga italia": "🇮🇹",
  "liga spanyol": "🇪🇸",
  "la liga spanyol": "🇪🇸",
  "liga jerman": "🇩🇪",
  "liga prancis": "🇫🇷",
  "liga belanda": "🇳🇱",
  "liga champions": "🏆",
  "bri super league": "🇮🇩",
};

function getLeagueEmoji(league) {
  const lower = league.toLowerCase();
  for (const [key, emoji] of Object.entries(LEAGUE_EMOJI)) {
    if (lower.includes(key) || key.includes(lower)) {
      return emoji;
    }
  }
  return "⚽";
}

async function handler(m, { sock }) {
  const filter = m.args.join(" ").toLowerCase().trim();

  m.react("🕐");

  try {
    const data = await f(
      `https://api.neoxr.eu/api/bola?apikey=${NEOXR_APIKEY}`,
    );

    if (!data?.status || !data?.data || data.data.length === 0) {
      throw new Error("Tidak ada jadwal tersedia");
    }

    let matches = data.data;

    if (filter) {
      matches = matches.filter(
        (m) =>
          m.league?.toLowerCase().includes(filter) ||
          m.home_team?.toLowerCase().includes(filter) ||
          m.away_team?.toLowerCase().includes(filter) ||
          m.date?.toLowerCase().includes(filter),
      );
    }

    if (matches.length === 0) {
      return m.reply(`❌ Tidak ditemukan jadwal untuk: \`${filter}\``);
    }

    const grouped = {};
    for (const match of matches.slice(0, 50)) {
      const date = match.date || "TBA";
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(match);
    }

    const saluranId = config.saluran?.id || "120363400911374213@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Nova-AI";

    let text = `⚽ *Jadwal Pertandingan*\n\n`;
    if (filter) text += `> Filter: \`${filter}\`\n\n`;

    for (const [date, games] of Object.entries(grouped)) {
      text += `📅 *${date}*\n\n`;

      for (const game of games) {
        const emoji = getLeagueEmoji(game.league);
        text += `${emoji} *${game.league}*\n`;
        text += `⏰ ${game.time}\n`;
        text += `🏠 ${game.home_team}\n`;
        text += `🆚 ${game.away_team}\n\n`;
      }
    }

    text += `Total: *${matches.length}* pertandingan`;

    m.react("✅");

    await m.reply(claraWrap(text.split("\n").filter(l => l.trim())));
  } catch (err) {
    return m.reply(claraWrap("jadwalbola", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
