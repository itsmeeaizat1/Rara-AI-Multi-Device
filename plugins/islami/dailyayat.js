// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "dailyayat",
  aliases: ["dailyayat", "ayatharian", "randomayat", "randomverse", "ayatacak"],
  category: "islami",
  description: "Ayat Al-Quran acak dengan terjemahan (API equran.id Kemenag)",
  usage: ".dailyayat | .dailyayat <surah>:<ayat> | .dailyayat 2:255",
  example: ".dailyayat | .dailyayat 2:255 (Ayat Kursi)",
  isGroupOnly: false,
}

const API_BASE = "https://equran.id/api/v2";

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = (args[0] || "").trim();

    let surahNum, ayatNum;

    if (input && input.includes(":")) {
      const parts = input.split(":");
      surahNum = parseInt(parts[0]);
      ayatNum = parseInt(parts[1]);
    } else if (input) {
      surahNum = parseInt(input);
    }

    let surahData;
    
    if (surahNum && !isNaN(surahNum)) {
      // Get specific surah
      const res = await axios.get(API_BASE + "/surat/" + surahNum, { timeout: 10000 });
      surahData = res.data;
      if (!surahData || !surahData.ayat) {
        return m.reply(claraWrap("Daily Ayat", "Surah tidak ditemukan: " + surahNum));
      }

      let ayat;
      if (ayatNum && !isNaN(ayatNum) && ayatNum <= surahData.ayat.length) {
        ayat = surahData.ayat[ayatNum - 1];
      } else {
        // Random ayat from surah
        ayat = surahData.ayat[Math.floor(Math.random() * surahData.ayat.length)];
      }

      const lines = [
        surahData.nama + " (" + surahData.namaLatin + ")",
        "Ayat " + ayat.nomorAyat + " dari " + surahData.jumlahAyat,
        "",
        ayat.teksArab,
        "",
        "Arti: " + ayat.teksIndonesia,
        "",
        surahData.tempatTurun === "Mekkah" ? "Surah Makiyah" : "Surah Madaniyah",
      ];
      return m.reply(claraWrap("Daily Ayat", lines.join("\n")));
    }

    // Random surah + random ayat
    const randomSurah = Math.floor(Math.random() * 114) + 1;
    const res = await axios.get(API_BASE + "/surat/" + randomSurah, { timeout: 10000 });
    surahData = res.data;

    if (!surahData || !surahData.ayat) {
      return m.reply(claraWrap("Daily Ayat", "Gagal mengambil ayat."));
    }

    const randomAyat = surahData.ayat[Math.floor(Math.random() * surahData.ayat.length)];

    const lines = [
      surahData.nama + " (" + surahData.namaLatin + ")",
      "Ayat " + randomAyat.nomorAyat + " dari " + surahData.jumlahAyat,
      "",
      randomAyat.teksArab,
      "",
      "Arti: " + randomAyat.teksIndonesia,
      "",
      surahData.tempatTurun === "Mekkah" ? "Surah Makiyah" : "Surah Madaniyah",
    ];
    return m.reply(claraWrap("Daily Ayat - Acak", lines.join("\n")));
  } catch (e) {
    console.error("dailyayat error:", e.message);
    return m.reply(claraWrap("Daily Ayat", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
