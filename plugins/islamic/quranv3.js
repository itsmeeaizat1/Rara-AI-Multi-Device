// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/nova-error.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "quranv3",
  alias: ["quran3", "alquran3", "quranv3", "bacaquran3"],
  category: "islamic",
  description: "Al-Quran lengkap: baca surat, ayat, audio murottal, dan random ayat (Arab + Indonesia)",
  usage: ".quranv3 [subcommand] [args]",
  example: ".quranv3 1\n.quranv3 2 255\n.quranv3 audio 1\n.quranv3 random",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

const API_BASE = "https://api.alquran.cloud/v1";
const AUDIO_CDN = "https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("API error: " + res.status);
  return res.json();
}

async function sendAudio(sock, m, url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Audio tidak tersedia");
  const buffer = Buffer.from(await res.arrayBuffer());
  await sock.sendMessage(
    m.key.remoteJid,
    { audio: buffer, mimetype: "audio/mpeg", ptt: false },
    { quoted: m }
  );
}

async function handler(m, { sock }) {
  try {
    const args = (m.args || []).map((a) => a.toLowerCase());
    const subCmd = args[0];

    // ===== HELP / MENU =====
    if (!subCmd || subCmd === "help" || subCmd === "menu" || subCmd === "how") {
      let txt = claraWrap("Al-Quran V3", [
        "Al-Quran lengkap dengan teks Arab dan terjemahan Indonesia, plus audio murottal.",
        "Data real-time dari alquran.cloud API",
        "",
        "CARA PAKAI:",
        m.prefix + "quranv3 — Random ayat (Arab + Indo + audio)",
        m.prefix + "quranv3 random — Random ayat juga",
        m.prefix + "quranv3 <surat> — Baca 10 ayat pertama (Arab + Indo)",
        m.prefix + "quranv3 <surat> <ayat> — Baca ayat spesifik + audio",
        m.prefix + "quranv3 surah <nomor> — Baca full surat (Arab + Indo)",
        m.prefix + "quranv3 ayah <surat>:<ayat> — Baca ayat spesifik (Arab + Indo + audio)",
        m.prefix + "quranv3 audio <surat> — Audio murottal full surat",
        m.prefix + "quranv3 audio <surat> <ayat> — Audio murottal 1 ayat",
        "",
        "CONTOH:",
        m.prefix + "quranv3 1 — Al-Fatihah",
        m.prefix + "quranv3 2 255 — Ayat Kursi",
        m.prefix + "quranv3 audio 36 — Audio full Ya-Sin",
        m.prefix + "quranv3 ayah 1:1 — Ayat pertama Al-Fatihah",
        "",
        "SURAT POPULER:",
        "1 Al-Fatihah | 2 Al-Baqarah | 18 Al-Kahfi",
        "36 Ya-Sin | 55 Ar-Rahman | 67 Al-Mulk",
        "112 Al-Ikhlas | 113 Al-Falaq | 114 An-Nas",
      ]);
      return await sendReplyWithNav(sock, m, txt, "quranv3");
    }

    // ===== RANDOM AYAH =====
    if (subCmd === "random") {
      await m.react("🕐");
      let data = null;
      for (let i = 0; i < 5; i++) {
        const surah = Math.floor(Math.random() * 114) + 1;
        const maxAyah = 286;
        const ayah = Math.floor(Math.random() * maxAyah) + 1;
        try {
          const url = API_BASE + "/ayah/" + surah + ":" + ayah + "/editions/quran-uthmani,id.indonesian,ar.alafasy";
          const json = await fetchJson(url);
          if (json.code === 200 && json.data) {
            data = json;
            break;
          }
        } catch {}
      }

      if (!data) {
        await m.react("❌");
        return m.reply(claraWrap("Quran V3 Error", "Gagal mengambil random ayat. Coba lagi nanti."));
      }

      const arabic = data.data[0];
      const indo = data.data[1];
      const audio = data.data[2];
      const surahInfo = arabic.surah;

      let txt = claraWrap("Random Ayat", [
        "Surat: *" + surahInfo.englishName + "* (" + surahInfo.name + ")",
        "Arti: " + surahInfo.englishNameTranslation,
        "Ayat: " + arabic.numberInSurah + " dari " + surahInfo.numberOfAyahs,
        "Turun: " + (surahInfo.revelationType === "Meccan" ? "Mekkah" : "Madinah"),
        "",
        "*Teks Arab:*",
        arabic.text,
        "",
        "*Terjemahan Indonesia:*",
        indo.text,
        "",
        "Juz: " + arabic.juz + " | Hal: " + arabic.page,
        "Sumber: alquran.cloud API",
      ]);

      await m.react("✅");
      await m.reply(txt);

      // Auto kirim audio
      if (audio?.audio) {
        try {
          await sendAudio(sock, m, audio.audio);
        } catch {}
      }
      return;
    }

    // ===== AUDIO MODE =====
    if (subCmd === "audio") {
      const suratNum = parseInt(args[1]);
      const ayatNum = args[2] ? parseInt(args[2]) : null;

      if (!suratNum || suratNum < 1 || suratNum > 114) {
        return m.reply(claraWrap("Quran V3", "Format: .quranv3 audio <surat> [ayat]\nContoh: .quranv3 audio 1\n.quranv3 audio 36 1"));
      }

      await m.react("🕐");

      const surahRes = await fetchJson(API_BASE + "/surah/" + suratNum);
      const surah = surahRes.data;

      if (ayatNum) {
        if (ayatNum < 1 || ayatNum > surah.numberOfAyahs) {
          await m.react("❌");
          return m.reply(claraWrap("Quran V3", "Ayat tidak valid! " + surah.englishName + " punya " + surah.numberOfAyahs + " ayat."));
        }

        const audioRes = await fetchJson(API_BASE + "/ayah/" + suratNum + ":" + ayatNum + "/ar.alafasy");
        const indoRes = await fetchJson(API_BASE + "/ayah/" + suratNum + ":" + ayatNum + "/id.indonesian");

        let txt = claraWrap("Audio Al-Quran", [
          "Surat: *" + surah.englishName + "* (" + surah.name + ")",
          "Ayat: " + ayatNum + " dari " + surah.numberOfAyahs,
          "Qari: Mishary Rashid Alafasy",
          "",
          "*Terjemahan:*",
          indoRes.data.text,
          "",
          "Audio sedang dikirim...",
        ]);

        await m.reply(txt);
        await m.react("✅");
        await sendAudio(sock, m, audioRes.data.audio);
      } else {
        // Full surah audio via CDN
        let txt = claraWrap("Audio Al-Quran", [
          "Surat: *" + surah.englishName + "* (" + surah.name + ")",
          "Total Ayat: " + surah.numberOfAyahs,
          "Qari: Mishary Rashid Alafasy",
          "",
          "Mengirim audio full surat...",
          "Mohon tunggu, file bisa cukup besar.",
        ]);

        await m.reply(txt);
        await m.react("✅");

        // Download dari CDN (full surah 1 file)
        const cdnUrl = AUDIO_CDN + "/" + suratNum + ".mp3";
        try {
          await sendAudio(sock, m, cdnUrl);
        } catch {
          // Fallback: kirim 5 ayat pertama per-ayat
          const limit = Math.min(5, surah.numberOfAyahs);
          const audioRes = await fetchJson(API_BASE + "/surah/" + suratNum + "/ar.alafasy");
          for (let i = 0; i < limit; i++) {
            await sendAudio(sock, m, audioRes.data.ayahs[i].audio);
            await new Promise((r) => setTimeout(r, 500));
          }
          if (surah.numberOfAyahs > 5) {
            await m.reply(claraWrap("Quran V3", "CDN gagal, hanya 5 ayat pertama dikirim.\nAyat spesifik: .quranv3 audio " + suratNum + " <ayat>"));
          }
        }
      }
      return;
    }

    // ===== SURAH MODE (Arab + Indo) =====
    if (subCmd === "surah") {
      const suratNum = parseInt(args[1]);
      if (!suratNum || suratNum < 1 || suratNum > 114) {
        return m.reply(claraWrap("Quran V3", "Format: .quranv3 surah <nomor>\nContoh: .quranv3 surah 1"));
      }

      await m.react("🕐");
      const json = await fetchJson(API_BASE + "/surah/" + suratNum + "/editions/quran-uthmani,id.indonesian");
      const surahData = json.data[0];
      const indoData = json.data[1];
      const totalAyahs = surahData.numberOfAyahs;
      const limit = Math.min(10, totalAyahs);

      let lines = [
        "Surat: *" + surahData.englishName + "* (" + surahData.name + ")",
        "Arti: " + surahData.englishNameTranslation,
        "Total Ayat: " + totalAyahs,
        "Turun: " + (surahData.revelationType === "Meccan" ? "Mekkah" : "Madinah"),
        "",
      ];

      for (let i = 0; i < limit; i++) {
        lines.push("*" + surahData.englishName + ":" + surahData.ayahs[i].numberInSurah + "*");
        lines.push(surahData.ayahs[i].text);
        lines.push(indoData.ayahs[i].text);
        lines.push("");
      }

      if (totalAyahs > 10) {
        lines.push("Menampilkan 10 ayat pertama dari " + totalAyahs + " ayat.");
        lines.push("Ayat spesifik: .quranv3 " + suratNum + " <ayat>");
      }

      lines.push("");
      lines.push("Audio: .quranv3 audio " + suratNum);
      lines.push("Sumber: alquran.cloud API");

      await m.react("✅");
      return await m.reply(claraWrap("Al-Quran V3", lines));
    }

    // ===== AYAH MODE (Arab + Indo + audio) =====
    if (subCmd === "ayah") {
      const parts = args[1] ? args[1].split(":") : [];
      const suratNum = parseInt(parts[0]);
      const ayatNum = parseInt(parts[1]);

      if (!suratNum || !ayatNum) {
        return m.reply(claraWrap("Quran V3", "Format: .quranv3 ayah <surat>:<ayat>\nContoh: .quranv3 ayah 1:1\n.quranv3 ayah 2:255"));
      }

      if (suratNum < 1 || suratNum > 114) {
        return m.reply(claraWrap("Quran V3", "Nomor surat harus 1-114."));
      }

      await m.react("🕐");
      const json = await fetchJson(API_BASE + "/ayah/" + suratNum + ":" + ayatNum + "/editions/quran-uthmani,id.indonesian,ar.alafasy");

      if (json.code !== 200) {
        await m.react("❌");
        return m.reply(claraWrap("Quran V3", "Ayat tidak ditemukan. Cek nomor surat dan ayat."));
      }

      const arabic = json.data[0];
      const indo = json.data[1];
      const audio = json.data[2];
      const surahInfo = arabic.surah;

      let txt = claraWrap("Al-Quran V3", [
        "Surat: *" + surahInfo.englishName + "* (" + surahInfo.name + ")",
        "Ayat: " + arabic.numberInSurah + " dari " + surahInfo.numberOfAyahs,
        "Arti: " + surahInfo.englishNameTranslation,
        "",
        "*Teks Arab:*",
        arabic.text,
        "",
        "*Terjemahan Indonesia:*",
        indo.text,
        "",
        "Juz: " + arabic.juz + " | Hal: " + arabic.page,
        "Sumber: alquran.cloud API",
      ]);

      await m.react("✅");
      await m.reply(txt);

      if (audio?.audio) {
        try { await sendAudio(sock, m, audio.audio); } catch {}
      }
      return;
    }

    // ===== DEFAULT: <surat> [ayat] =====
    const suratNum = parseInt(subCmd);
    const ayatNum = args[1] ? parseInt(args[1]) : null;

    if (!suratNum || suratNum < 1 || suratNum > 114) {
      return m.reply(claraWrap("Quran V3", "Format tidak valid!\n\nKetik .quranv3 help buat lihat cara pakai."));
    }

    await m.react("🕐");
    const surahRes = await fetchJson(API_BASE + "/surah/" + suratNum);
    const surah = surahRes.data;

    if (ayatNum) {
      if (ayatNum < 1 || ayatNum > surah.numberOfAyahs) {
        await m.react("❌");
        return m.reply(claraWrap("Quran V3", "Ayat tidak valid! " + surah.englishName + " punya " + surah.numberOfAyahs + " ayat."));
      }

      const [arabRes, indoRes, audioRes] = await Promise.all([
        fetchJson(API_BASE + "/ayah/" + suratNum + ":" + ayatNum + "/quran-uthmani"),
        fetchJson(API_BASE + "/ayah/" + suratNum + ":" + ayatNum + "/id.indonesian"),
        fetchJson(API_BASE + "/ayah/" + suratNum + ":" + ayatNum + "/ar.alafasy"),
      ]);

      const arabAyah = arabRes.data;
      const indoAyah = indoRes.data;
      const audioUrl = audioRes.data.audio;

      let txt = claraWrap("Al-Quran V3", [
        "Surat: *" + surah.englishName + "* (" + surah.name + ")",
        "Arti: " + surah.englishNameTranslation,
        "Ayat: " + ayatNum + " dari " + surah.numberOfAyahs,
        "Turun: " + (surah.revelationType === "Meccan" ? "Mekkah" : "Madinah"),
        "",
        "*Teks Arab:*",
        arabAyah.text,
        "",
        "*Terjemahan Indonesia:*",
        indoAyah.text,
        "",
        "Juz: " + arabAyah.juz + " | Hal: " + arabAyah.page,
        "Sumber: alquran.cloud API",
      ]);

      await m.react("✅");
      await m.reply(txt);

      // Auto kirim audio
      try { await sendAudio(sock, m, audioUrl); } catch {}
      return;
    } else {
      // 10 ayat pertama (Arab + Indo)
      const [arabRes, indoRes] = await Promise.all([
        fetchJson(API_BASE + "/surah/" + suratNum + "/quran-uthmani"),
        fetchJson(API_BASE + "/surah/" + suratNum + "/id.indonesian"),
      ]);

      const arabAyahs = arabRes.data.ayahs;
      const indoAyahs = indoRes.data.ayahs;
      const limit = Math.min(10, arabAyahs.length);

      let lines = [
        "Surat: *" + surah.englishName + "* (" + surah.name + ")",
        "Arti: " + surah.englishNameTranslation,
        "Total Ayat: " + surah.numberOfAyahs,
        "Turun: " + (surah.revelationType === "Meccan" ? "Mekkah" : "Madinah"),
        "",
      ];

      for (let i = 0; i < limit; i++) {
        lines.push("*" + surah.englishName + ":" + arabAyahs[i].numberInSurah + "*");
        lines.push(arabAyahs[i].text);
        lines.push(indoAyahs[i].text);
        lines.push("");
      }

      if (surah.numberOfAyahs > 10) {
        lines.push("Menampilkan 10 ayat pertama dari " + surah.numberOfAyahs + " ayat.");
        lines.push("Ayat spesifik: .quranv3 " + suratNum + " <ayat>");
      }

      lines.push("");
      lines.push("Audio: .quranv3 audio " + suratNum);
      lines.push("Sumber: alquran.cloud API");

      await m.react("✅");
      return await m.reply(claraWrap("Al-Quran V3", lines));
    }
  } catch (error) {
    console.error("[Quran V3]", error);
    await m.react("❌");
    return m.reply(claraWrap("quranv3", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
