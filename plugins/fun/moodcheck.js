// plugins/fun/moodcheck.js
// Voice Note Mood & Emotion Analyzer - Local audio analysis with ffmpeg
// Analyzes pitch, tempo, volume, dynamics, and silence to detect mood
// Command: .moodcheck (reply to voice note / audio)

import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { queueFFmpeg } from "../../src/lib/nova-ffmpeg.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

import fs2 from "fs";
const MOOD_DB = path.join(process.cwd(), "database", "moodtrack.json");

function loadMoodDB() {
  try {
    if (fs2.existsSync(MOOD_DB)) {
      return JSON.parse(fs2.readFileSync(MOOD_DB, "utf-8"));
    }
  } catch (e) { console.error('[moodcheck.js]:', e.message); }
  return { groups: {}, users: {} };
}

function saveMoodDB(db) {
  try {
    const dir = path.dirname(MOOD_DB);
    if (!fs2.existsSync(dir)) fs2.mkdirSync(dir, { recursive: true });
    fs2.writeFileSync(MOOD_DB, JSON.stringify(db, null, 2));
  } catch (e) { console.error('[moodcheck.js]:', e.message); }
}

function isMoodTrackOn(groupId) {
  const db = loadMoodDB();
  return db.groups[groupId]?.tracking === true;
}

function saveMoodRecord(userJid, groupId, moodData) {
  const db = loadMoodDB();
  if (!db.users[userJid]) db.users[userJid] = [];
  db.users[userJid].push({
    mood: moodData.mood,
    score: moodData.score,
    timestamp: Date.now(),
    groupId: groupId || "",
    metrics: moodData.metrics || {},
  });
  // Keep max 50 records per user
  if (db.users[userJid].length > 50) {
    db.users[userJid] = db.users[userJid].slice(-50);
  }
  saveMoodDB(db);
}

function getMoodHistory(userJid, limit = 10) {
  const db = loadMoodDB();
  const records = db.users[userJid] || [];
  return records.slice(-limit);
}

function isMoodSuggOn(groupId) {
  const db = loadMoodDB();
  return db.groups[groupId]?.moodSuggest === true;
}

const NEGATIVE_MOODS = new Set(["Sedih", "Stres", "Marah", "Gugup"]);

function checkNegativeStreak(userJid) {
  const history = getMoodHistory(userJid, 3);
  if (history.length < 3) return null;
  const last3 = history.slice(-3);
  const allNegative = last3.every(r => NEGATIVE_MOODS.has(r.mood));
  if (!allNegative) return null;
  return last3;
}

const SUPPORT_MESSAGES = {
  Sedih: [
    "Hei, aku perhatiin 3x terakhir mood kamu terdeteksi *ꜱᴇᴅɪʜ*. Kamu nggak sendirian, ya. Kalau mau curhat atau butuh teman dengerin, aku di sini.",
    "Kamu udah 3 kali kedeteksi sedih dari voice note kamu. Nggak apa-apa kok ngerasa gitu. Tapi jangan dipendem sendiri, share ke teman atau ke aku aja.",
  ],
  Stres: [
    "Aku lihat kamu lagi stres 3x berturut-turut. Coba tarik napas dalam-dalam. Teknik 4-7-8: tarik 4 detik, tahan 7, buang 8. Kamu bisa lewatin ini.",
    "Mood kamu udah stres 3 kali. Mungkin waktunya istirahat sejenak dari yang bikin kamu lelah. Prioritaskan diri kamu dulu ya.",
  ],
  Marah: [
    "3x terakhir suara kamu kedeteksi marah. Aku paham emosi itu wajar, tapi coba tarik napas dulu. Jangan ambil keputusan penting saat emosi lagi tinggi.",
    "Kamu kayaknya lagi banyak emosi ya, 3x kedeteksi marah. Coba channel emosi itu ke hal positif. Olahraga atau jalan-jalan bisa bantu.",
  ],
  Gugup: [
    "Aku perhatiin kamu gugup 3x terakhir. Hei, kamu lebih kuat dari yang kamu pikir. Tarik napas pelan-pelan, satu langkah pada a time.",
    "Kamu kedeteksi gugup 3x berturut. Semua orang pernah ngerasa gitu. Yang penting kamu sudah berani. Semangat ya!",
  ],
};

function getSupportMessage(mood, pushName) {
  const messages = SUPPORT_MESSAGES[mood] || SUPPORT_MESSAGES["Stres"];
  const msg = messages[Math.floor(Math.random() * messages.length)];
  return msg;
}

// ─── AI Connect helpers ───
const DEFAULT_AI_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes default

function getAICooldownMs(groupId) {
  const db = loadMoodDB();
  const custom = db.groups[groupId]?.aiCooldownMin;
  if (custom && custom > 0) return custom * 60 * 1000;
  return DEFAULT_AI_COOLDOWN_MS;
}

function isMoodAIOn(groupId) {
  const db = loadMoodDB();
  return db.groups[groupId]?.moodAI === true;
}

function getLastAITrigger(userJid) {
  const db = loadMoodDB();
  return db.users[userJid + "_aiCooldown"]?.lastTrigger || 0;
}

function setAITrigger(userJid) {
  const db = loadMoodDB();
  db.users[userJid + "_aiCooldown"] = { lastTrigger: Date.now() };
  saveMoodDB(db);
}

function isAIOnCooldown(userJid, groupId) {
  const last = getLastAITrigger(userJid);
  const cd = getAICooldownMs(groupId);
  return Date.now() - last < cd;
}

function getCooldownRemaining(userJid, groupId) {
  const last = getLastAITrigger(userJid);
  const cd = getAICooldownMs(groupId);
  const remaining = cd - (Date.now() - last);
  return Math.max(0, Math.ceil(remaining / 60000)); // minutes
}

// ─── AI conversation trigger ───
async function triggerAIConversation(sock, groupId, userJid, pushName, mood, moodScore, botConfig) {
  try {
    const { callAI } = await import("../../src/lib/nova-ai-service.js");
    const aiConfig = botConfig?.aiHelp || {};

    const moodContext = {
      "Sedih": "Orang ini sedang sedih. Tawarkan empati, dengarkan, dan beri dukungan emosional.",
      "Stres": "Orang ini sedang stres. Sarankan teknik relaksasi, breathing, dan validasi perasaan mereka.",
      "Marah": "Orang ini sedang marah. Tenangkan, validasi emosi, sarankan untuk tarik napas dan jangan ambil keputusan impulsif.",
      "Gugup": "Orang ini sedang gugup. Beri semangat, validasi perasaan, dan buat mereka merasa lebih percaya diri.",
    };

    const context = moodContext[mood] || "Orang ini butuh dukungan emosional.";

    const systemPrompt = `Kamu adalah teman yang peduli dan empatik. ${context} Nama orang ini adalah ${pushName}. Mood mereka terdeteksi: ${mood} (${moodScore}%). Ngobrollah dengan santai, hangat, dan natural seperti teman dekat. Jangan kaku. Jangan pakai bahasa formal. Tanya bagaimana perasaan mereka, dengarkan, dan beri dukungan. Maksimal 3-4 kalimat per pesan biar gak kayak robot.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Hai, aku lagi ngerasa ${mood.toLowerCase()} sih...` },
    ];

    const reply = await callAI({
      providerKey: "openai",
      model: "gpt-4o-mini",
      messages,
      apiKey: aiConfig.apiKey,
      apiEndpoint: aiConfig.apiEndpoint,
    });

    if (reply && reply.trim()) {
      const body = [
        `│ *ᴍᴏᴏᴅ ꜱᴜᴘᴘᴏʀᴛ - ᴀɪ ᴄᴏɴɴᴇᴄᴛ*`,
        ` `,
        `│ Hai ${pushName},`,
        ` `,
        `│ ${reply.trim()}`,
        ` `,
        `│ _AI terhubung otomatis karena 3x terakhir mood kamu: ${mood}_`,
        `│ _Ketik .aichat <pesan> untuk lanjut ngobrol dengan AI_`,
      ].join("\n");

      await sock.sendMessage(groupId, {
        text: claraWrap("Mood AI Connect", body),
        mentions: userJid ? [userJid] : [],
      });
    }
  } catch (e) {
    console.log("[MOODCHECK] AI trigger failed:", e.message);
    // Fallback to static message if AI fails
    const moodKey = mood;
    const supportMsg = getSupportMessage(moodKey, pushName);
    const fallbackBody = [
      `│ *ᴘᴇꜱᴀɴ ꜱᴜᴘᴘᴏʀᴛ ᴏᴛᴏᴍᴀᴛɪꜱ*`,
      ` `,
      `│ Hai ${pushName},`,
      ` `,
      `│ ${supportMsg}`,
      ` `,
      `│ _Pesan ini dikirim otomatis karena 3x terakhir mood kamu terdeteksi: ${mood}_`,
    ].join("\n");
    await sock.sendMessage(groupId, {
      text: claraWrap("Mood Support", fallbackBody),
      mentions: userJid ? [userJid] : [],
    });
  }
}

// ─── Run shell command and return stdout ───
function runCmd(cmd, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 10 * 1024 * 1024, timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

// ─── Parse ffmpeg astats output ───
function parseAstats(output) {
  const stats = {};
  const regex = /(\w[\w\s]+):\s+([0-9.]+)/g;
  let match;
  while ((match = regex.exec(output)) !== null) {
    stats[match[1].trim()] = parseFloat(match[2]);
  }
  return stats;
}

// ─── Parse ffmpeg volumedetect output ───
function parseVolumeDetect(output) {
  const result = {};
  const meanMatch = output.match(/mean_volume:\s+(-?[\d.]+)\s*dB/);
  const maxMatch = output.match(/max_volume:\s+(-?[\d.]+)\s*dB/);
  const rmsMatch = output.match(/rms_volume:\s+(-?[\d.]+)\s*dB/);

  if (meanMatch) result.meanVolume = parseFloat(meanMatch[1]);
  if (maxMatch) result.maxVolume = parseFloat(maxMatch[1]);
  if (rmsMatch) result.rmsVolume = parseFloat(rmsMatch[1]);
  return result;
}

// ─── Parse ffmpeg silencedetect output ───
function parseSilenceDetect(output) {
  const starts = (output.match(/silence_start:/g) || []).length;
  const ends = (output.match(/silence_end:/g) || []).length;
  return { silenceCount: Math.min(starts, ends), totalEvents: starts };
}

// ─── Calculate Zero Crossing Rate (proxy for pitch) ───
async function calculateZCR(wavPath) {
  try {
    const output = await runCmd(
      `ffmpeg -i "${wavPath}" -af "astats=metadata=1:reset=0" -f null - 2>&1 | grep -i "zero_crossings_rate"`
    );
    const match = output.match(/Zero crossings rate:\s+([0-9.]+)/i);
    if (match) return parseFloat(match[1]);
  } catch (e) { console.error('[moodcheck.js]:', e.message); }
  return 0.05; // default
}

// ─── Analyze audio and determine mood ───
async function analyzeAudio(audioPath) {
  const tmpDir = os.tmpdir();
  const wavPath = path.join(tmpDir, `moodcheck_${Date.now()}.wav`);

  // Convert to standardized WAV for analysis
  await queueFFmpeg(
    `ffmpeg -y -i "${audioPath}" -ar 16000 -ac 1 -acodec pcm_s16le "${wavPath}"`
  );

  // Get duration
  let duration = 0;
  try {
    const durOutput = await runCmd(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${wavPath}"`
    );
    duration = parseFloat(durOutput.trim()) || 0;
  } catch (e) { console.error('[moodcheck.js]:', e.message); }

  // Get volume stats
  let volStats = {};
  try {
    const volOutput = await runCmd(
      `ffmpeg -i "${wavPath}" -af "volumedetect" -f null - 2>&1`
    );
    volStats = parseVolumeDetect(volOutput);
  } catch (e) { console.error('[moodcheck.js]:', e.message); }

  // Get astats (RMS, dynamic range, ZCR)
  let audioStats = {};
  try {
    const astatsOutput = await runCmd(
      `ffmpeg -i "${wavPath}" -af "astats=metadata=1:reset=0" -f null - 2>&1`
    );
    audioStats = parseAstats(astatsOutput);
  } catch (e) { console.error('[moodcheck.js]:', e.message); }

  // Get silence detection
  let silenceStats = { silenceCount: 0 };
  try {
    const silenceOutput = await runCmd(
      `ffmpeg -i "${wavPath}" -af "silencedetect=noise=-40dB:d=0.3" -f null - 2>&1`
    );
    silenceStats = parseSilenceDetect(silenceOutput);
  } catch (e) { console.error('[moodcheck.js]:', e.message); }

  // Get spectral flatness (proxy for tonal vs noisy)
  let spectralFlatness = 0;
  try {
    const flatOutput = await runCmd(
      `ffmpeg -i "${wavPath}" -af "astats=metadata=1:reset=0" -f null - 2>&1 | grep -i "flatness"`
    );
    const match = flatOutput.match(/flatness[^:]*:\s+([0-9.]+)/i);
    if (match) spectralFlatness = parseFloat(match[1]);
  } catch (e) { console.error('[moodcheck.js]:', e.message); }

  // Calculate RMS level (from astats)
  const rmsLevel = audioStats["RMS level"] || audioStats["RMS Level"] || volStats.rmsVolume || -20;
  const meanVol = volStats.meanVolume || -25;
  const maxVol = volStats.maxVolume || -10;

  // Dynamic range = max - mean volume
  const dynamicRange = Math.abs(maxVol - meanVol);

  // ZCR (zero crossing rate)
  const zcr = audioStats["Zero crossings rate"] || await calculateZCR(wavPath);

  // Cleanup temp file
  try { fs.unlinkSync(wavPath); } catch (e) { console.error('[moodcheck.js]:', e.message); }

  // ─── Mood Analysis Logic ───
  // Normalize values
  const loudness = Math.max(0, Math.min(100, (meanVol + 50) * 2)); // -50dB to 0dB -> 0 to 100
  const pitchLevel = Math.max(0, Math.min(100, zcr * 1000)); // ZCR scaled
  const silenceRatio = duration > 0 ? (silenceStats.silenceCount * 0.3) / duration : 0;
  const silencePercent = Math.min(100, silenceRatio * 100);
  const dynRange = Math.max(0, Math.min(100, dynamicRange * 4));

  // Tempo estimation: shorter audio with high energy = fast speech
  // We approximate "speech rate" from energy distribution
  const energyDensity = loudness / Math.max(1, duration);

  // ─── Mood Scores ───
  const moods = {
    senang: 0,
    marah: 0,
    sedih: 0,
    lelah: 0,
    stres: 0,
    tenang: 0,
    antusias: 0,
    gugup: 0,
  };

  // Loud + high pitch + high dynamic range = happy/excited
  if (loudness > 55) moods.senang += 15;
  if (loudness > 65) moods.antusias += 20;
  if (pitchLevel > 60) moods.senang += 10;
  if (dynRange > 40) moods.antusias += 15;

  // Very loud + low pitch = angry
  if (loudness > 60) moods.marah += 15;
  if (pitchLevel < 30) moods.marah += 10;
  if (dynRange > 35) moods.marah += 10;
  if (loudness > 70) moods.marah += 10;

  // Quiet + low pitch + low dynamic range = sad
  if (loudness < 35) moods.sedih += 15;
  if (pitchLevel < 25) moods.sedih += 10;
  if (dynRange < 20) moods.sedih += 15;

  // Quiet + low energy + long pauses = tired
  if (loudness < 40) moods.lelah += 15;
  if (silencePercent > 15) moods.lelah += 15;
  if (dynRange < 25) moods.lelah += 10;
  if (duration > 15) moods.lelah += 5;

  // High silence ratio + moderate loudness = stressed/anxious
  if (silencePercent > 10) moods.stres += 15;
  if (silencePercent > 20) moods.stres += 10;
  if (loudness > 40 && loudness < 60 && silencePercent > 10) moods.stres += 10;

  // Moderate loudness + moderate pitch + moderate dynamics = calm
  if (loudness >= 35 && loudness <= 55) moods.tenang += 15;
  if (pitchLevel >= 30 && pitchLevel <= 55) moods.tenang += 10;
  if (silencePercent < 10) moods.tenang += 5;

  // High pitch + fast speech (short duration high energy) = nervous
  if (pitchLevel > 55 && duration < 8) moods.gugup += 15;
  if (energyDensity > 10) moods.gugup += 10;
  if (silencePercent > 8 && silencePercent < 15) moods.gugup += 10;

  // Sort moods by score
  const sortedMoods = Object.entries(moods).sort((a, b) => b[1] - a[1]);
  const topMood = sortedMoods[0];
  const secondMood = sortedMoods[1];

  // Mood labels in Indonesian
  const moodLabels = {
    senang: "Senang",
    marah: "Marah",
    sedih: "Sedih",
    lelah: "Lelah",
    stres: "Stres",
    tenang: "Tenang",
    antusias: "Antusias",
    gugup: "Gugup",
  };

  // Mood emojis
  const moodEmojis = {
    senang: "😄",
    marah: "😠",
    sedih: "😢",
    lelah: "😴",
    stres: "😰",
    tenang: "😌",
    antusias: "🤩",
    gugup: "😟",
  };

  // Mood descriptions
  const moodDescriptions = {
    senang: "Terdengar ceria dan happy! Suara kamu penuh energi positif. Lagi seneng ya?",
    marah: "Wah, terdengar emosi tinggi. Nada suara keras dan tegas. Emang lagi kesal ya?",
    sedih: "Aku dengar nada yang pelan dan berat. Kayaknya lagi ada yang bikin down. Kamu oke?",
    lelah: "Suara kamu terdengar lemas dan banyak jeda. Capek banget kayaknya. Istirahat dulu yuk.",
    stres: "Ada banyak jeda dan ketegangan di suara kamu. Kayaknya lagi banyak pikiran. Tarik napas dulu.",
    tenang: "Suara kamu stabil dan santai. Good vibes banget. Kamu lagi relax nih kayaknya.",
    antusias: "Wah energinya penuh! Suara kamu semangat dan dinamis. Ada hal seru nih?",
    gugup: "Suara kamu agak tinggi dan cepat. Gugup ya? Tenang, kamu pasti bisa.",
  };

  // Advice per mood
  const moodAdvice = {
    senang: "Pertahankan vibe positif ini! Bagi kebahagiaan ke orang sekitar.",
    marah: "Coba tarik napas dalam-dalam. Hitung sampai 10 dulu sebelum ngomong apa-apa.",
    sedih: "Nggak apa-apa kok sedih. Mau curhat? Aku di sini buat dengerin kamu.",
    lelah: "Saatnya istirahat. Tidur cukup, minum air, jaga kesehatan ya.",
    stres: "Coba relaks. Teknik 4-7-8 breathing bisa bantu: tarik 4 detik, tahan 7, buang 8.",
    tenang: "Pertahankan ketenangan ini. Kamu dalam zone yang bagus.",
    antusias: "Manfaatkan energi ini buat hal produktif. Tapi jangan lupa istirahat juga.",
    gugup: "Semua orang pernah gugup. Coba pelan-pelan, tarik napas, kamu pasti bisa.",
  };

  return {
    topMood,
    secondMood,
    moodLabels,
    moodEmojis,
    moodDescriptions,
    moodAdvice,
    sortedMoods,
    metrics: {
      duration,
      loudness: Math.round(loudness),
      pitchLevel: Math.round(pitchLevel),
      dynamicRange: Math.round(dynRange),
      silencePercent: Math.round(silencePercent),
      meanVolume: Math.round(meanVol),
      maxVolume: Math.round(maxVol),
      zcr: zcr.toFixed(4),
    },
  };
}

// ─── Generate report ───
function generateReport(analysis, pushName) {
  const {
    topMood,
    secondMood,
    moodLabels,
    moodEmojis,
    moodDescriptions,
    moodAdvice,
    sortedMoods,
    metrics,
  } = analysis;

  const [topMoodKey, topScore] = topMood;
  const [secondMoodKey, secondScore] = secondMood;

  // Top 4 moods bar chart
  const top4 = sortedMoods.slice(0, 4);
  const bars = top4.map(([key, score]) => {
    const pct = Math.min(100, score);
    const filled = Math.round(pct / 10);
    const bar = "█".repeat(filled) + "░".repeat(10 - filled);
    return `│ ${moodEmojis[key]} ${moodLabels[key]}: ${bar} ${pct}%`;
  }).join("\n");

  const report = [
    `│ *ᴠᴏɪᴄᴇ ɴᴏᴛᴇ ᴍᴏᴏᴅ ᴀɴᴀʟʏᴢᴇʀ*`,
    ` `,
    `│ Pengirim: ${pushName || "Anonim"}`,
    ` `,
    `│ *ʜᴀꜱɪʟ ᴜᴛᴀᴍᴀ:*`,
    `│ ${moodEmojis[topMoodKey]} ${moodLabels[topMoodKey]} (${topScore}%)`,
    `│ Sekunder: ${moodEmojis[secondMoodKey]} ${moodLabels[secondMoodKey]} (${secondScore}%)`,
    ` `,
    `│ *ᴀɴᴀʟɪꜱɪꜱ:*`,
    `│ ${moodDescriptions[topMoodKey]}`,
    ` `,
    `│ *ꜱᴀʀᴀɴ:*`,
    `│ ${moodAdvice[topMoodKey]}`,
    ` `,
    `│ *ᴅɪꜱᴛʀɪʙᴜꜱɪ ᴍᴏᴏᴅ:*`,
    bars,
    ` `,
    `│ *ᴀᴜᴅɪᴏ ᴍᴇᴛʀɪᴄꜱ:*`,
    `│ Durasi: ${metrics.duration.toFixed(1)}s`,
    `│ Loudness: ${metrics.loudness}% (vol: ${metrics.meanVolume}dB)`,
    `│ Pitch: ${metrics.pitchLevel}% (ZCR: ${metrics.zcr})`,
    `│ Dynamic Range: ${metrics.dynamicRange}%`,
    `│ Silence: ${metrics.silencePercent}%`,
    `│ Max Volume: ${metrics.maxVolume}dB`,
    ` `,
    `│ _Analisis berdasarkan parameter audio lokal (pitch, tempo, volume, dynamics, silence). Hasil bersifat estimasi dan untuk hiburan._`,
  ].join("\n");

  return report;
}

// ─── Plugin Config ───
const pluginConfig = {
  name: "moodcheck",
  alias: ["moodcheck"],
  category: "fun",
  description: "Menganalisis emosi/mood dari Voice Note",
  usage: ".moodcheck (reply VN)\n.moodtrackon/off (owner)\n.moodsuggon/off (owner)\n.moodaion/off (owner)\n.moodaiset <menit> (owner)\n.moodtrackstatus\n.moodhistory",
  example: ".moodcheck",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

// ─── Handler ───
async function handler(m, { sock }) {
  try {
    const groupId = m.key?.remoteJid || "";
    const isOwner = m.isOwner || false;
    const command = m.body?.split(" ")[0]?.replace(".", "") || "";

    // ─── Toggle: Mood Tracking ON ───
    if (command === "moodtrackon") {
      if (!isOwner) {
        await m.reply(claraWrap("Akses Ditolak", "🚫 Perintah ini khusus Owner bot."));
        return;
      }
      await m.react("🕒");
      const db = loadMoodDB();
      if (!db.groups[groupId]) db.groups[groupId] = {};
      db.groups[groupId].tracking = true;
      db.groups[groupId].trackEnabledAt = Date.now();
      saveMoodDB(db);
      await m.reply(claraWrap("Mood Track", "Mood Tracking untuk grup ini sudah DINYALAKAN.\n\nSetiap hasil .moodcheck akan tersimpan di database untuk riwayat mood.\n\nLihat riwayat: .moodhistory"));
      await m.react("🐣");
      return;
    }

    // ─── Toggle: Mood Tracking OFF ───
    if (command === "moodtrackoff") {
      if (!isOwner) {
        await m.reply(claraWrap("Akses Ditolak", "🚫 Perintah ini khusus Owner bot."));
        return;
      }
      await m.react("🕒");
      const db = loadMoodDB();
      if (!db.groups[groupId]) db.groups[groupId] = {};
      db.groups[groupId].tracking = false;
      saveMoodDB(db);
      await m.reply(claraWrap("Mood Track", "Mood Tracking untuk grup ini sudah DIMATIKAN.\n\nHasil .moodcheck tetap berfungsi tapi tidak disimpan ke database."));
      await m.react("🐣");
      return;
    }

    // ─── Toggle: Mood Suggest ON ───
    if (command === "moodsuggon") {
      if (!isOwner) {
        await m.reply(claraWrap("Akses Ditolak", "🚫 Perintah ini khusus Owner bot."));
        return;
      }
      await m.react("🕒");
      const db = loadMoodDB();
      if (!db.groups[groupId]) db.groups[groupId] = {};
      db.groups[groupId].moodSuggest = true;
      db.groups[groupId].suggEnabledAt = Date.now();
      saveMoodDB(db);
      await m.reply(claraWrap("Mood Suggest", "Auto Mood Suggest sudah DINYALAKAN untuk grup ini.\n\nKalau seseorang 3x berturut-turut terdeteksi mood negatif (Sedih, Stres, Marah, Gugup), bot akan kirim pesan support otomatis.\n\nCatatan: Mood Tracking juga harus ON (.moodtrackon) agar fitur ini berfungsi."));
      await m.react("🐣");
      return;
    }

    // ─── Toggle: Mood Suggest OFF ───
    if (command === "moodsuggoff") {
      if (!isOwner) {
        await m.reply(claraWrap("Akses Ditolak", "🚫 Perintah ini khusus Owner bot."));
        return;
      }
      await m.react("🕒");
      const db = loadMoodDB();
      if (!db.groups[groupId]) db.groups[groupId] = {};
      db.groups[groupId].moodSuggest = false;
      saveMoodDB(db);
      await m.reply(claraWrap("Mood Suggest", "Auto Mood Suggest sudah DIMATIKAN untuk grup ini.\n\nBot berhenti mengirim pesan support otomatis. Mood tracking tetap berjalan kalau masih ON."));
      await m.react("🐣");
      return;
    }

    // ─── Toggle: Mood AI Connect ON ───
    if (command === "moodaion") {
      if (!isOwner) {
        await m.reply(claraWrap("Akses Ditolak", "🚫 Perintah ini khusus Owner bot."));
        return;
      }
      await m.react("🕒");
      const db = loadMoodDB();
      if (!db.groups[groupId]) db.groups[groupId] = {};
      db.groups[groupId].moodAI = true;
      db.groups[groupId].moodAIEnabledAt = Date.now();
      saveMoodDB(db);
      await m.reply(claraWrap("Mood AI Connect", "Mood AI Connect sudah DINYALAKAN untuk grup ini.\n\nKalau seseorang 3x berturut-turut terdeteksi mood negatif, bot akan menghubungkan mereka ke AI untuk ngobrol interaktif.\n\n*ᴄᴏᴏʟᴅᴏᴡɴ:* Default 30 menit per user. Bisa diubah dengan .moodaiset <menit>.\n\n*ꜱʏᴀʀᴀᴛ:* Mood Tracking juga harus ON (.moodtrackon) dan AI config harus terisi (apiKey di .aihelp)."));
      await m.react("🐣");
      return;
    }

    // ─── Toggle: Mood AI Connect OFF ───
    if (command === "moodaioff") {
      if (!isOwner) {
        await m.reply(claraWrap("Akses Ditolak", "🚫 Perintah ini khusus Owner bot."));
        return;
      }
      await m.react("🕒");
      const db = loadMoodDB();
      if (!db.groups[groupId]) db.groups[groupId] = {};
      db.groups[groupId].moodAI = false;
      saveMoodDB(db);
      await m.reply(claraWrap("Mood AI Connect", "Mood AI Connect sudah DIMATIKAN untuk grup ini.\n\nBot berhenti menghubungkan user ke AI otomatis. Mood Suggest (pesan statis) tetap berjalan kalau masih ON."));
      await m.react("🐣");
      return;
    }

    // ─── Set AI Cooldown Duration ───
    if (command === "moodaiset") {
      if (!isOwner) {
        await m.reply(claraWrap("Akses Ditolak", "🚫 Perintah ini khusus Owner bot."));
        return;
      }
      const args = m.body?.split(" ").slice(1) || [];
      const minutes = parseInt(args[0]);

      if (!minutes || minutes < 1 || minutes > 1440) {
        await m.reply(claraWrap("Mood AI Cooldown", "Format: .moodaiset <menit>\n\nContoh:\n.moodaiset 15 - Set cooldown 15 menit\n.moodaiset 60 - Set cooldown 1 jam\n.moodaiset 0 - Reset ke default (30 menit)\n\nRange: 1-1440 menit (24 jam max)"));
        return;
      }

      await m.react("🕒");
      const db = loadMoodDB();
      if (!db.groups[groupId]) db.groups[groupId] = {};

      if (minutes === 0) {
        delete db.groups[groupId].aiCooldownMin;
        saveMoodDB(db);
        await m.reply(claraWrap("Mood AI Cooldown", "Cooldown direset ke default (30 menit)."));
      } else {
        db.groups[groupId].aiCooldownMin = minutes;
        saveMoodDB(db);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const display = hours > 0 ? `${hours} jam ${mins > 0 ? mins + " menit" : ""}` : `${minutes} menit`;
        await m.reply(claraWrap("Mood AI Cooldown", `Cooldown AI Connect untuk grup ini diset ke *${display}*.\n\nSetiap user hanya bisa di-trigger AI maksimal 1x per ${display}.`));
      }
      await m.react("🐣");
      return;
    }

    // ─── Tracking Status ───
    if (command === "moodtrackstatus") {
      await m.react("🕒");
      const db = loadMoodDB();
      const groupData = db.groups[groupId] || {};
      const trackStatus = groupData.tracking ? "ON" : "OFF";
      const suggStatus = groupData.moodSuggest ? "ON" : "OFF";
      const aiStatus = groupData.moodAI ? "ON" : "OFF";
      const trackEnabledAt = groupData.trackEnabledAt ? new Date(groupData.trackEnabledAt).toLocaleString("id-ID") : "-";
      const suggEnabledAt = groupData.suggEnabledAt ? new Date(groupData.suggEnabledAt).toLocaleString("id-ID") : "-";
      const aiEnabledAt = groupData.moodAIEnabledAt ? new Date(groupData.moodAIEnabledAt).toLocaleString("id-ID") : "-";

      // Count total records
      let totalRecords = 0;
      let totalUsers = 0;
      for (const [jid, records] of Object.entries(db.users)) {
        if (records.some(r => r.groupId === groupId)) {
          totalUsers++;
          totalRecords += records.filter(r => r.groupId === groupId).length;
        }
      }

      const statusBody = [
        `│ *ꜱᴛᴀᴛᴜꜱ ᴍᴏᴏᴅ ᴛʀᴀᴄᴋɪɴɢ*`,
        ` `,
        `│ Tracking: ${trackStatus}`,
        `│ Aktif Sejak: ${trackEnabledAt}`,
        ` `,
        `│ Mood Suggest: ${suggStatus}`,
        `│ Aktif Sejak: ${suggEnabledAt}`,
        ` `,
        `│ Mood AI Connect: ${aiStatus}`,
        `│ Aktif Sejak: ${aiEnabledAt}`,
        `│ Cooldown: ${groupData.aiCooldownMin ? groupData.aiCooldownMin + " menit" : "30 menit (default)"} per user`,
        `│ Grup: ${groupId.split("@")[0]}`,
        ` `,
        `│ Total Records: ${totalRecords}`,
        `│ Users Tracked: ${totalUsers}`,
        ` `,
        `│ Perintah:`,
        `│ 1. .moodtrackon - Nyalakan tracking (owner)`,
        `│ 2. .moodtrackoff - Matikan tracking (owner)`,
        `│ 3. .moodsuggon - Nyalakan auto-suggest (owner)`,
        `│ 4. .moodsuggoff - Matikan auto-suggest (owner)`,
        `│ 5. .moodaion - Nyalakan AI connect (owner)`,
        `│ 6. .moodaioff - Matikan AI connect (owner)`,
        `│ 7. .moodaiset <menit> - Set cooldown AI (owner)`,
        `│ 8. .moodtrackstatus - Lihat status`,
        `│ 9. .moodhistory - Lihat riwayat mood kamu`,
        `│ 10. .moodhistory @user - Lihat mood orang lain (owner)`,
      ].join("\n");
      await m.reply(claraWrap("Mood Track Status", statusBody));
      await m.react("🐣");
      return;
    }

    // ─── Mood History ───
    if (command === "moodhistory") {
      await m.react("🕒");
      const db = loadMoodDB();

      // Determine target user
      let targetJid = m.sender || groupId;
      let targetName = m.pushName || "Kamu";

      // Check if mentioning someone else (owner only)
      const mentioned = m.mentionedJid?.[0];
      if (mentioned) {
        if (!isOwner) {
          await m.reply(claraWrap("Akses Ditolak", "🚫 Lihat mood history orang lain khusus Owner."));
          return;
        }
        targetJid = mentioned;
        targetName = mentioned.split("@")[0];
      }

      const history = getMoodHistory(targetJid, 10);

      if (history.length === 0) {
        await m.reply(claraWrap("Mood History", "Belum ada riwayat mood untuk user ini.\n\nGunakan .moodcheck dulu untuk mulai rekam, dan pastikan mood tracking sudah ON (.moodtrackon)."));
        await m.react("🐣");
        return;
      }

      // Build mood trend
      const moodEmojis = {
        "Senang": "😄", "Marah": "😠", "Sedih": "😢", "Lelah": "😴",
        "Stres": "😰", "Tenang": "😌", "Antusias": "🤩", "Gugup": "😟",
      };

      // Count mood frequency
      const moodCount = {};
      for (const r of history) {
        moodCount[r.mood] = (moodCount[r.mood] || 0) + 1;
      }
      const sortedMoods = Object.entries(moodCount).sort((a, b) => b[1] - a[1]);
      const dominantMood = sortedMoods[0];

      // Build history list
      const historyLines = history.map((r, i) => {
        const date = new Date(r.timestamp).toLocaleString("id-ID", {
          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
        });
        const emoji = moodEmojis[r.mood] || "❓";
        return `│ ${i + 1}. ${emoji} ${r.mood} (${r.score}%) - ${date}`;
      }).join("\n");

      // Build mood distribution
      const distLines = sortedMoods.slice(0, 5).map(([mood, count]) => {
        const emoji = moodEmojis[mood] || "❓";
        const pct = Math.round((count / history.length) * 100);
        return `│ ${emoji} ${mood}: ${count}x (${pct}%)`;
      }).join("\n");

      // Build trend line (simple ASCII sparkline of scores)
      const sparkChars = { 0: "▁", 1: "▂", 2: "▃", 3: "▄", 4: "▅", 5: "▆", 6: "▇", 7: "█" };
      const sparkline = history.map(r => {
        const idx = Math.min(7, Math.max(0, Math.floor(r.score / 15)));
        return sparkChars[idx];
      }).join("");

      const body = [
        `│ *Mood History - ${targetName}*`,
        ` `,
        `│ Total Records: ${history.length}`,
        `│ Mood Dominan: ${moodEmojis[dominantMood[0]] || ""} ${dominantMood[0]} (${dominantMood[1]}x)`,
        ` `,
        `│ *ᴛʀᴇɴᴅ ɪɴᴛᴇɴꜱɪᴛᴀꜱ:*`,
        `│ ${sparkline}`,
        ` `,
        `│ *ʀɪᴡᴀʏᴀᴛ ᴛᴇʀᴀᴋʜɪʀ:*`,
        historyLines,
        ` `,
        `│ *ᴅɪꜱᴛʀɪʙᴜꜱɪ ᴍᴏᴏᴅ:*`,
        distLines,
      ].join("\n");

      await m.reply(claraWrap("Mood History", body));
      await m.react("🐣");
      return;
    }

    const isVN = m.isAudio || (m.quoted && (m.quoted.isAudio || m.quoted.type === "audioMessage" || m.quoted.type === "pttMessage"));
    const isQuoted = m.quoted;

    if (!isVN) {
      const help = claraWrap(
        "Mood Check",
        [
          "Voice Note Mood & Emotion Analyzer",
          "",
          "Cara pakai:",
          "1. Reply sebuah Voice Note / audio",
          "2. Ketik .moodcheck",
          "",
          "Bot akan menganalisis emosi dari suara kamu berdasarkan:",
          "Pitch, tempo, volume, dynamic range, dan silence pattern.",
          "",
          "Hasil: mood utama + saran psikologis santai.",
          "",
          "Tracking (owner):",
          ".moodtrackon - Nyalakan mood tracking",
          ".moodtrackoff - Matikan mood tracking",
          ".moodsuggon - Nyalakan auto-support (statis)",
          ".moodsuggoff - Matikan auto-support",
          ".moodaion - Nyalakan AI connect (interaktif)",
          ".moodaioff - Matikan AI connect",
          ".moodaiset <menit> - Set cooldown AI (1-1440)",
          ".moodtrackstatus - Cek status tracking",
          "",
          "History:",
          ".moodhistory - Lihat riwayat mood kamu",
        ].join("\n")
      );
      await m.reply( help, { commandName: "moodcheck" });
      return;
    }

    await m.react("🕒");

    // Download voice note
    let mediaBuffer;
    if (m.quoted) {
      mediaBuffer = await m.quoted.download();
    } else if (m.download) {
      mediaBuffer = await m.download();
    }

    if (!mediaBuffer) {
      await m.reply(novaError("MoodCheck", "Gagal download VN nih, coba reply ulang"));
      return;
    }

    // Save to temp file
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `mood_input_${Date.now()}.ogg`);
    fs.writeFileSync(inputPath, mediaBuffer);

    try {
      // Analyze
      const analysis = await analyzeAudio(inputPath);
      const report = generateReport(analysis, m.pushName);

      // Save mood record if tracking is ON
      const groupId = m.key?.remoteJid || "";
      if (isMoodTrackOn(groupId)) {
        try {
          saveMoodRecord(m.sender || groupId, groupId, {
            mood: analysis.moodLabels[analysis.topMood[0]],
            score: analysis.topMood[1],
            metrics: analysis.metrics,
          });

          // Auto mood suggest: check negative streak
          const streak = checkNegativeStreak(m.sender || groupId);
          if (streak) {
            const moodKey = streak[streak.length - 1].mood;
            const senderJid = m.sender || m.key?.participant || "";

            // Priority 1: AI Connect (if ON and not on cooldown)
            if (isMoodAIOn(groupId)) {
              if (!isAIOnCooldown(m.sender || groupId, groupId)) {
                setAITrigger(m.sender || groupId);
                await triggerAIConversation(
                  sock, groupId, senderJid, m.pushName,
                  moodKey, streak[streak.length - 1].score,
                  botConfig
                );
              } else {
                // On cooldown - send brief static message instead
                const cdMin = getCooldownRemaining(m.sender || groupId, groupId);
                console.log(`[MOODCHECK] AI on cooldown for user (${cdMin}min remaining)`);
              }
            }
            // Priority 2: Static suggest (if AI not used)
            else if (isMoodSuggOn(groupId)) {
              const supportMsg = getSupportMessage(moodKey, m.pushName);
              const supportBody = [
                `│ *ᴘᴇꜱᴀɴ ꜱᴜᴘᴘᴏʀᴛ ᴏᴛᴏᴍᴀᴛɪꜱ*`,
                ` `,
                `│ Hai ${m.pushName || "Kamu"},`,
                ` `,
                `│ ${supportMsg}`,
                ` `,
                `│ _Pesan ini dikirim otomatis karena 3x terakhir mood kamu terdeteksi: ${moodKey}_`,
              ].join("\n");
              await sock.sendMessage(groupId, {
                text: claraWrap("Mood Support", supportBody),
                mentions: senderJid ? [senderJid] : [],
              });
            }
          }
        } catch (e) {
          console.log("[MOODCHECK] Save tracking/suggest failed:", e.message);
        }
      }

      await m.reply(claraWrap(`Mood Check - ${analysis.moodLabels[analysis.topMood[0]]}`, report));
      await m.react("🐣");
    } finally {
      // Cleanup
      try { fs.unlinkSync(inputPath); } catch (e) { console.error('[moodcheck.js]:', e.message); }
    }
  } catch (error) {
    console.error("[MOODCHECK] Error:", error.message);
    try { fs.unlinkSync(path.join(os.tmpdir(), `mood_input_${Date.now()}.ogg`)); } catch (e) { console.error('[moodcheck.js]:', e.message); }
    await m.reply(claraWrap("Mood Check", "Terjadi error saat menganalisis audio. Pastikan kamu reply ke Voice Note yang valid (bukan sticker/video)."));
  }
}

export { pluginConfig as config, handler };
