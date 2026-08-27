// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// quranv4.js — Al-Quran via equran.id API v2 (no API key)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "quranv4",
  alias: ["quranv4"],
  category: "islamic",
  description: "Al-Quran lengkap via equran.id (surat, ayat, audio murottal)",
  usage: ".quranv4 [subcommand] [args]",
  example: ".quranv4 list\n.quranv4 1\n.quranv4 1 5\n.quranv4 audio 1\n.quranv4 random",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

const API = "https://equran.id/api/v2";

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`equran.id API ${res.status}`);
  return await res.json();
}

async function handler(m, { sock, config, db }) {
  try {
    const sub = (m.args?.[0] || "").toLowerCase();

    if (!sub || sub === "help") {
      return m.reply(claraWrap("Quran v4", [
        "Al-Quran via equran.id",
        "",
        "📌 *Cara Pakai:*",
        `${m.prefix}quranv4 list — daftar 114 surat`,
        `${m.prefix}quranv4 <surah> — baca surat penuh`,
        `${m.prefix}quranv4 <surah> <ayat> — ayat spesifik`,
        `${m.prefix}quranv4 audio <surah> — audio murottal`,
        `${m.prefix}quranv4 random — ayat acak`,
      ]));
    }

    await m.react("🕒");

    // List all surah
    if (sub === "list") {
      const data = await fetchJSON(`${API}/surat`);
      const surahs = data?.data || [];
      if (!surahs.length) {
        await m.react("🐣");
        return m.reply(claraWrap("Quran v4", "Gagal mengambil daftar surat."));
      }
      let text = "Daftar 114 Surat Al-Quran\n\n";
      for (let i = 0; i < surahs.length; i += 5) {
        const batch = surahs.slice(i, i + 5);
        text += batch.map(s => `${s.nomor}. ${s.namaLatin} (${s.jumlahAyat})`).join(" | ") + "\n";
      }
      await m.react("🐣");
      return m.reply(claraWrap("Quran v4", text));
    }

    // Random ayat
    if (sub === "random") {
      const listData = await fetchJSON(`${API}/surat`);
      const surahs = listData?.data || [];
      if (!surahs.length) throw new Error("Gagal mengambil daftar surat");
      const randomSurah = surahs[Math.floor(Math.random() * surahs.length)];
      const detail = await fetchJSON(`${API}/surat/${randomSurah.nomor}`);
      const ayatList = detail?.data?.ayat || [];
      if (!ayatList.length) throw new Error("Gagal mengambil ayat");
      const randomAyat = ayatList[Math.floor(Math.random() * ayatList.length)];
      const text = `Surat ${detail.data.namaLatin} (${detail.data.nomor}:${randomAyat.nomorAyat})\n\n${randomAyat.teksArab}\n\n${randomAyat.teksLatin}\n\n${randomAyat.teksIndonesia}`;
      await m.react("🐣");
      return m.reply(claraWrap("Quran v4", text));
    }

    // Audio murottal
    if (sub === "audio") {
      const surahNum = parseInt(m.args?.[1] || "");
      if (!surahNum || surahNum < 1 || surahNum > 114) {
        await m.react("🐣");
        return m.reply(claraWrap("Quran v4", `Nomor surat tidak valid. Contoh: ${m.prefix}quranv4 audio 1`));
      }
      const detail = await fetchJSON(`${API}/surat/${surahNum}`);
      const surah = detail?.data;
      if (!surah) throw new Error("Surat tidak ditemukan");
      const audioUrl = surah.audioFull?.["05"] || surah.audioFull?.["01"] || Object.values(surah.audioFull || {})[0];
      if (!audioUrl) {
        await m.react("🐣");
        return m.reply(claraWrap("Quran v4", `Audio murottal surat ${surah.namaLatin} tidak tersedia.`));
      }
      await m.react("🐣");
      await sock.sendMessage(m.chat, {
        audio: { url: audioUrl },
        ptt: true,
        mimetype: "audio/mpeg",
      }, { quoted: m });
      return m.reply(claraWrap("Quran v4", `Audio murottal: ${surah.namaLatin} (Surat ${surah.nomor})`));
    }

    // Show surah or specific ayat
    const surahNum = parseInt(sub);
    if (surahNum && surahNum >= 1 && surahNum <= 114) {
      const ayatNum = parseInt(m.args?.[1] || "");
      const detail = await fetchJSON(`${API}/surat/${surahNum}`);
      const surah = detail?.data;
      if (!surah) throw new Error("Surat tidak ditemukan");

      if (ayatNum) {
        const ayat = surah.ayat?.find(a => a.nomorAyat === ayatNum);
        if (!ayat) {
          await m.react("🐣");
          return m.reply(claraWrap("Quran v4", `Ayat ${ayatNum} tidak ditemukan di surat ${surah.namaLatin}. Surat ini punya ${surah.jumlahAyat} ayat.`));
        }
        const text = `Surat ${surah.namaLatin} : ${ayat.nomorAyat}\n\n${ayat.teksArab}\n\n${ayat.teksLatin}\n\n${ayat.teksIndonesia}`;
        await m.react("🐣");
        return m.reply(claraWrap("Quran v4", text));
      }

      // Full surah (limit first 10 ayat to avoid WhatsApp length limit)
      const ayatList = surah.ayat || [];
      const limit = ayatList.length > 15 ? 10 : ayatList.length;
      let text = `Surat ${surah.namaLatin} (${surah.nomor})\n${surah.jumlahAyat} ayat | ${surah.tempatTurun}\n\n`;
      for (let i = 0; i < limit; i++) {
        const a = ayatList[i];
        text += `${a.nomorAyat}. ${a.teksArab}\n${a.teksLatin}\n${a.teksIndonesia}\n\n`;
      }
      if (ayatList.length > limit) {
        text += `...dan ${ayatList.length - limit} ayat lagi.\nLihat ayat spesifik: ${m.prefix}quranv4 ${surahNum} <ayat>`;
      }
      await m.react("🐣");
      return m.reply(claraWrap("Quran v4", text));
    }

    await m.react("🐣");
    return m.reply(claraWrap("Quran v4", [
      "Command tidak dikenal.",
      `Lihat: ${m.prefix}quranv4 help`,
    ]));
  } catch (e) {
    console.error("[quranv4] error:", e.message);
    await m.react("❌");
    return m.reply(te(m.prefix, m.command, m.pushName), "quranv4");
  }
}

export { pluginConfig as config, handler };
