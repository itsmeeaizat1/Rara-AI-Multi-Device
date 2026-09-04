// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { novaGameBox } from "../../src/lib/nova-games.js";

const sessions = new Map();

const pluginConfig = {
  name: "tebaksurah",
  alias: ["tebaksurah", "guesssurah"],
  category: "game",
  description: "Game tebak nama surah Al-Quran",
  usage: ".tebaksurah",
  example: ".tebaksurah",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock, db }) {
  try {
    const groupId = m.chat;

    // Kalau ada session aktif, cek jawaban
    if (sessions.has(groupId)) {
      const session = sessions.get(groupId);
      const answer = m.text?.trim().toLowerCase();
      const correctNames = [
        session.surahData.englishName?.toLowerCase(),
        session.surahData.name?.toLowerCase(),
        session.surahData.indonesianName?.toLowerCase(),
      ].filter(Boolean);

      if (correctNames.some(n => n === answer || n.includes(answer) || answer.includes(n))) {
        clearTimeout(session.timeout);
        sessions.delete(groupId);

        await m.react("🐣");
        let msg = "";
        msg += `✅ Benar! Jawaban: *${session.surahData.englishName}*\n`;
        msg += `(${session.surahData.englishNameTranslation})\n`;
        msg += `🎉 Bonus: +5 energi\n`;
        
        // Bonus energi
        try {
          if (db && typeof db.addEnergi === "function") {
            db.addEnergi(m.sender, 5);
          }
        } catch {}

        return m.reply(msg);
      } else {
        await m.react("❌");
        return m.reply(novaGameBox({ title: "tebaksurah", icon: "📖", flavor: "❌ *BELUM TEPAT!*", body: "Jawabanmu belum benar, coba lagi ya kak!" }));
      }
    }

    // Mulai game baru
    await m.react("🕒");
    const surahNum = Math.floor(Math.random() * 114) + 1;
    const { data } = await axios.get(`https://api.alquran.cloud/v1/surah/${surahNum}`, {
      timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!data || data.code !== 200 || !data.data) {
      await m.react("❌");
      return m.reply(claraWrap("tebaksurah", "Gagal mulai game. Coba lagi.", "error"));
    }

    const surah = data.data;
    const revelation = surah.revelationType === "Meccan" ? "Makkiyah" : "Madaniyah";

    await m.react("🐣");
    let msg = "";
    msg += `📖 Surah ke-*${surah.number}*\n`;
    msg += `Jumlah ayat: *${surah.numberOfAyahs}*\n`;
    msg += `Revelation: *${revelation}*\n`;
    msg += `Arti: *${surah.englishNameTranslation}*\n`;
    msg += `
`;
    msg += `Tebak nama surahnya!\n`;
    msg += `Waktu: 60 detik\n`;
        await m.reply(msg);

    // Set session
    const timeout = setTimeout(async () => {
      if (sessions.has(groupId)) {
        const s = sessions.get(groupId);
        sessions.delete(groupId);
        try {
          await sock.sendMessage(groupId, {
            text: `⏰ Waktu habis!\nJawaban: *${s.surahData.englishName}*\n(${s.surahData.englishNameTranslation})`,
          });
        } catch {}
      }
    }, 60000);

    sessions.set(groupId, {
      surahData: surah,
      answer: surah.englishName?.toLowerCase(),
      timeout,
    });
  } catch (err) {
    console.error("tebaksurah error:", err);
    await m.react("❌");
    return m.reply(claraWrap("tebaksurah", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
