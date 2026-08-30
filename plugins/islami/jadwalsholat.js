// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { claraWrap , novaBox} from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "jadwalsholat",
  alias: ["jadwalsholat", "jadwalsolat", "sholat", "solat", "prayerschedule"],
  category: "islami",
  description: "Jadwal sholat berdasarkan kota (API Aladhan)",
  usage: ".jadwalsholat <nama kota>",
  example: ".jadwalsholat Jakarta",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

const PRAYER_NAMES = {
  Fajr: "Subuh", Dhuhr: "Dzuhur", Asr: "Ashar",
  Maghrib: "Maghrib", Isha: "Isya", Sunrise: "Terbit", Sunset: "Terbenam",
};

async function handler(m, { sock }) {
  try {
    const city = m.args.join(" ").trim();
    if (!city) {
      return m.reply(claraWrap("jadwalsholat", `Mau cek jadwal sholat kota mana?\n\nContoh: ${m.prefix}jadwalsholat Jakarta`, "guide"));
    }

    await m.react("🕒");
    const { data } = await axios.get(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=Indonesia&method=20`, {
      timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!data || data.code !== 200 || !data.data) {
      await m.react("❌");
      return m.reply(claraWrap("jadwalsholat", `Kota "${city}" tidak ditemukan. Coba nama kota lain.`, "error"));
    }

    const timings = data.data.timings;
    const date = data.data.date;
    const hijri = date.hijri;
    const gregorian = date.gregorian;

    const masehi = `${gregorian.day} ${gregorian.month.en} ${gregorian.year}`;
    const hijriDate = `${hijri.day} ${hijri.month.en} ${hijri.year} H`;

    await m.react("🐣");
    let _lines = [];
      _lines.push(`📍 Kota: *${city}*`);
      _lines.push(`📅 ${hijriDate}`);
      _lines.push(`📆 ${masehi}`);
      _lines.push(`🌅 Subuh    : ${timings.Fajr}`);
      _lines.push(`☀️ Dzuhur  : ${timings.Dhuhr}`);
      _lines.push(`🌤️ Ashar   : ${timings.Asr}`);
      _lines.push(`🌇 Maghrib : ${timings.Maghrib}`);
      _lines.push(`🌙 Isya     : ${timings.Isha}`);
    let msg = novaBox("ᴊᴀᴅᴡᴀʟ ꜱʜᴏʟᴀᴛ", _lines);
    return m.reply(msg);
  } catch (err) {
    console.error("jadwalsholat error:", err);
    await m.react("❌");
    return m.reply(claraWrap("jadwalsholat", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
