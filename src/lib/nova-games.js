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
  "*KEREN ABIS! Lu emang pinter!*",
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

// ─── Info energi kekuras — info section di soal (sama kayak hasil game) ───
function renderEnergiLine(m, cfg) {
  const e = m?.energiInfo;
  if (e) {
    if (e.unlimited) return `│ ⚡ Energi : ∞ (unlimited)\n`;
    if (e.deducted > 0) return e.game
      ? `│ ⚡ Energi : -${e.deducted} (sisa ${e.sisa}/${e.max})\n`
      : `│ ⚡ Energi : -${e.deducted} (sisa ${e.sisa})\n`;
    return `│ ⚡ Energi : gratis\n`;
  }
  if (cfg.energi > 0) return `│ ⚡ Energi : -${cfg.energi}\n`;
  return '';
}


// ─── CTA tematik per game — kalimat interaktif penutup pesan hasil ───
// Beda game, beda kalimat, sesuai temanya masing-masing (request owner).
const GAME_CTA = {
  // TEXT GAMES
  asahotak: "Yuk asah otakmu lagi kak, biar makin encer 🧠🥳",
  caklontong: "Yuk caklon lagi kak, biar ketawanya makin ringan 😂🥳",
  kataacak: "Yuk acak kata lain kak, biar makin jago 🔤🥳",
  kuis: "Yuk jawab kuis lain kak, biar nilaimu makin tinggi 📝🥳",
  riddle: "Yuk pecahkan riddle lain kak, biar makin paham 🔮🥳",
  siapakahaku: "Yuk tebak siapa lagi kak, biar makin jago nebak orang 🎭🥳",
  susunkata: "Yuk susun kata lain kak, biar makin cepat 🧩🥳",
  tebakfilm: "Yuk tebak film lain kak, biar kamu makin jago soal perfilman 🎬🥳",
  tebakhewan: "Yuk tebak hewan lain kak, biar makin kenal satwa 🐾🥳",
  tebakkalimat: "Yuk lengkapi kalimat lain kak, biar makin fasih 📝🥳",
  tebakkata: "Yuk tebak kata lain kak, biar kosakatamu makin luas 💬🥳",
  tebakkimia: "Yuk tebak unsur lain kak, biar makin jago kimia ⚗️🥳",
  tebaklagu: "Yuk nebak lagu lain kak, biar kupingmu makin teliti 🎵🥳",
  tebaklirik: "Yuk lengkapi lirik lain kak, biar makin hapal lagu 🎶🥳",
  tebaknegara: "Yuk tebak negara lain kak, biar makin hafal dunia 🌍🥳",
  tebakprofesi: "Yuk tebak profesi lain kak, biar makin kenal dunia kerja 👷🥳",
  tebaktebakan: "Yuk tebak-tebak lagi kak, biar makin seru ❓🥳",
  tekateki: "Yuk pecahkan teka-teki lain kak, biar otakmu makin tajam 🧩🥳",
  trivia: "Yuk jawab trivia lain kak, biar wawasanmu makin luas 💡🥳",
  quizbattle: "Yuk battle lagi kak, biar kamu makin sering jadi juara ⚔️🥳",
  tebakkapital: "Yuk tebak ibukota lain kak, biar makin hafal negara 🏛️🥳",
  tebaklogika: "Yuk asah logika lain kak, biar makin pintar 🧩🥳",
  tebakbahasa: "Yuk tebak peribahasa lain kak, biar makin bijak berbahasa 📖🥳",
  asahotak2: "Yuk naik level lagi kak, biar makin pro 🔥🥳",
  tebakpahlawan: "Yuk kenal pahlawan lain kak, biar makin cinta tanah air 🦸🥳",
  tebakgeografi: "Yuk jelajah lagi kak, biar makin paham bumi 🗺️🥳",
  tebakkimia2: "Yuk tebak unsur lagi kak, biar makin rame di lab 🧪🥳",
  caklontong2: "Yuk caklon lagi kak, biar makin ngakak 😂🥳",
  tebakmusik: "Yuk tebak musik lain kak, biar makin update lagu 🎤🥳",
  tebaktebakan2: "Yuk tebak lagi kak, biar makin penasaran 🤔🥳",
  tebakasmaulhusna: "Yuk tebak nama lain kak, biar hafalanmu makin banyak 📿🥳",
  // IMAGE GAMES
  tebakbendera: "Yuk tebak bendera lain kak, biar makin hafal negara 🚩🥳",
  tebakbendera2: "Yuk tebak bendera lagi kak, biar makin jago 🏁🥳",
  tebakdrakor: "Yuk tebak drakor lain kak, biar makin update drama 🇰🇷🥳",
  tebakepep: "Yuk tebak karakter lain kak, biar makin jago FF 🎮🥳",
  tebakgambar: "Yuk tebak gambar lain kak, biar imajinasimu makin luas 🖼️🥳",
  tebakgambarv2: "Yuk tebak gambar lagi kak, biar makin asik 🖼️🥳",
  tebakjkt48: "Yuk tebak member lain kak, biar makin jago JKT48 🎤🥳",
  tebakkabupaten: "Yuk tebak kabupaten lain kak, biar makin kenal Indonesia 📍🥳",
  tebaklogo: "Yuk tebak logo lain kak, biar makin observatif 🏢🥳",
  tebakmakanan: "Yuk tebak makanan lain kak, biar makin kenyal pengetahuanmu 🍜🥳",
  // MULTI ANSWER
  family100: "Yuk main lagi kak untuk mendapatkan poin yang lebih tinggi 🥳",
  // BOARD / CARD GAMES (novaGameBox)
  catur: "Yuk main catur lagi kak, biar taktikmu makin tajam ♟️🥳",
  uno: "Yuk gas round Uno lagi kak, biar kamu jadi master UNO 🃏🥳",
  gaple: "Yuk main gaple lagi kak, biar kartumu makin panas 🔥🥳",
  werewolf: "Yuk main werewolf lagi kak, biar naluri detektifmu makin tajam 🐺🥳",
  family100: "Yuk jawab survey lain kak, biar skormu makin gede 💯🥳",
  ulartangga: "Yuk lompatin ular tangga lagi kak, biar adrenalinmu naik 🐍🥳",
  truth: "Yuk pilih truth lagi kak, jangan takut jujur ya 🎤🥳",
  dare: "Yuk pilih dare lagi kak, biar berani melintir 🎯🥳",
  tebaksurah: "Yuk tebak surah lain kak, biar hafalanmu makin kuat 📖🥳",
  tebakkabupaten: "Yuk tebak kabupaten lain kak, biar kenal Indonesia makin jauh 📍🥳",
  tebaklogo: "Yuk tebak logo lain kak, biar kenal merek dunia 🏢🥳",
  tebakmakanan: "Yuk tebak makanan lagi kak, biar lapar sekaligus pinter 🍜🥳",
  // RPG FEATURES (kategori rpg — hasil aksi pakai format engine juga)
  bankrpg: "Yuk nabung lagi kak, biar goldmu makin aman 🏦🥳",
  lottery: "Yuk beli tiket lagi kak, siapa tau rezekinya nyantol 🎟️🥳",
  horserace: "Yuk pasang taruhan lagi kak, biar kudamu makin hoki 🐎🥳",
  bounty: "Yuk buru buronan lain kak, biar namamu makin dikenal 🎯🥳",
  blacksmith: "Yuk tempa lagi kak, biar senjatamu makin tajam ⚒️🥳",
  alchemist: "Yuk racik ramuan lain kak, biar makin jago meramu ⚗️🥳",
  // RPG CINTA (rpg couple — tema romantis)
  jadianmatch: "Yuk tembak-tembakan lagi kak, siapa tau ketemu jodoh 💘🥳",
  kencanmatch: "Yuk kencan lagi kak, biar hubunganmu makin mesra 💕🥳",
  kado: "Yuk kasih kado lagi kak, biar pasanganmu makin sayang 🎁🥳",
  honeymoon: "Tunggu bulan depan kak, sambil ramein hubungan lewat rpgkencan 💞",
  meditation: "Yuk meditasi lagi kak kalau badannya lelah ✨🥳",
  nikahmatch: "Yuk bahagia terus sama pasanganmu kak, biar awet sampai tua 💍🥳",
  soulmatematch: "Yuk ukur kecocokan lagi kak, siapa tau dia memang jodohmu 💞🥳",
  couplewar: "Yuk war pasangan lain kak, biar cintamu makin disegani ⚔️🥳",
  couple: "Yuk rawat hubunganmu baik-baik kak, biar makin langgeng sampai tua 💕🥳",
  putusmatch: "Yuk move on kak, siapa tau jodoh berikutnya lebih baik 💪🥳",
  // FUN CINTA (jadian & confess — engine khas cinta)
  jadian: "Yuk tinggalin komentar *terima* atau *tolak* di atas kak 💘",
  jadianSukses: "Yuk jaga pasangannya baik-baik kak, semoga langgeng sampai tua 💕🥳",
  jadianTolak: "Yuk sabar kak, masih banyak yang nungguin kamu di luar sana 💪🥳",
  confess: "Yuk confess lagi kak, siapa tau dia juga nungguin dari dulu 💘🥳",
  confessviral: "Yuk confess viral lagi kak, biar makin ramai peminatmu 💘🥳",
  confesswall: "Yuk posting cerita lain kak, siapa tau jadi viral 💌🥳",
  // FUN CINTA ROUND 2 (jodoh, calculator, ramalan, putus, dll)
  jodoh: "Yuk cari jodoh lain kak, siapa tau lebih cocok 💘🥳",
  lovecalc: "Yuk ukur cinta lagi kak, siapa tau skornya makin tinggi 💘🥳",
  ramalancinta: "Yuk ramal lagi kak, siapa tau masa depannya makin jelas 💞🥳",
  soulmate: "Yuk ukur kecocokan jiwa lagi kak, siapa tau dia memang jodohmu 💞🥳",
  cintaquiz: "Yuk jawab kuis lagi kak, biar makin paham soal cinta 💘🥳",
  cintatips: "Yuk baca tips lain kak, biar makin jago merangkul 💘🥳",
  cintagram: "Yuk bikin cinta gram lagi kak, biar makin romantis 💘🥳",
  gombal: "Yuk gombal lagi kak, siapa tau dia klepek-klepek 💘🥳",
  bucin: "Yuk baca quotes lain kak, biar makin melar 💕🥳",
  putus: "Yuk move on dulu kak, siapa tau jodoh berikutnya lebih baik 💪🥳",
  tolaknikah: "Yuk sabar kak, siapa tau lamaran berikutnya diterima 💪🥳",
  // WELCOME & GOODBYE (member masuk/keluar grup)
  welcome: "Yuk ketik .menu kak, biar tahu semua fitur seru di grup ini 🥳",
  goodbye: "Semoga kita bertemu lagi di lain waktu ya kak 🙏",
  // GROUP OPEN/CLOSE (fallback engine grup ditutup/dibuka)
  groupclosed: "Mohon ditunggu ya, grup akan dibuka kembali oleh admin 🙏",
  groupopened: "Waduh lengket banget kak, yok ramein lagi grupnya 🥳",
  // RPG FEATURES BATCH 2 (hasil aksi RPG → format engine)
  adventure: "Yuk petualangan lagi kak, siapa tau nemu harta karun 🗺️🥳",
  adventurev2: "Yuk jelajah biome lain kak, biar makin jago bertahan 🧭🥳",
  arenav3: "Yuk tantang petarung lain kak, biar namamu gentar di arena ⚔️🥳",
  begalrpg: "Yuk begal lagi kak, siapa tau dapet tangkapan gede 🥷🥳",
  berburu: "Yuk berburu lagi kak, biar bidikanmu makin teliti 🎯🥳",
  berburuv2: "Yuk berburu lagi kak, siapa tau dapet buruan langka 🏹🥳",
  berdagang: "Yuk dagang lagi kak, biar untungmu makin tebal 📦🥳",
  berkebon: "Yuk tanam lagi kak, biar kebonmu makin subur 🌱🥳",
  bossraid: "Yuk serang boss lagi kak, siapa tau drop-nya langka 👹🥳",
  casinorpg: "Yuk pasang lagi kak, siapa tau jackpot menanti 🎰🥳",
  casinov2: "Yuk spin lagi kak, biar hokimu numpuk 🎲🥳",
  craftrpg: "Yuk craft lagi kak, biar hasilnya makin bagus ⚒️🥳",
  duelrpg: "Yuk duel lagi kak, biar ilmumu makin tajam 🤺🥳",
  dungeon: "Yuk jelajah dungeon lain kak, biar makin berani 🏰🥳",
  dungeonv2: "Yuk turun lantai berikutnya kak, siapa tau loot epik 🗝️🥳",
  enchantrpg: "Yuk enchant lagi kak, biar senjatamu makin bersinar ✨🥳",
  fortune: "Yuk buka fortune lagi kak, siapa tau rezeki nomplok 🥠🥳",
  guildwar: "Yuk perang guild lagi kak, biar guildmu juara 🛡️🥳",
  heist: "Yuk rampok lagi kak, siapa tau brankas penuh 💰🥳",
  hilorpg: "Yuk pasang hilo lagi kak, biar hokimu terus menyala 🎰🥳",
  investrpg: "Yuk invest lagi kak, biar goldmu berbunga 📈🥳",
  jobrpg: "Yuk kerja lagi kak, biar gajianmu makin gede 💼🥳",
  kerja: "Yuk kerja lagi kak, biar dompetmu makin tebal 💼🥳",
  mining: "Yuk tambang lagi kak, biar cangkulmu makin kuat ⛏️🥳",
  miningv2: "Yuk tambang lagi kak, siapa tau nemu berlian 💎🥳",
  nebang: "Yuk nebang lagi kak, biar kapakmu makin tajam 🪓🥳",
  nguli: "Yuk nguli lagi kak, biar keringatmu berbuah gold 💪🥳",
  ojekrpg: "Yuk narik lagi kak, biar penumpangmu makin rame 🛵🥳",
  patrol: "Yuk patroli lagi kak, biar wilayahmu makin aman 🚔🥳",
  pet: "Yuk main sama petmu lagi kak, biar makin setia 🐾🥳",
  rafflerpg: "Yuk ikut raffle lain kak, siapa tau kamu pemenangnya 🎟️🥳",
  rangerpost: "Yuk ambil misi lagi kak, biar pangkatmu naik 🎖️🥳",
  redeem: "Yuk buruh kode lain kak, siapa tau ada yang terlewat 🎁🥳",
  roulette: "Yuk spin lagi kak, biar hokimu makin panas 🔴🥳",
  sabungayam: "Yuk adu lagi kak, biar ayammu juara nasional 🐓🥳",
  sampah: "Yuk petik sampah lagi kak, biar lingkungan bersih 🗑️🥳",
  slotmachine: "Yuk tarik slot lagi kak, siapa tau jackpot nunggu 🎰🥳",
  summon: "Yuk summon lagi kak, siapa tau dapet SSR 🌟🥳",
  treasurehunt: "Yuk cari harta lagi kak, biar peta makin lengkap 🗺️🥳",
  upgrade2: "Yuk upgrade lagi kak, biar statsmu makin tinggi 📈🥳",
};

// Fallback kalau game-nya belum punya CTA khusus
const GENERIC_CTAS = [

  "Yuk main lagi kak untuk mendapatkan poin yang lebih tinggi 🥳",
  "Yuk coba soal lain kak, siapa tau skor lebih tinggi 🥳",
  "Yuk main lagi kak, biar makin jago 🥳",
];

function gameCTA(gameType) {
  const cta = GAME_CTA[gameType];
  if (cta) return cta;
  return GENERIC_CTAS[Math.floor(Math.random() * GENERIC_CTAS.length)];
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
            text += `│ 🧩 Hint       : ${getHint(answer, cfg.hintCount)}\n`;
            text += `│ ⏳ Sisa waktu : ${formatRemainingTime(remaining)}\n\n`;
            text += `_💬 Reply pesan game ini buat jawab, ketik "nyerah" kalau nyerah_`;
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

          await m.react("🕒");
          let caption = `╭─「 ✦ ${cfg.title} ✦ 」\n\n`;
          caption += `${pickFlavor()}\n\n`;
          if (cfg.questionField && question[cfg.questionField]) {
            caption += `\`\`\`${question[cfg.questionField]}\`\`\`\n`;
          }
          if (cfg.hintEnabled !== false) {
            caption += `│ 🧩 Hint   : ${getHint(answer, cfg.hintCount)}\n`;
          }
          caption += `│ ⏳ Waktu  : ${cfg.timeout / 1000} detik\n`;
          caption += `│ 🎁 Hadiah : Limit, Koin, EXP (random)\n\n`;
          caption += `_💬 Reply pesan ini buat jawab, ketik "nyerah" kalau menyerah_\n`;
          caption += `╰────  •  ────`;

          sentMsg = await sock.sendMessage(
            chatId,
            { image: imageBuffer, caption },
            { quoted: m }
          );
        } else {
          await m.react("🕒");
          let text = `╭─「 ✦ ${cfg.title} ✦ 」\n\n`;
          text += `${pickFlavor()}\n\n`;
          if (cfg.questionField && question[cfg.questionField]) {
            text += `\`\`\`${question[cfg.questionField]}\`\`\`\n\n`;
          }
          if (cfg.hintEnabled !== false) {
            text += `│ 🧩 Hint   : ${getHint(answer, cfg.hintCount)}\n`;
          }
          text += `│ ⏳ Waktu  : ${cfg.timeout / 1000} detik\n`;
          text += `│ 🎁 Hadiah : Limit, Koin, EXP (random)\n`;
          text += renderEnergiLine(m, cfg);
          text += `\n_💬 Reply pesan ini buat jawab, ketik "nyerah" kalau menyerah_\n`;
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
            text += `│ ❌ Jawaban: ${answer}\n`;
            if (question.deskripsi) {
              text += `│ 💡 Info: ${question.deskripsi}\n`;
            }
            text += `\n_Yah, gak ada yang bisa jawab nih~_\n`;
            text += `╰────  •  ────`;
            const timeoutCta = gameCTA(gameType);
            if (timeoutCta) text += `\n${timeoutCta}`;
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
          text += `│ • Jawaban: ${answer}\n`;
          if (session.question.deskripsi) {
            text += `│ • Info: ${session.question.deskripsi}\n`;
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
          text += `│ • Jawaban: ${answer}\n`;
          text += `│ • Pemenang: @${m.sender.split("@")[0]}\n`;
          text += `│ • Percobaan: ${session.attempts}x\n\n`;

          let parts = [];
          if (totalLimit > 0) parts.push(`+${totalLimit} Limit`);
          if (totalBalance > 0) parts.push(`+${totalBalance} Koin`);
          if (totalExp > 0) parts.push(`+${totalExp} EXP`);
          if (parts.length > 0) {
            text += `🎁 *Hadiah:* ${parts.join(", ")}\n`;
          }

          if (session.question.deskripsi) {
            text += `\n│ • Info: ${session.question.deskripsi}\n`;
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


// ─── Helper interaktif (request owner 2026-09-06: game jangan kuno) ───

// Flavor pembuka random — biar tiap round terasa hidup, gak monoton
const GAME_FLAVOR = [
  "🎯 *Soal baru masuk! Siapa nih yang paling cepet?*",
  "⚡ *Gaskeun! Buktikan otakmu encer!*",
  "🔥 *Round baru! Jangan cuma nonton, ikutan jawab!*",
  "🧠 *Nyalain otaknya, ini gampang kok... masa iya gak bisa?*",
  "🏆 *Siap-siap! Pemenang dapet hadiah limit + koin!*",
  "✨ *Oke gengs, fokus! Soalnya udah nunggu!*",
];

function pickFlavor() {
  return GAME_FLAVOR[Math.floor(Math.random() * GAME_FLAVOR.length)];
}

// Progress bar visual — ▰ ketemu, ▱ belum
function renderProgressBar(found, total, width = 8) {
  const t = Math.max(0, total);
  const f = Math.min(Math.max(0, found), t);
  const filled = t > 0 ? Math.round((f / t) * width) : 0;
  const bar = "▰".repeat(filled) + "▱".repeat(Math.max(0, width - filled));
  const pct = t > 0 ? Math.round((f / t) * 100) : 0;
  return `${bar} ${f}/${t} (${pct}%)`;
}

// Slot board gaya Family Feud — hidden = blok misteri, revealed = jawaban
function renderSlotBoard(answers, opts = {}) {
  const nameOf = opts.nameOf || (() => "");
  const lines = [];
  answers.forEach((ans, i) => {
    const num = String(i + 1).padStart(2, "0");
    if (ans.revealed) {
      const by = ans.foundBy ? ` · @${nameOf(ans.foundBy)}` : "";
      lines.push(`✅ ${num} ${String(ans.text).toUpperCase()}${by}`);
    } else {
      const len = Math.min(10, Math.max(4, String(ans.text).length));
      lines.push(`🔒 ${num} ${"▒".repeat(len)}`);
    }
  });
  return lines;
}

// ─── novaGameBox — format khas game buat game papan/kartu (catur, uno, dll) ───
// Beda dari claraWrap (menu/reply klasik): game bebas ekspresi —
// opener flavor bold+emoji, judul CAPS di box, body bebas (papan/giliran/jawaban), CTA tematik.
export function novaGameBox(opts) {
  const { title, icon = "🎮", body, flavor = null, cta = null } = opts;
  let text = "";
  if (flavor) text += flavor + "\n\n";
  text += `╭─「 ✦ ${icon} ${String(title).toUpperCase()} ✦ 」\n\n`;
  text += body + "\n";
  text += `╰────  •  ────`;
  if (cta) text += `\n\n${cta}`;
  return text;
}

export { NovaGames, games, gameCTA, GAME_FLAVOR, pickFlavor, renderProgressBar, renderSlotBoard };
