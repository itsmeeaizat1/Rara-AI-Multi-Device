// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Anime Couple PP — Random anime couple profile pictures via Andaraz API
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "animecouple",
  alias: ["animecouple"],
  category: "anime",
  description: "Anime Couple PP — random gambar pp couple anime via Andaraz API",
  usage: ".animecouple",
  example: ".animecouple",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

import fs from "node:fs";
import { getAndarazConfig } from "../../src/lib/config/env-loader.js";
const andarazConfig = getAndarazConfig();
const API_KEY = andarazConfig.apikey;
const API_URL = "https://api.andaraz.com/api/randomanime/couples";

async function fetchCouplePP() {
  const url = API_URL + "?apikey=" + API_KEY;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });

  if (!res.ok) {
    throw new Error("HTTP " + res.status);
  }

  const data = await res.json();
  if (!data.status || data.status !== "OK") {
    throw new Error(data.message || "API error");
  }

  const male = data.result?.male;
  const female = data.result?.female;

  if (!male || !female) {
    throw new Error("Gambar couple tidak ditemukan");
  }

  // Download both images
  const [maleRes, femaleRes] = await Promise.all([
    fetch(male, { signal: AbortSignal.timeout(15000) }),
    fetch(female, { signal: AbortSignal.timeout(15000) }),
  ]);

  if (!maleRes.ok || !femaleRes.ok) {
    throw new Error("Gagal download gambar couple");
  }

  const maleBuf = Buffer.from(await maleRes.arrayBuffer());
  const femaleBuf = Buffer.from(await femaleRes.arrayBuffer());

  return { male: maleBuf, female: femaleBuf, maleUrl: male, femaleUrl: female };
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    await m.react("🕒");

    const result = await fetchCouplePP();

    // Send male PP
    try {
      await conn.sendMessage(m.key.remoteJid, {
        image: result.male,
        caption: novaWrap("Anime Couple PP", [
          "COUPLE ANIME (COWOK)",
          "",
          "Source: Andaraz API",
          "Gambar ini untuk PP cowok",
        ], "info"),
      }, { quoted: m });
    } catch (e) {
      console.error("[AnimeCouple] male send:", e.message);
    }

    // Small delay to avoid rate limit
    await new Promise((r) => setTimeout(r, 1000));

    // Send female PP
    try {
      await conn.sendMessage(m.key.remoteJid, {
        image: result.female,
        caption: novaWrap("Anime Couple PP", [
          "COUPLE ANIME (CEWEK)",
          "",
          "Source: Andaraz API",
          "Gambar ini untuk PP cewek",
        ], "info"),
      }, { quoted: m });
    } catch (e) {
      console.error("[AnimeCouple] female send:", e.message);
      // Fallback: send URLs
      return m.reply(novaWrap("Anime Couple PP", [
        "Gagal kirim gambar, ini link-nya:",
        "",
        "Cowok: " + result.maleUrl,
        "Cewek: " + result.femaleUrl,
      ], "warn"));
    }
  } catch (e) {
    console.error("[AnimeCouple]", e);
    m.reply(novaWrap("Anime Couple PP", [
      "Error: " + e.message,
      "",
      "Kemungkinan penyebab:",
      "1. API Andaraz sedang maintenance",
      "2. Koneksi timeout",
      "3. Gambar gagal didownload",
    ], "warn"));
  }
}

export { pluginConfig as config, handler };
