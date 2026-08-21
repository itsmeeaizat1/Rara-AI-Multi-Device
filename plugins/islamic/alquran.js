// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "alquran",
  alias: ["alquran", "bacaquran", "quranv2"],
  category: "islamic",
  description: "Baca & dengar Al-Quran surat & ayat dengan terjemahan + audio (API online)",
  usage: ".alquran <surat> [ayat] atau .alquran audio <surat> <ayat>",
  example: ".alquran 2 255",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

const API_BASE = "https://api.alquran.cloud/v1";

const QARIS = {
  alafasy: { name: "Mishary Rashid Alafasy", edition: "ar.alafasy" },
  abdulbasit: { name: "Abdul Basit Murattal", edition: "ar.abdulbasitmurattal" },
  husary: { name: "Mahmoud Khalil Al-Husary", edition: "ar.husary" },
  minhais: { name: "Minshawi Murattal", edition: "ar.minshawi" },
  muaiqly: { name: "Maher Al Muaiqly", edition: "ar.muhammadayyoub" },
  sudais: { name: "Abdurrahmaan As-Sudais", edition: "ar.abdurrahmaansudais" },
  shatri: { name: "Abu Bakr Ash-Shatri", edition: "ar.shaatree" },
};

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("API error: " + res.status);
  return res.json();
}

async function handler(m, { sock }) {
  try {
    const args = (m.args || []).map((a) => a.toLowerCase());
    const subCmd = args[0];

    async function getSurah(num) {
      const data = await fetchJson(API_BASE + "/surah/" + num);
      return data.data;
    }

    async function sendAudio(url) {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Audio tidak tersedia");
      const buffer = Buffer.from(await res.arrayBuffer());
      await sock.sendMessage(
        m.key.remoteJid,
        { audio: buffer, mimetype: "audio/mpeg", ptt: false },
        { quoted: m }
      );
    }

    // MENU
    if (!subCmd || subCmd === "help" || subCmd === "menu") {
      let txt = "❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Cara pakai:  ┊  ➶\n";
      txt += "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n\n";
      let i = 1;
      for (const [key, qari] of Object.entries(QARIS)) {
        txt += i + ". *" + qari.name + "*\n";
        txt += "   Set: .alquran setqari " + key + "\n\n";
        i++;
      }
      txt += "Qari default: Mishary Alafasy";
      return await m.reply(txt);
    }

    // SET QARI
    if (subCmd === "setqari") {
      const qariKey = args[1];
      if (!qariKey || !QARIS[qariKey]) {
        return m.reply(claraWrap("alquran", "Qari tidak ditemukan!\nLihat: .alquran qari"));
      }
      const db = getDatabase();
      const user = db.getUser(m.sender);
      if (!user.settings) user.settings = {};
      user.settings.qari = qariKey;
      db.save();
      return m.reply("Qari diset ke: *" + QARIS[qariKey].name + "*\nAudio sekarang pakai qari ini.");
    }

    // AUDIO MODE
    if (subCmd === "audio") {
      const suratNum = parseInt(args[1]);
      const ayatNum = args[2] ? parseInt(args[2]) : null;

      if (!suratNum || suratNum < 1 || suratNum > 114) {
        return m.reply(claraWrap("Alquran", "Format: .alquran audio <surat> [ayat]\nContoh: .alquran audio 1 1"));
      }

      const surah = await getSurah(suratNum);

      const db = getDatabase();
      const user = db.getUser(m.sender);
      const qariKey = user.settings?.qari || "alafasy";
      const qari = QARIS[qariKey] || QARIS.alafasy;
      const edition = qari.edition;

      if (ayatNum) {
        if (ayatNum < 1 || ayatNum > surah.numberOfAyahs) {
          return m.reply("Ayat tidak valid! " + surah.englishName + " punya " + surah.numberOfAyahs + " ayat.");
        }

        const [audioRes, indoRes] = await Promise.all([
          fetchJson(API_BASE + "/ayah/" + suratNum + ":" + ayatNum + "/" + edition),
          fetchJson(API_BASE + "/ayah/" + suratNum + ":" + ayatNum + "/id.indonesian"),
        ]);

        const audioUrl = audioRes.data.audio;
        const indoText = indoRes.data.text;

        let txt = "❀°˖✧◝(⁰▿⁰)◜✧˖°❀ " + surah.englishName + "  ┊  ➶\n";
        txt += "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n";
        txt += "Surat: *" + surah.englishName + "* (" + surah.name + ")\n";
        txt += "Total Ayat: " + surah.numberOfAyahs + "\n";
        txt += "Qari: " + qari.name + "\n\n";
        txt += "Mengirim " + limit + " ayat pertama...";
        await m.reply(txt);

        for (let i = 0; i < limit; i++) {
          await sendAudio(audioRes.data.ayahs[i].audio);
          await new Promise((r) => setTimeout(r, 500));
        }

        if (surah.numberOfAyahs > 5) {
          await m.reply("Hanya 5 ayat pertama dikirim.\nAyat spesifik: .alquran audio " + suratNum + " <ayat>");
        }
        return;
      }
    }

    // MODE BACA (teks)
    const suratNum = parseInt(subCmd);
    const ayatNum = args[1] ? parseInt(args[1]) : null;

    if (!suratNum || suratNum < 1 || suratNum > 114) {
      return m.reply(claraWrap("Alquran", "Format tidak valid!\n\nKetik .alquran help buat lihat cara pakai."));
    }

    const surah = await getSurah(suratNum);

    if (ayatNum) {
      if (ayatNum < 1 || ayatNum > surah.numberOfAyahs) {
        return m.reply("Ayat tidak valid! " + surah.englishName + " punya " + surah.numberOfAyahs + " ayat.");
      }

      // Fetch Arabic + Indonesian + audio
      const [arabRes, indoRes, audioRes] = await Promise.all([
        fetchJson(API_BASE + "/ayah/" + suratNum + ":" + ayatNum + "/quran-uthmani"),
        fetchJson(API_BASE + "/ayah/" + suratNum + ":" + ayatNum + "/id.indonesian"),
        fetchJson(API_BASE + "/ayah/" + suratNum + ":" + ayatNum + "/ar.alafasy"),
      ]);

      const arabAyah = arabRes.data;
      const indoAyah = indoRes.data;
      const audioUrl = audioRes.data.audio;

      let txt = "❀°˖✧◝(⁰▿⁰)◜✧˖°❀ " + surah.englishName + "  ┊  ➶\n";
      txt += "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n";
      txt += "Surat: *" + surah.englishName + "* (" + surah.name + ")\n";
      txt += "Arti: " + surah.englishNameTranslation + "\n";
      txt += "Ayat: " + surah.numberOfAyahs + "\n";
      txt += "Turun: " + (surah.revelationType === "Meccan" ? "Mekkah" : "Madinah") + "\n\n";

      for (let i = 0; i < limit; i++) {
        txt += "*" + surah.englishName + ":" + arabAyahs[i].numberInSurah + "*\n";
        txt += arabAyahs[i].text + "\n";
        txt += indoAyahs[i].text + "\n\n";
      }

      if (surah.numberOfAyahs > 10) {
        txt += "Menampilkan 10 ayat pertama dari " + surah.numberOfAyahs + " ayat.\n";
        txt += "Baca ayat spesifik: .alquran " + suratNum + " <ayat>";
      }

      txt += "\nAudio: .alquran audio " + suratNum + " <ayat>\n";
      txt += "Sumber: alquran.cloud API";
      return await m.reply(txt);
    }
  } catch (error) {
    return m.reply("Error: " + error.message + "\n\nCoba lagi nanti.");
  }
}

export { pluginConfig as config, handler };
