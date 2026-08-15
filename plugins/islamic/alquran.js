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
      let txt = "╔┈┈「 AL-QURAN 」╎❏\n";
      txt += "╚┈┈❖\n";
      txt += "Baca & dengar Al-Quran dari API online.\n";
      txt += "Data real-time dari alquran.cloud\n\n";
      txt += "*Cara pakai:*\n";
      txt += "1. .alquran <surat> — Baca surat (10 ayat)\n";
      txt += "2. .alquran <surat> <ayat> — Baca ayat spesifik + auto audio\n";
      txt += "3. .alquran audio <surat> <ayat> — Audio murottal saja\n";
      txt += "4. .alquran audio <surat> — Audio 5 ayat pertama\n";
      txt += "5. .alquran qari — Daftar qari (suara)\n";
      txt += "6. .alquran setqari <nama> — Ganti qari default\n\n";
      txt += "*Contoh:*\n";
      txt += ".alquran 1 — Surat Al-Fatihah\n";
      txt += ".alquran 2 255 — Ayat Kursi (teks + audio)\n";
      txt += ".alquran audio 36 1 — Audio Ya-Sin ayat 1\n\n";
      txt += "*Surat Populer:*\n";
      txt += "1 Al-Fatihah | 2 Al-Baqarah | 18 Al-Kahfi\n";
      txt += "36 Ya-Sin | 55 Ar-Rahman | 67 Al-Mulk\n";
      txt += "112 Al-Ikhlas | 113 Al-Falaq | 114 An-Nas\n\n";
      txt += "Qari default: Mishary Alafasy";
      return await sendReplyWithNav(sock, m, txt, "alquran");
    }

    // DAFTAR QARI
    if (subCmd === "qari" || subCmd === "qarilist") {
      let txt = "╔┈┈「 DAFTAR QARI 」╎❏\n";
      txt += "╚┈┈❖\n\n";
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

        let txt = "╔┈┈「 AUDIO AL-QURAN 」╎❏\n";
        txt += "╚┈┈❖\n";
        txt += "Surat: *" + surah.englishName + "*\n";
        txt += "Ayat: " + ayatNum + " dari " + surah.numberOfAyahs + "\n";
        txt += "Qari: " + qari.name + "\n\n";
        txt += "*Terjemahan:*\n" + indoText;
        await m.reply(txt);

        await sendAudio(audioUrl);
        return;
      } else {
        // Audio 5 ayat pertama
        const limit = Math.min(5, surah.numberOfAyahs);
        const audioRes = await fetchJson(API_BASE + "/surah/" + suratNum + "/" + edition);

        let txt = "╔┈┈「 AUDIO AL-QURAN 」╎❏\n";
        txt += "╚┈┈❖\n";
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

      let txt = "╔┈┈「 AL-QURAN 」╎❏\n";
      txt += "╚┈┈❖\n";
      txt += "Surat: *" + surah.englishName + "* (" + surah.name + ")\n";
      txt += "Arti: " + surah.englishNameTranslation + "\n";
      txt += "Ayat: " + ayatNum + " dari " + surah.numberOfAyahs + "\n";
      txt += "Turun: " + (surah.revelationType === "Meccan" ? "Mekkah" : "Madinah") + "\n\n";
      txt += "*Teks Arab:*\n" + arabAyah.text + "\n\n";
      txt += "*Terjemahan Indonesia:*\n" + indoAyah.text + "\n\n";
      txt += "Juz: " + arabAyah.juz + " | Hal: " + arabAyah.page + "\n";
      txt += "Sumber: alquran.cloud API";
      await m.reply(txt);

      // Auto-kirim audio
      await sendAudio(audioUrl);
      return;
    } else {
      // Fetch 10 ayat pertama
      const [arabRes, indoRes] = await Promise.all([
        fetchJson(API_BASE + "/surah/" + suratNum + "/quran-uthmani"),
        fetchJson(API_BASE + "/surah/" + suratNum + "/id.indonesian"),
      ]);

      const arabAyahs = arabRes.data.ayahs;
      const indoAyahs = indoRes.data.ayahs;
      const limit = Math.min(10, arabAyahs.length);

      let txt = "╔┈┈「 AL-QURAN 」╎❏\n";
      txt += "╚┈┈❖\n";
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
