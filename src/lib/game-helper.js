// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// game-helper.js — Helper factory untuk membuat game handler dengan mudah
import { gameManager, delay } from './game-session.js';

/**
 * Buat game handler dengan callback yang sudah ter-struktur.
 *
 * @param {string} gameType - 'tebak-kata', 'math', 'rpg-battle', dll
 * @param {Object} options - { timeout, maxAttempts, onCorrect, onWrong, onSurrender, onTimeout }
 * @returns {Object} game handler object
 *
 * Usage:
 *   const game = createGameHandler('tebak-kata', {
 *     timeout: 60000,
 *     maxAttempts: 3,
 *     onCorrect: async (sock, m, session) => { ... },
 *     onWrong: async (sock, m, session, sisa) => { ... },
 *     onSurrender: async (sock, m, session) => { ... },
 *     onTimeout: async (sock, m, session) => { ... },
 *   })
 */
export function createGameHandler(gameType, options = {}) {
  const {
    timeout = 60000,
    maxAttempts = 3,
    onCorrect,
    onWrong,
    onSurrender,
    onTimeout,
  } = options;

  return {
    type: gameType,
    timeout,
    maxAttempts,

    /**
     * Start game untuk user
     * @param {Object} sock - Baileys socket
     * @param {Object} m - Message object
     * @param {Object} gameData - { jawaban, hadiah, soal, dll }
     * @param {Object} msgKey - Key pesan soal (untuk reply detection)
     * @returns {Object|null} session atau null kalau user sudah main
     */
    async start(sock, m, gameData = {}, msgKey = null) {
      const userJid = m.sender;

      // Cek apakah user sudah ada game aktif
      if (gameManager.has(userJid)) {
        await m.reply('╭─「 ✦ Game ✦ 」\n│\n│ ⚠ Kamu masih ada game yang berjalan!\n│ Ketik *nyerah* untuk menyerah\n│\n╰────  •  ────');
        return null;
      }

      // Start session
      const session = gameManager.start(userJid, m.chat, gameType, {
        ...gameData,
        maxAttempts,
      }, timeout);

      if (!session) {
        await m.reply('╭─「 ✦ Game ✦ 」\n│\n│ ❌ Gagal memulai game\n│ Coba lagi\n│\n╰────  •  ────');
        return null;
      }

      // Simpan key pesan soal
      if (msgKey) {
        gameManager.setMessageKey(userJid, msgKey);
      }

      // Setup listener untuk jawaban
      const listener = createAnswerListener(userJid, {
        onCorrect,
        onWrong,
        onSurrender,
        onTimeout,
      });

      gameManager.on('answer', listener);

      // Setup timeout
      const timeoutHandle = setTimeout(async () => {
        const currentSession = gameManager.get(userJid);
        if (currentSession) {
          gameManager.end(userJid, 'timeout');
          gameManager.off('answer', listener);

          if (typeof onTimeout === 'function') {
            try {
              await onTimeout(sock, m, currentSession);
            } catch (e) {
              console.error(`[Game:${gameType}] Timeout handler error:`, e.message);
            }
          }
        }
      }, timeout);

      // Cleanup listener saat game berakhir
      gameManager.once('end', ({ session: endedSession, reason }) => {
        if (endedSession.userJid === userJid) {
          clearTimeout(timeoutHandle);
          gameManager.off('answer', listener);
        }
      });

      return session;
    },

    /**
     * End game manual
     */
    end(userJid, reason = 'finished') {
      return gameManager.end(userJid, reason);
    },
  };
}

/**
 * Create answer listener untuk game handler
 */
function createAnswerListener(userJid, callbacks) {
  const { onCorrect, onWrong, onSurrender } = callbacks;

  return async function answerListener({ session, message: m, text, isSurrender, sock }) {
    // Pastikan session ini milik user yang benar
    if (session.userJid !== userJid) return;

    const gameSession = gameManager.get(userJid);
    if (!gameSession) return;

    // Handle nyerah
    if (isSurrender) {
      gameManager.end(userJid, 'surrender');
      if (typeof onSurrender === 'function') {
        try {
          await onSurrender(sock, m, gameSession);
        } catch (e) {
          console.error(`[Game] Surrender handler error:`, e.message);
        }
      }
      return;
    }

    // Cek jawaban
    gameSession.data.attempts++;
    const correct = text === gameSession.data.jawaban ||
                    text === String(gameSession.data.jawaban).toLowerCase();

    if (correct) {
      gameManager.end(userJid, 'win');
      if (typeof onCorrect === 'function') {
        try {
          await onCorrect(sock, m, gameSession);
        } catch (e) {
          console.error(`[Game] Correct handler error:`, e.message);
        }
      }
    } else {
      const sisa = gameSession.data.maxAttempts - gameSession.data.attempts;
      if (sisa <= 0) {
        gameManager.end(userJid, 'lose');
        if (typeof onWrong === 'function') {
          try {
            await onWrong(sock, m, gameSession, 0);
          } catch (e) {
            console.error(`[Game] Wrong handler error:`, e.message);
          }
        }
      } else {
        // Update session data
        gameManager.update(userJid, { attempts: gameSession.data.attempts });
        if (typeof onWrong === 'function') {
          try {
            await onWrong(sock, m, gameSession, sisa);
          } catch (e) {
            console.error(`[Game] Wrong handler error:`, e.message);
          }
        }
      }
    }
  };
}

export { gameManager, delay };
