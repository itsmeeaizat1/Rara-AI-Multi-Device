// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// tebakangka.js — Contoh game pakai Game Session Manager baru
// Pattern: createGameHandler + gameManager.start/end + EventEmitter
import { createGameHandler } from '../../src/lib/game-helper.js';
import { gameManager } from '../../src/lib/game-session.js';
import { claraWrap } from '../../src/lib/nova-menu-style.js';

const pluginConfig = {
  name: "tebakangka",
  alias: ["ta", "guessnumber"],
  category: "game",
  description: "Tebak angka 1-100, 3 kesempatan",
  usage: ".tebakangka",
  example: ".tebakangka",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

// Buat game handler dengan callback
const game = createGameHandler('tebak-angka', {
  timeout: 60000,
  maxAttempts: 3,

  onCorrect: async (sock, m, session) => {
    const hadiah = session.data.hadiah;
    await sock.sendMessage(m.chat, {
      text: `🎉 *BENAR!*\n\nAngkanya: *${session.data.jawaban}*\nHadiah: *${hadiah} koin*\n\nSisa nyawa: *${session.data.maxAttempts - session.data.attempts}*`,
    }, { quoted: m });
  },

  onWrong: async (sock, m, session, sisa) => {
    if (sisa <= 0) {
      await sock.sendMessage(m.chat, {
        text: `💀 *GAME OVER!*\n\nAngkanya: *${session.data.jawaban}*\n\n_coba lagi ya_`,
      }, { quoted: m });
    } else {
      const hint = session.data.jawaban > session.data.lastGuess
        ? '⬆️ Lebih BESAR'
        : '⬇️ Lebih KECIL';
      await sock.sendMessage(m.chat, {
        text: `❌ *Salah!*\n\nPetunjuk: ${hint}\nSisa: *${sisa}x* kesempatan\n\nKetik *nyerah* untuk menyerah`,
      }, { quoted: m });
    }
  },

  onSurrender: async (sock, m, session) => {
    await sock.sendMessage(m.chat, {
      text: `🏳️ *Menyerah!*\n\nAngkanya: *${session.data.jawaban}*`,
    }, { quoted: m });
  },

  onTimeout: async (sock, m, session) => {
    await sock.sendMessage(m.chat, {
      text: `⏱️ *Waktu Habis!*\n\nAngkanya: *${session.data.jawaban}*`,
    }, { quoted: m }).catch(() => {});
  },
});

async function handler(m, { sock }) {
  // Generate random number 1-100
  const jawaban = Math.floor(Math.random() * 100) + 1;
  const hadiah = Math.floor(Math.random() * 500) + 100;

  // Kirim soal
  const msg = await sock.sendMessage(m.chat, {
    text: `🎯 *TEBAK ANGKA*\n\nAku pikir angka 1-100.\nKetik jawaban langsung (tanpa prefix)!\n\n⏱️ Waktu: 60 detik\n💰 Hadiah: ${hadiah} koin\nNyawa: 3x\n\nKetik *nyerah* untuk menyerah.`,
  }, { quoted: m });

  // Start game session
  await game.start(sock, m, {
    jawaban: String(jawaban),
    hadiah,
    lastGuess: 0,
  }, msg.key);
}

export { pluginConfig as config, handler };
