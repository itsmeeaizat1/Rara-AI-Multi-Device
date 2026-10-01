// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// audiosurah.js — Audio murattal surah
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap , raraBox} from "../../src/lib/rara-menu-style.js";

const SURAH_LIST = {
  1: "Al-Fatihah", 2: "Al-Baqarah", 3: "Ali Imran", 4: "An-Nisa", 5: "Al-Maidah",
  6: "Al-Anam", 7: "Al-Araf", 8: "Al-Anfal", 9: "At-Taubah", 10: "Yunus",
  11: "Hud", 12: "Yusuf", 13: "Ar-Rad", 14: "Ibrahim", 15: "Al-Hijr",
  16: "An-Nahl", 17: "Al-Isra", 18: "Al-Kahf", 19: "Maryam", 20: "Ta-Ha",
};

const pluginConfig = {
  name: "audiosurah",
  alias: ["audiosurah", "surahaudio", "murattal"],
  category: "islami",
  description: "Audio murattal Al-Quran",
  usage: ".audiosurah <nomor_surah>",
  example: ".audiosurah 1",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await m.react("🕒");
    const num = parseInt(m.args?.[0]);
    if (!num || num < 1 || num > 114) {
      let _lines = [];
        _lines.push(`Masukkan nomor surah (1-114)`);
      Object.entries(SURAH_LIST).slice(0, 10).forEach(([n, name]) => {
        _lines.push(`${n}. ${name}`);
      });
        _lines.push(`...`);
      let msg = raraBox("AUDIO SURAH", _lines);
      return m.reply(msg);
    }

    const res = await axios.get(`https://api.alquran.cloud/v1/surah/${num}/ar.alafasy`);
    const d = res.data?.data;
    if (!d) return m.reply(raraWrap("audiosurah", "Surah tidak ditemukan!", "error"));

    const audioUrl = d.audio;
    if (audioUrl) {
      await sock.sendMessage(from, {
        audio: { url: audioUrl },
        mimetype: "audio/mpeg",
        caption: `Murattal: ${d.englishName} (${d.numberOfAyahs} ayat)`
      }, { quoted: m });
    } else {
      return m.reply(raraWrap("audiosurah", "Audio tidak tersedia!", "error"));
    }
    await m.react("🐣");
  } catch (err) {
    console.error("audiosurah error:", err);
    await m.react("❌");
    return m.reply(raraWrap("audiosurah", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
