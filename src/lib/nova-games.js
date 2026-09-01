// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Generic Game Factory — text & image based games
// Uses m.reply (no buttons), Nova AI signature style, reply-to-game enforcement

import {
  getRandomItem,
  createSession,
  getSession,
  endSession,
  checkAnswerAdvanced,
  getHint,
  isSurrender,
  hasActiveSession,
  setSessionTimer,
  getRemainingTime,
  formatRemainingTime,
  isReplyToGame,
  getRandomReward,
  getProgressiveHint,
} from "./nova-game-data.js";
import { getDatabase } from "./nova-database.js";
import { addExpWithLevelCheck } from "./nova-level.js";
import fs from "fs";

let fetchBuffer;
try {
  fetchBuffer = (await import("./nova-utils.js")).fetchBuffer;
} catch {}

const WIN_MESSAGES = [
  "🌟 *GG WP! Otakmu encer!*",
  "✨ *KEREN ABIS! Lu emang pinter!*",
  "🎉 *MANTAPPPP! Jawaban sempurna!*",
  "💫 *EPIC! Gak ada lawan lu!*",
  "🏆 *NGERI! Otak lu kayak Google!*",
  "🔥 *LEGEND! Jawab kek gak ada beban!*",
];

const TIMEOUT_MESSAGES = [
  "⏱️ *Yah telat, waktu habis!*",
  "⏱️ *WAKTU HABIS!*",
  "⏱️ *Telat bro, waktu dah abis!*",
];

const SURRENDER_MESSAGES = [
  "🏳️ *Yahhh nyerah deh...*",
  "🏳️ *MENYERAH!*",
  "🏳️ *Yah sayang banget nyerah...*",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

class NovaGames {
  constructor() {
    this.registry = new Map();
  }

  register(gameType, cfg) {
    const defaults = {
      dataFile: `${gameType}.json`,
      questionField: "soal",
      answerField: "jawaban",
      emoji: "🎮",
      title: gameType.toUpperCase(),
      description: `Game ${gameType}`,
      timeout: 60000,
      cooldown: 5,
      hasImage: false,
      imageField: "img",
      alias: [],
      hintCount: 2,
    };
    this.registry.set(gameType, { ...defaults, ...cfg, gameType });
  }

  get(gameType) {
    return this.registry.get(gameType);
  }

  createHandler(gameType) {
    const cfg = this.registry.get(gameType);
    if (!cfg) throw new Error(`Game "${gameType}" not registered`);

    const handler = async (m, { sock }) => {
      try {
        const chatId = m.chat;

        if (hasActiveSession(chatId)) {
          const session = getSession(chatId);
          if (session && session.gameType === gameType) {
            const remaining = getRemainingTime(chatId);
            const answer = session.question[cfg.answerField];
            let text = `*${cfg.title} — GAME BERJALAN*\n\n`;
            if (cfg.questionField && session.question[cfg.questionField]) {
              text += `\`\`\`${session.question[cfg.questionField]}\`\`\`\n\n`;
            }
            text += `│ ❏ Hint: *${getHint(answer, cfg.hintCount)}*\n`;
            text += `│ ❏ Sisa waktu: *${formatRemainingTime(remaining)}*\n\n`;
            text += `_Reply pesan game ini untuk jawab atau ketik "nyerah"_`;
            text += `\n╰────  •  ────`;
            await m.reply(text);
            return;
          }
        }

        const question = getRandomItem(cfg.dataFile);
        if (!question) {
          await m.reply("❌ *Data game tidak tersedia!*");
          return;
        }

        const answer = question[cfg.answerField];
        if (!answer) {
          await m.reply("❌ *Soal rusak, coba lagi!*");
          return;
        }

        let sentMsg;

        if (cfg.hasImage && fetchBuffer && question[cfg.imageField]) {
          let imageBuffer;
          try {
            imageBuffer = await fetchBuffer(question[cfg.imageField]);
          } catch {
            await m.reply("❌ *Gagal memuat gambar, coba lagi!*");
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

          sentMsg = await sock.sendMessage(
            chatId,
            { image: imageBuffer, caption },
            { quoted: m }
          );
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

          sentMsg = await m.reply(text);
        }

        await m.react("🐣");

        createSession(chatId, gameType, question, sentMsg?.key || m.key, cfg.timeout);

        setSessionTimer(chatId, async () => {
          try {
            let text = `${pick(TIMEOUT_MESSAGES)}\n\n`;
            text += `*${cfg.title}*\n\n`;
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
          await m.react("❌");
          await m.reply("❌ *Terjadi error saat memulai game!*");
        } catch {}
      }
    };

    const answerHandler = async (m, sock) => {
      try {
        const chatId = m.chat;
        const session = getSession(chatId);

        if (!session || session.gameType !== gameType) return false;

        const userAnswer = (m.body || "").trim();
        if (!userAnswer || userAnswer.startsWith(".")) return false;

        // WAJIB reply pesan game
        if (!isReplyToGame(m, session)) return false;

        const answer = session.question[cfg.answerField];

        // SURRENDER
        if (isSurrender(userAnswer)) {
          endSession(chatId);
          let text = `${pick(SURRENDER_MESSAGES)}\n\n`;
          text += `*${cfg.title}*\n\n`;
          if (cfg.questionField && session.question[cfg.questionField]) {
            text += `\`\`\`${session.question[cfg.questionField]}\`\`\`\n\n`;
          }
          text += `│ ❏ Jawaban: *${answer}*\n`;
          if (session.question.deskripsi) {
            text += `│ ❏ Info: ${session.question.deskripsi}\n`;
          }
          text += `\n_@${m.sender.split("@")[0]} menyerah_\n`;
          text += `╰────  •  ────`;
          try {
            await sock.sendMessage(chatId, {
              text,
              mentions: [m.sender],
            });
          } catch {}
          return true;
        }

        session.attempts++;

        const result = checkAnswerAdvanced(answer, userAnswer);

        if (result.status === "correct") {
          await m.react("✅");
          endSession(chatId);

          const db = getDatabase();
          const user = db.getUser(m.sender);

          let totalLimit = 0;
          let totalBalance = 0;
          let totalExp = 0;

          const reward = getRandomReward();
          totalLimit = reward.limit;
          totalBalance = reward.koin;
          totalExp = reward.exp;

          if (totalLimit > 0) db.updateEnergi(m.sender, totalLimit);
          if (totalBalance > 0) db.updateKoin(m.sender, totalBalance);
          if (totalExp > 0) {
            if (!user.rpg) user.rpg = {};
            try {
              await addExpWithLevelCheck(sock, m, db, user, totalExp);
            } catch {}
          }
          db.save();

          let text = `${pick(WIN_MESSAGES)}\n\n`;
          text += `*${cfg.title}*\n\n`;
          text += `│ ❏ Jawaban: *${answer}*\n`;
          text += `│ ❏ Pemenang: *@${m.sender.split("@")[0]}*\n`;
          text += `│ ❏ Percobaan: *${session.attempts}x*\n\n`;

          let parts = [];
          if (totalLimit > 0) parts.push(`+${totalLimit} Limit`);
          if (totalBalance > 0) parts.push(`+${totalBalance} Koin`);
          if (totalExp > 0) parts.push(`+${totalExp} EXP`);
          if (parts.length > 0) {
            text += `🎁 *Hadiah:* ${parts.join(", ")}\n`;
          }

          if (session.question.deskripsi) {
            text += `\n│ ❏ Info: ${session.question.deskripsi}\n`;
          }

          text += `\n╰────  •  ────`;

          try {
            await sock.sendMessage(chatId, {
              text,
              mentions: [m.sender],
            });
          } catch {}
          return true;
        }

        if (result.status === "close") {
          const remaining = getRemainingTime(chatId);
          const percent = Math.round(result.similarity * 100);
          await m.react("🔥");
          try {
            await m.reply(`🔥 *Hampir!* Jawabanmu *${percent}%* mirip!\n_Sisa waktu: *${formatRemainingTime(remaining)}*_`);
          } catch {}
          return false;
        }

        // WRONG — give progressive hint
        const remaining = getRemainingTime(chatId);
        if (remaining > 0 && session.attempts < 10) {
          await m.react("❌");
          const hint = getProgressiveHint(answer, session.attempts);
          try {
            await m.reply(`❌ Belum bener! Hint: *${hint}*\n_Sisa: *${formatRemainingTime(remaining)}*_`);
          } catch {}
        }

        return false;
      } catch (e) {
        console.error(`[${gameType}] AnswerHandler error:`, e.message);
        return false;
      }
    };

    return { handler, answerHandler };
  }

  createPlugin(gameType, overrides = {}) {
    const cfg = this.registry.get(gameType);
    if (!cfg) throw new Error(`Game "${gameType}" not registered`);

    const { handler, answerHandler } = this.createHandler(gameType);

    return {
      config: {
        name: gameType,
        alias: cfg.alias || [],
        category: "game",
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

const games = new NovaGames();

// ═══════════════════════════════════════════════
// REGISTER ALL GAMES
// ═══════════════════════════════════════════════

// ─── TEXT-BASED GAMES ───
games.register("asahotak", { emoji: "🧠", title: "ASAH OTAK", description: "Tebak tebakan asah otak", timeout: 60000, alias: [] });
games.register("caklontong", { emoji: "🤔", title: "CAKLONTONG", description: "Tebak caklontong lucu", timeout: 60000, alias: [] });
games.register("kataacak", { emoji: "🔤", title: "KATA ACAK", description: "Tebak kata yang diacak", timeout: 60000, alias: [] });
games.register("kuis", { emoji: "📝", title: "KUIS", description: "Kuis pilihan ganda", timeout: 60000, alias: [] });
games.register("riddle", { emoji: "🔮", title: "RIDDLE", description: "Tebak teka-teki bahasa Inggris", timeout: 60000, alias: [] });
games.register("siapakahaku", { emoji: "🎭", title: "SIAPAKAH AKU", description: "Tebak siapa diriku", timeout: 60000, alias: ["siapakah"] });
games.register("susunkata", { emoji: "🧩", title: "SUSUN KATA", description: "Susun huruf jadi kata", timeout: 60000, alias: [] });
games.register("tebakfilm", { emoji: "🎬", title: "TEBAK FILM", description: "Tebak judul film", timeout: 60000, alias: [] });
games.register("tebakhewan", { emoji: "🐾", title: "TEBAK HEWAN", description: "Tebak nama hewan", timeout: 60000, alias: [] });
games.register("tebakkalimat", { emoji: "📝", title: "TEBAK KALIMAT", description: "Lengkapi kalimat yang kosong", timeout: 60000, alias: [] });
games.register("tebakkata", { emoji: "💬", title: "TEBAK KATA", description: "Tebak kata dari clue", timeout: 60000, alias: [] });
games.register("tebakkimia", { emoji: "⚗️", title: "TEBAK KIMIA", description: "Tebak lambang unsur kimia", questionField: "unsur", answerField: "lambang", timeout: 60000, alias: [] });
games.register("tebaklagu", { emoji: "🎵", title: "TEBAK LAGU", description: "Tebak judul lagu dari lirik", timeout: 60000, alias: [] });
games.register("tebaklirik", { emoji: "🎶", title: "TEBAK LIRIK", description: "Lengkapi lirik lagu", timeout: 60000, alias: [] });
games.register("tebaknegara", { emoji: "🌍", title: "TEBAK NEGARA", description: "Tebak nama negara", timeout: 60000, alias: [] });
games.register("tebakprofesi", { emoji: "👷", title: "TEBAK PROFESI", description: "Tebak profesi dari deskripsi", timeout: 60000, alias: [] });
games.register("tebaktebakan", { emoji: "❓", title: "TEBAK TEBAKAN", description: "Tebak tebakan seru", timeout: 60000, alias: [] });
games.register("tekateki", { emoji: "🧩", title: "TEKA TEKI", description: "Teka teki rumit", timeout: 60000, alias: [] });
games.register("trivia", { emoji: "💡", title: "TRIVIA", description: "Pertanyaan trivia umum", dataFile: "trivia2.json", timeout: 60000, alias: [] });
games.register("tebakasmaulhusna", { emoji: "📿", title: "TEBAK ASMAUL HUSNA", description: "Tebak 99 nama Allah", questionField: "translation_id", answerField: "latin", timeout: 60000, alias: ["tebakasma"] });

// ─── IMAGE-BASED GAMES ───
games.register("tebakbendera", { emoji: "🚩", title: "TEBAK BENDERA", description: "Tebak negara dari bendera", hasImage: true, imageField: "img", answerField: "name", questionField: null, timeout: 60000, alias: [] });
games.register("tebakbendera2", { emoji: "🏁", title: "TEBAK BENDERA V2", description: "Tebak bendera versi 2", hasImage: true, imageField: "img", answerField: "name", questionField: null, timeout: 60000, alias: [] });
games.register("tebakdrakor", { emoji: "🇰🇷", title: "TEBAK DRAKOR", description: "Tebak judul drama Korea", hasImage: true, imageField: "img", answerField: "jawaban", questionField: null, timeout: 60000, alias: [] });
games.register("tebakepep", { emoji: "🎮", title: "TEBAK EPEP", description: "Tebak karakter Free Fire", hasImage: true, imageField: "img", answerField: "jawaban", questionField: null, timeout: 60000, alias: [] });
games.register("tebakgambar", { emoji: "🖼️", title: "TEBAK GAMBAR", description: "Tebak gambar piktogram", hasImage: true, imageField: "img", answerField: "jawaban", questionField: null, timeout: 60000, alias: [] });
games.register("tebakgambarv2", { emoji: "🖼️", title: "TEBAK GAMBAR V2", description: "Tebak gambar versi 2", hasImage: true, imageField: "img", answerField: "name", questionField: null, timeout: 60000, alias: [] });
games.register("tebakjkt48", { emoji: "🎤", title: "TEBAK JKT48", description: "Tebak member JKT48", hasImage: true, imageField: "img", answerField: "jawaban", questionField: null, timeout: 60000, alias: [] });
games.register("tebakkabupaten", { emoji: "📍", title: "TEBAK KABUPATEN", description: "Tebak kabupaten Indonesia", hasImage: true, imageField: "url", answerField: "title", questionField: null, timeout: 60000, alias: [] });
games.register("tebaklogo", { emoji: "🏢", title: "TEBAK LOGO", description: "Tebak logo perusahaan", hasImage: true, imageField: "img", answerField: "name", questionField: null, timeout: 60000, alias: [] });
games.register("tebakmakanan", { emoji: "🍜", title: "TEBAK MAKANAN", description: "Tebak makanan Indonesia", hasImage: true, imageField: "img", answerField: "jawaban", questionField: null, timeout: 60000, alias: [] });

export { NovaGames, games };
