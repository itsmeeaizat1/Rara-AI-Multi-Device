// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-game-factory.js — Game factory rebuild dari nol
// Uses nova-game-engine.js, m.reply for question, sock.sendMessage for results

import {
  getRandomItem, createSession, getSession, hasSession, endSession,
  setSessionTimer, getRemainingTime, formatTime,
  checkAnswer, isSurrender, isReplyToGame,
  getHint, getProgressiveHint, getRandomReward,
  pick, WIN_MSGS, TIMEOUT_MSGS, SURRENDER_MSGS, WRONG_MSGS,
} from './nova-game-engine.js';
import { getDatabase } from './nova-database.js';
import { gameCTA } from './nova-games.js';
import { addExpWithLevelCheck } from './nova-level.js';

let fetchBuffer;
try {
  fetchBuffer = (await import('./nova-utils.js')).fetchBuffer;
} catch {}

// ─── Info energi kekuras (request owner: info section di caption hasil game) ───
// m.energiInfo diset sama handler.js setelah pemotongan energi.
function renderEnergiLine(m, cfg) {
  const e = m?.energiInfo;
  if (e) {
    if (e.unlimited) return `│ ❈ Energi: ∞ (unlimited)\n`;
    if (e.deducted > 0) return `│ ❈ Energi: -${e.deducted} (sisa ${e.sisa})\n`;
    return `│ ❈ Energi: gratis\n`;
  }
  if (cfg.energi > 0) return `│ ❈ Energi: -${cfg.energi}\n`;
  return '';
}

function fmtNum(n) {
  return n.toLocaleString('id-ID');
}

class GameFactory {
  constructor() {
    this.registry = new Map();
  }

  register(gameType, cfg) {
    const defaults = {
      dataFile: `${gameType}.json`,
      questionField: 'soal',
      answerField: 'jawaban',
      emoji: '🎮',
      title: gameType.toUpperCase(),
      description: `Game ${gameType}`,
      timeout: 60000,
      cooldown: 5,
      hasImage: false,
      imageField: 'img',
      alias: [],
      hintCount: 2,
      hintEnabled: true,
    };
    this.registry.set(gameType, { ...defaults, ...cfg, gameType });
  }

  get(gameType) {
    return this.registry.get(gameType);
  }

  // ═══════════════════════════════════════════════
  // START GAME — kirim soal
  // ═══════════════════════════════════════════════
  createHandler(gameType) {
    const cfg = this.registry.get(gameType);
    if (!cfg) throw new Error(`Game "${gameType}" not registered`);

    const handler = async (m, { sock }) => {
      try {
        const chatId = m.chat;

        // Sudah ada game aktif?
        if (hasSession(chatId)) {
          const existing = getSession(chatId);
          if (existing && existing.gameType === gameType) {
            const remaining = getRemainingTime(chatId);
            const answer = existing.question[cfg.answerField];
            let text = `╭─「 ✦ ${cfg.title} — GAME BERJALAN ✦ 」\n\n`;
            if (cfg.questionField && existing.question[cfg.questionField]) {
              text += `\`\`\`${existing.question[cfg.questionField]}\`\`\`\n\n`;
            }
            if (cfg.hintEnabled !== false) {
              text += `│ ❏ Hint: *${getHint(answer, cfg.hintCount)}*\n`;
            }
            text += `│ ❏ Sisa waktu: *${formatTime(remaining)}*\n\n`;
            text += `_Reply pesan game ini untuk jawab atau ketik "nyerah"_\n`;
            text += `╰────  •  ────`;
            await m.reply(text);
            return;
          }
        }

        // Ambil soal random
        const question = getRandomItem(cfg.dataFile);
        if (!question) {
          await m.reply('❌ *Data game tidak tersedia!*');
          return;
        }

        const answer = question[cfg.answerField];
        if (!answer) {
          await m.reply('❌ *Soal rusak, coba lagi!*');
          return;
        }

        // Kirim soal — PENTING: simpan key pesan bot
        let sentMsg;

        if (cfg.hasImage && fetchBuffer && question[cfg.imageField]) {
          let imageBuffer;
          try {
            imageBuffer = await fetchBuffer(question[cfg.imageField]);
          } catch {
            await m.reply('❌ *Gagal memuat gambar, coba lagi!*');
            return;
          }

          let caption = `╭─「 ✦ ${cfg.title} ✦ 」\n\n`;
          if (cfg.questionField && question[cfg.questionField]) {
            caption += `\`\`\`${question[cfg.questionField]}\`\`\`\n`;
          }
          if (cfg.hintEnabled !== false) {
            caption += `│ ❏ Hint: *${getHint(answer, cfg.hintCount)}*\n`;
          }
          caption += `│ ❏ Waktu: *${cfg.timeout / 1000} detik*\n`;
          caption += `│ ❏ Hadiah: *Limit, Koin, EXP (random)*\n\n`;
          caption += `_Reply pesan ini untuk jawab atau ketik "nyerah"_\n`;
          caption += `╰────  •  ────`;

          sentMsg = await sock.sendMessage(chatId, { image: imageBuffer, caption }, { quoted: m });
        } else {
          let text = `╭─「 ✦ ${cfg.title} ✦ 」\n\n`;
          if (cfg.questionField && question[cfg.questionField]) {
            text += `\`\`\`${question[cfg.questionField]}\`\`\`\n\n`;
          }
          if (cfg.hintEnabled !== false) {
            text += `│ ❏ Hint: *${getHint(answer, cfg.hintCount)}*\n`;
          }
          text += `│ ❏ Waktu: *${cfg.timeout / 1000} detik*\n`;
          text += `│ ❏ Hadiah: *Limit, Koin, EXP (random)*\n\n`;
          text += `_Reply pesan ini untuk jawab atau ketik "nyerah"_\n`;
          text += `╰────  •  ────`;

          sentMsg = await sock.sendMessage(chatId, { text }, { quoted: m });
        }

        await m.react('🐣');

        // Simpan session dengan key pesan bot
        const msgKey = sentMsg?.key || { id: sentMsg?.message?.key?.id || m.key.id };
        createSession(chatId, gameType, question, msgKey, cfg.timeout);

        // Timer timeout
        setSessionTimer(chatId, async () => {
          try {
            let text = `${pick(TIMEOUT_MSGS)}\n\n`;
            text += `╭─「 ✦ ${cfg.title} ✦ 」\n\n`;
            if (cfg.questionField && question[cfg.questionField]) {
              text += `\`\`\`${question[cfg.questionField]}\`\`\`\n\n`;
            }
            text += `│ ❏ Jawaban: *${answer}*\n`;
            if (question.deskripsi) {
              text += `│ ❏ Info: ${question.deskripsi}\n`;
            }
            text += `\n_Gak ada yang bisa jawab nih~_\n`;
            text += `╰────  •  ────`;
            await sock.sendMessage(chatId, { text });
          } catch (e) {
            console.error(`[${gameType}] Timeout error:`, e.message);
          }
        });
      } catch (e) {
        console.error(`[${gameType}] Handler error:`, e.message);
        try {
          await m.react('❌');
          await m.reply('❌ *Terjadi error saat memulai game!*');
        } catch {}
      }
    };

    // ═══════════════════════════════════════════════
    // ANSWER HANDLER — proses reply (jawab/nyerah)
    // ═══════════════════════════════════════════════
    const answerHandler = async (m, sock) => {
      try {
        const chatId = m.chat;
        const session = getSession(chatId);

        // Pastikan session game ini
        if (!session || session.gameType !== gameType) return false;

        const userAnswer = (m.body || '').trim();
        if (!userAnswer || userAnswer.startsWith('.')) return false;

        // WAJIB reply pesan game
        if (!isReplyToGame(m, session)) return false;

        const answer = session.question[cfg.answerField];

        // ═══════════════════════════════════════════
        // SURRENDER / NYERAH — FIX UTAMA
        // ═══════════════════════════════════════════
        if (isSurrender(userAnswer)) {
          endSession(chatId);

          let text = `${pick(SURRENDER_MSGS)}\n\n`;
          text += `╭─「 ✦ ${cfg.title} ✦ 」\n\n`;
          if (cfg.questionField && session.question[cfg.questionField]) {
            text += `\`\`\`${session.question[cfg.questionField]}\`\`\`\n\n`;
          }
          text += `│ ❏ Jawaban: ${answer}\n`;
          text += renderEnergiLine(m, cfg);
          if (session.question.deskripsi) {
            text += `│ ❏ Info: ${session.question.deskripsi}\n`;
          }
          text += `\n_@${m.sender.split('@')[0]} menyerah_\n`;
          text += `╰────  •  ────`;
          text += `\n\n${gameCTA(gameType)}`;

          try {
            await sock.sendMessage(chatId, {
              text,
              mentions: [m.sender],
            });
          } catch (e) {
            console.error(`[${gameType}] Surrender send error:`, e.message);
            // Fallback: coba m.reply kalau sock.sendMessage gagal
            try { await m.reply(text); } catch {}
          }
          return true;
        }

        // ═══════════════════════════════════════════
        // CEK JAWABAN
        // ═══════════════════════════════════════════
        session.attempts++;
        const result = checkAnswer(answer, userAnswer);

        // CORRECT
        if (result.status === 'correct') {
          await m.react('✅');
          endSession(chatId);

          const reward = getRandomReward();
          let rewardGiven = false;
          try {
            const db = getDatabase();
            if (db) {
              const user = db.getUser(m.sender);
              if (!user) {
                db.setUser(m.sender);
              }
              if (reward.limit > 0) db.updateEnergi(m.sender, reward.limit);
              if (reward.koin > 0) db.updateKoin(m.sender, reward.koin);
              if (reward.gold > 0) db.updateRpgCurrency(m.sender, 'gold', reward.gold);
              if (reward.gems > 0) db.updateRpgCurrency(m.sender, 'gems', reward.gems);
              if (reward.diamonds > 0) db.updateRpgCurrency(m.sender, 'diamonds', reward.diamonds);
              if (reward.exp > 0 && user) {
                if (!user.rpg) user.rpg = {};
                try {
                  await addExpWithLevelCheck(sock, m, db, user, reward.exp);
                } catch {}
              }
              db.save();
              rewardGiven = true;
            }
          } catch (e) {
            console.error(`[${gameType}] Reward error:`, e.message);
          }

          // Pesan hasil: bold cuma di pembuka, value plain (request owner)
          let text = `${pick(WIN_MSGS)}\n\n`;
          text += `╭─「 ✦ ${cfg.title} ✦ 」\n\n`;
          text += `│ ❏ Jawaban: ${answer}\n`;
          text += `│ ❏ Pemenang: @${m.sender.split('@')[0]}\n`;
          text += `│ ❏ Percobaan: ${session.attempts}x\n\n`;

          // Info section: yang kekuras (energi) & yang nambah (reward)
          text += renderEnergiLine(m, cfg);
          if (reward.limit > 0) text += `│ ❏ 🎫 Limit: +${reward.limit}\n`;
          if (reward.koin > 0) text += `│ ❏ 🪙 Koin: +${fmtNum(reward.koin)}\n`;
          if (reward.exp > 0) text += `│ ❏ ✨ EXP: +${fmtNum(reward.exp)}\n`;
          if (reward.gold > 0) text += `│ ❏ 🪭 Gold: +${fmtNum(reward.gold)}\n`;
          if (reward.gems > 0) text += `│ ❏ 💎 Gems: +${reward.gems}\n`;
          if (reward.diamonds > 0) text += `│ ❏ 💎 Diamonds: +${reward.diamonds}\n`;

          if (session.question.deskripsi) {
            text += `\n│ ❏ Info: ${session.question.deskripsi}\n`;
          }

          text += `\n╰────  •  ────`;
          text += `\n\n${gameCTA(gameType)}`;

          try {
            await sock.sendMessage(chatId, { text, mentions: [m.sender] });
          } catch (e) {
            console.error(`[${gameType}] Win send error:`, e.message);
            try { await m.reply(text); } catch {}
          }
          return true;
        }

        // CLOSE (hampir bener)
        if (result.status === 'close') {
          const remaining = getRemainingTime(chatId);
          const percent = Math.round(result.similarity * 100);
          await m.react('🔥');
          try {
            await m.reply(`🔥 Hampir! Jawabanmu ${percent}% mirip!\nSisa waktu: ${formatTime(remaining)}`);
          } catch {}
          return false;
        }

        // WRONG
        const remaining = getRemainingTime(chatId);
        if (remaining > 0 && session.attempts < 10) {
          await m.react('❌');
          const hint = getProgressiveHint(answer, session.attempts);
          try {
            await m.reply(`${pick(WRONG_MSGS)} Hint: ${hint}\nSisa: ${formatTime(remaining)}`);
          } catch {}
          return false;
        }

        // Max attempts atau waktu habis
        endSession(chatId);
        let text = `${pick(TIMEOUT_MSGS)}\n\n`;
        text += `╭─「 ✦ ${cfg.title} ✦ 」\n\n`;
        if (cfg.questionField && session.question[cfg.questionField]) {
          text += `\`\`\`${session.question[cfg.questionField]}\`\`\`\n\n`;
        }
        text += `│ ❏ Jawaban: ${answer}\n`;
        text += renderEnergiLine(m, cfg);
        if (session.question.deskripsi) {
          text += `│ ❏ Info: ${session.question.deskripsi}\n`;
        }
        text += `\n╰────  •  ────`;
        text += `\n\n${gameCTA(gameType)}`;
        try {
          await sock.sendMessage(chatId, { text });
        } catch {}
        return true;
      } catch (e) {
        console.error(`[${gameType}] AnswerHandler error:`, e.message);
        return false;
      }
    };

    return { handler, answerHandler };
  }

  // ═══════════════════════════════════════════════
  // CREATE PLUGIN — export untuk plugins/game/*.js
  // ═══════════════════════════════════════════════
  createPlugin(gameType, overrides = {}) {
    const cfg = this.registry.get(gameType);
    if (!cfg) throw new Error(`Game "${gameType}" not registered`);

    const { handler, answerHandler } = this.createHandler(gameType);

    return {
      config: {
        name: gameType,
        alias: [gameType, ...(cfg.alias || [])],
        category: 'game',
        description: cfg.description,
        usage: `.${gameType}`,
        example: `.${gameType}`,
        isOwner: false,
        isPremium: true,
        isRegister: true,
        isGroup: false,
        isPrivate: false,
        cooldown: cfg.cooldown || 5,
        energi: cfg.energi || 1,
        isEnabled: true,
        ...overrides,
      },
      handler,
      answerHandler,
    };
  }
}

const games = new GameFactory();

// ═══════════════════════════════════════════════
// REGISTER ALL GAMES — mapped ke src/data/*.json
// ═══════════════════════════════════════════════

// TEXT GAMES
games.register('asahotak', { emoji: '🧠', title: 'ASAH OTAK', description: 'Tebak tebakan asah otak', timeout: 60000, alias: [] });
games.register('caklontong', { emoji: '🤔', title: 'CAKLONTONG', description: 'Tebak caklontong lucu', timeout: 60000, alias: [] });
games.register('kataacak', { emoji: '🔤', title: 'KATA ACAK', description: 'Tebak kata yang diacak', timeout: 60000, alias: [] });
games.register('kuis', { emoji: '📝', title: 'KUIS', description: 'Kuis pilihan ganda', timeout: 60000, alias: [] });
games.register('riddle', { emoji: '🔮', title: 'RIDDLE', description: 'Tebak teka-teki bahasa Inggris', timeout: 60000, alias: [] });
games.register('siapakahaku', { emoji: '🎭', title: 'SIAPAKAH AKU', description: 'Tebak siapa diriku', timeout: 60000, alias: ['siapakah'] });
games.register('susunkata', { emoji: '🧩', title: 'SUSUN KATA', description: 'Susun huruf jadi kata', timeout: 60000, alias: [] });
games.register('tebakfilm', { emoji: '🎬', title: 'TEBAK FILM', description: 'Tebak judul film', timeout: 60000, alias: [] });
games.register('tebakhewan', { emoji: '🐾', title: 'TEBAK HEWAN', description: 'Tebak nama hewan', timeout: 60000, alias: [] });
games.register('tebakkalimat', { emoji: '📝', title: 'TEBAK KALIMAT', description: 'Lengkapi kalimat yang kosong', timeout: 60000, alias: [] });
games.register('tebakkata', { emoji: '💬', title: 'TEBAK KATA', description: 'Tebak kata dari clue', timeout: 60000, alias: [] });
games.register('tebakkimia', { emoji: '⚗️', title: 'TEBAK KIMIA', description: 'Tebak lambang unsur kimia', questionField: 'unsur', answerField: 'lambang', timeout: 60000, alias: [] });
games.register('tebaklagu', { emoji: '🎵', title: 'TEBAK LAGU', description: 'Tebak judul lagu dari lirik', timeout: 60000, alias: [] });
games.register('tebaklirik', { emoji: '🎶', title: 'TEBAK LIRIK', description: 'Lengkapi lirik lagu', timeout: 60000, alias: [] });
games.register('tebaknegara', { emoji: '🌍', title: 'TEBAK NEGARA', description: 'Tebak nama negara', timeout: 60000, alias: [] });
games.register('tebakprofesi', { emoji: '👷', title: 'TEBAK PROFESI', description: 'Tebak profesi dari deskripsi', timeout: 60000, alias: [] });
games.register('tebaktebakan', { emoji: '❓', title: 'TEBAK TEBAKAN', description: 'Tebak tebakan seru', timeout: 60000, alias: [] });
games.register('tekateki', { emoji: '🧩', title: 'TEKA TEKI', description: 'Teka teki rumit', timeout: 60000, alias: [] });
games.register('trivia', { emoji: '💡', title: 'TRIVIA', description: 'Pertanyaan trivia umum', dataFile: 'trivia2.json', timeout: 60000, alias: [] });
games.register('quizbattle', { emoji: '⚔️', title: 'QUIZ BATTLE', description: 'Quiz battle pengetahuan umum', questionField: 'q', answerField: 'a', timeout: 60000, alias: ['qbattle'] });
games.register('tebakkapital', { emoji: '🏛️', title: 'TEBAK IBUKOTA', description: 'Tebak ibukota negara', timeout: 60000, alias: ['tebakibu'] });
games.register('tebaklogika', { emoji: '🧩', title: 'TEBAK LOGIKA', description: 'Tebak tebakan logika dan riddle', timeout: 60000, alias: ['logika'] });
games.register('tebakbahasa', { emoji: '📖', title: 'TEBAK PERIBAHASA', description: 'Tebak arti peribahasa', timeout: 60000, alias: ['peribahasa'] });
games.register('asahotak2', { emoji: '🔥', title: 'ASAH OTAK PRO', description: 'Asah otak level lebih sulit', timeout: 60000, alias: ['asahotakpro'] });
games.register('tebakpahlawan', { emoji: '🦸', title: 'TEBAK PAHLAWAN', description: 'Tebak pahlawan nasional Indonesia', timeout: 60000, alias: ['pahlawan'] });
games.register('tebakgeografi', { emoji: '🗺️', title: 'TEBAK GEOGRAFI', description: 'Tebak geografi Indonesia dan dunia', timeout: 60000, alias: ['geografi'] });
games.register('tebakkimia2', { emoji: '🧪', title: 'TEBAK KIMIA 2', description: 'Tebak lambang unsur dari deskripsi', questionField: 'unsur', answerField: 'lambang', timeout: 60000, alias: ['kimia2'] });
games.register('caklontong2', { emoji: '😂', title: 'CAKLONTONG 2', description: 'Caklontong lucu tambahan', timeout: 60000, alias: ['cl2'] });
games.register('tebakmusik', { emoji: '🎤', title: 'TEBAK MUSIK', description: 'Tebak penyanyi dan lagu Indonesia', timeout: 60000, alias: ['musik'] });
games.register('tebaktebakan2', { emoji: '🤔', title: 'TEBAK TEBAKAN 2', description: 'Tebak tebakan seru tambahan', timeout: 60000, alias: ['tebakan2'] });
games.register('tebakasmaulhusna', { emoji: '📿', title: 'TEBAK ASMAUL HUSNA', description: 'Tebak 99 nama Allah', questionField: 'translation_id', answerField: 'latin', dataFile: 'asmaulhusna.json', timeout: 60000, alias: ['tebakasma'] });

// IMAGE GAMES
games.register('tebakbendera', { emoji: '🚩', title: 'TEBAK BENDERA', description: 'Tebak negara dari bendera', hasImage: true, imageField: 'img', answerField: 'name', questionField: null, hintEnabled: false, timeout: 60000, alias: [] });
games.register('tebakbendera2', { emoji: '🏁', title: 'TEBAK BENDERA V2', description: 'Tebak bendera versi 2', hasImage: true, imageField: 'img', answerField: 'name', questionField: null, hintEnabled: false, timeout: 60000, alias: [] });
games.register('tebakdrakor', { emoji: '🇰🇷', title: 'TEBAK DRAKOR', description: 'Tebak judul drama Korea', hasImage: true, imageField: 'img', answerField: 'jawaban', questionField: null, timeout: 60000, alias: [] });
games.register('tebakepep', { emoji: '🎮', title: 'TEBAK EPEP', description: 'Tebak karakter Free Fire', hasImage: true, imageField: 'img', answerField: 'jawaban', questionField: null, timeout: 60000, alias: [] });
games.register('tebakgambar', { emoji: '🖼️', title: 'TEBAK GAMBAR', description: 'Tebak gambar piktogram', hasImage: true, imageField: 'img', answerField: 'jawaban', questionField: null, timeout: 60000, alias: [] });
games.register('tebakgambarv2', { emoji: '🖼️', title: 'TEBAK GAMBAR V2', description: 'Tebak gambar versi 2', hasImage: true, imageField: 'img', answerField: 'name', questionField: null, timeout: 60000, alias: [] });
games.register('tebakjkt48', { emoji: '🎤', title: 'TEBAK JKT48', description: 'Tebak member JKT48', hasImage: true, imageField: 'img', answerField: 'jawaban', questionField: null, timeout: 60000, alias: [] });
games.register('tebakkabupaten', { emoji: '📍', title: 'TEBAK KABUPATEN', description: 'Tebak kabupaten Indonesia', hasImage: true, imageField: 'url', answerField: 'title', questionField: null, hintEnabled: false, timeout: 60000, alias: [] });
games.register('tebaklogo', { emoji: '🏢', title: 'TEBAK LOGO', description: 'Tebak logo perusahaan', hasImage: true, imageField: 'img', answerField: 'name', questionField: null, timeout: 60000, alias: [] });
games.register('tebakmakanan', { emoji: '🍜', title: 'TEBAK MAKANAN', description: 'Tebak makanan Indonesia', hasImage: true, imageField: 'img', answerField: 'jawaban', questionField: null, timeout: 60000, alias: [] });

export { games };
export default games;
