// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// twittertrend.js — Trending Twitter/X (getdaytrends.com scrape)
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "twittertrend",
  alias: ["twittertrend", "trendtwitter", "twtrend", "trendtwit", "trendingtwit"],
  category: "search",
  description: "Trending Twitter/X berdasarkan negara (getdaytrends.com)",
  usage: ".twittertrend <kode negara>",
  example: ".twittertrend id\n.twittertrend (default: indonesia)",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 1, isEnabled: true,
};

const COUNTRY_MAP = {
  id: "indonesia", indonesia: "indonesia",
  us: "united-states", usa: "united-states", "united-states": "united-states",
  jp: "japan", japan: "japan",
  kr: "south-korea", korea: "south-korea",
  uk: "united-kingdom", "united-kingdom": "united-kingdom",
  in: "india", india: "india",
  my: "malaysia", malaysia: "malaysia",
  sg: "singapore", singapore: "singapore",
  ph: "philippines", philippines: "philippines",
  th: "thailand", thailand: "thailand",
  br: "brazil", brazil: "brazil",
  fr: "france", france: "france",
  de: "germany", germany: "germany",
  au: "australia", australia: "australia",
  ca: "canada", canada: "canada",
  global: "worldwide", worldwide: "worldwide",
};

async function scrapeTrends(country) {
  try {
    const url = `https://getdaytrends.com/${country}/`;
    const { data: html } = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    // Parse trend entries
    const trends = [];
    const regex = /<a[^>]+href="\/([^"\/]+)\/"[^>]*>([^<]+)<\/a>/g;
    let match;
    while ((match = regex.exec(html)) !== null && trends.length < 20) {
      const name = match[2].trim().replace(/#/g, "");
      if (name && name.length > 1 && !name.includes("<") && !match[1].includes("about")) {
        // Check if it has volume info
        const afterText = html.slice(match.index, match.index + 500);
        const volMatch = afterText.match(/(\d+[.,]?\d*[KMB]?)\s*(tweets|posts)?/i);
        const volume = volMatch ? volMatch[1] : "";
        trends.push({ rank: trends.length + 1, name, volume });
      }
    }

    // Fallback: simpler pattern
    if (trends.length === 0) {
      const simpleRegex = /<td[^>]*>\s*<a[^>]*>([^<]+)<\/a>/g;
      while ((match = simpleRegex.exec(html)) !== null && trends.length < 20) {
        const name = match[1].trim();
        if (name && name.length > 1) {
          trends.push({ rank: trends.length + 1, name, volume: "" });
        }
      }
    }

    return trends;
  } catch (e) {
    console.error("twittertrend scrape:", e.message);
    return null;
  }
}

async function handler(m, { sock }) {
  try {
    const input = (m.args[0] || "id").toLowerCase().trim();
    const country = COUNTRY_MAP[input] || COUNTRY_MAP["id"];

    await m.react("🕒");
    const trends = await scrapeTrends(country);

    if (!trends || trends.length === 0) {
      await m.react("❌");
      return m.reply(claraWrap("twittertrend", "Gagal ambil trending. Coba lagi nanti.", "error"));
    }

    await m.react("🐣");

    let msg = `╭─「 *ᴛʀᴇɴᴅɪɴɢ ᴛᴡɪᴛᴛᴇʀ* 」\n`;
    msg += `│ Region: *${country}*\n`;
    msg += `│ Source: getdaytrends.com\n`;
    msg += `│\n`;

    trends.slice(0, 15).forEach((t, i) => {
      const rank = String(i + 1).padStart(2, "0");
      const vol = t.volume ? ` (${t.volume})` : "";
      msg += `│ ${rank}. #${t.name}${vol}\n`;
    });

    msg += `╰──────────`;
    return m.reply(msg);
  } catch (err) {
    console.error("twittertrend error:", err);
    await m.react("❌");
    return m.reply(claraWrap("twittertrend", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
