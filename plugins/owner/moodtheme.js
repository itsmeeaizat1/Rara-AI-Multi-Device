// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Mood-Driven Auto Theme Switcher — Bot baca emosi dari cara mengetik
// Analisis: kecepatan kirim, panjang pesan, rasio kapital, tanda baca, emoji
// Deteksi mood -> ubah gaya jawaban AI (ringkas/santai/empatik/etc)
// .moodtheme on/off — Toggle (default OFF saat pairing)
// .moodtheme status — Lihat mood saat ini & analisis
// .moodtheme sensitivity <low/medium/high> — Sensitivitas deteksi
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaWrap, tipText } from "../../src/lib/nova-menu-style.js";
import { getApiKey } from "../../src/lib/nova-api-keys.js";

const pluginConfig = {
  name: "moodtheme",
  alias: ["moodtheme"],
  category: "owner",
  description: "Toggle Mood-Driven Theme — bot baca mood dari gaya ngetik, ubah gaya jawaban",
  usage: ".moodtheme on/off — Toggle\n.moodtheme status — Lihat mood & analisis\n.moodtheme sensitivity <low/medium/high> — Sensitivitas",
  example: ".moodtheme on\n.moodtheme sensitivity high",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
  defaultOff: true,
};

// ═══════════════════════════════════════════════════════════════
// MOOD DETECTION ENGINE
// ═══════════════════════════════════════════════════════════════

const MOOD_PROFILES = {
  panic: {
    label: "Panik/Buru-buru",
    emoji: "😱",
    description: "Ngetik cepat, pesan pendek, banyak tanda seru",
    aiStyle: "Jawab SANGAT RINGKAS. Langsung ke solusi. Maksimal 2 kalimat. Tanpa basa-basi. Tanpa emoji. To the point. Contoh: 'Restart aja, ketik .restart'",
  },
  angry: {
    label: "Marah/Kesal",
    emoji: "😠",
    description: "Banyak huruf kapital, tanda seru agresif",
    aiStyle: "Jawab tenang, singkat, tidak memprovokasi. Maksimal 3 kalimat. Akui frustration user dulu, baru kasih solusi. Jangan pakai emoji. Contoh: 'Tenang, ini solusinya: ...'",
  },
  sad: {
    label: "Sedih/Lelah",
    emoji: "😢",
    description: "Pesan pendek, lambat, minimal tanda baca",
    aiStyle: "Jawab lembut, empatik, supportive. 3-5 kalimat. Akui perasaan user, kasih semangat. Boleh pakai emoji hangat. Contoh: 'Hey, gua ngerti lu lagi gak enak...'",
  },
  excited: {
    label: "Bersemangat/Senang",
    emoji: "🤩",
    description: "Banyak emoji, huruf kapital, tanda seru positif",
    aiStyle: "Jawab dengan energi matching! Santai, ceria, ikut semangat. Boleh pakai emoji. 3-5 kalimat. Contoh: 'Wihh mantap! Lanjut bos! 🔥'",
  },
  relaxed: {
    label: "Santai/Rileks",
    emoji: "😌",
    description: "Pesan normal, tidak terburu, santai",
    aiStyle: "Jawab santai, ngobrol, boleh bercanda. 4-6 kalimat. Pakai bahasa gaul. Boleh emoji secukupnya. Contoh: 'Oh ini ya, gampang bos. Jadi gini...'",
  },
  neutral: {
    label: "Netral",
    emoji: "😐",
    description: "Pola ngetik normal, tidak ada indikasi emosi kuat",
    aiStyle: "Jawab normal, informatif, jelas. 3-5 kalimat. Sesuaikan dengan pertanyaan user.",
  },
};

// Analyze typing pattern from recent messages
function analyzeTypingPattern(messages) {
  if (!messages || messages.length < 2) {
    return { mood: "neutral", confidence: 0, metrics: {} };
  }

  const recent = messages.slice(-10); // last 10 messages
  const metrics = {
    avgLength: 0,
    avgGapMs: 0,
    capsRatio: 0,
    exclaimRatio: 0,
    questionRatio: 0,
    emojiCount: 0,
    shortMsgRatio: 0,
    longMsgRatio: 0,
    rapidFireCount: 0,
  };

  // Average message length
  const lengths = recent.map(m => m.length || (m.text || "").length);
  metrics.avgLength = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);

  // Short vs long ratio
  metrics.shortMsgRatio = lengths.filter(l => l < 20).length / lengths.length;
  metrics.longMsgRatio = lengths.filter(l => l > 100).length / lengths.length;

  // Average gap between messages
  const gaps = [];
  for (let i = 1; i < recent.length; i++) {
    const gap = new Date(recent[i].time).getTime() - new Date(recent[i - 1].time).getTime();
    if (gap > 0 && gap < 300000) gaps.push(gap); // ignore gaps > 5 min
  }
  metrics.avgGapMs = gaps.length > 0 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0;

  // Rapid fire: 3+ messages within 5 seconds of each other
  let rapidCount = 0;
  for (let i = 1; i < recent.length; i++) {
    const gap = new Date(recent[i].time).getTime() - new Date(recent[i - 1].time).getTime();
    if (gap > 0 && gap < 5000) rapidCount++;
  }
  metrics.rapidFireCount = rapidCount;

  // Caps ratio, exclamation, question, emoji across all text
  let totalChars = 0;
  let capsChars = 0;
  let exclaimCount = 0;
  let questionCount = 0;
  let emojiCount = 0;

  recent.forEach(m => {
    const text = m.text || "";
    totalChars += text.length;
    capsChars += (text.match(/[A-Z]/g) || []).length;
    exclaimCount += (text.match(/!/g) || []).length;
    questionCount += (text.match(/\?/g) || []).length;
    emojiCount += (text.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length;
  });

  metrics.capsRatio = totalChars > 0 ? Math.round((capsChars / totalChars) * 100) : 0;
  metrics.exclaimRatio = recent.length > 0 ? Math.round((exclaimCount / recent.length) * 100) : 0;
  metrics.questionRatio = recent.length > 0 ? Math.round((questionCount / recent.length) * 100) : 0;
  metrics.emojiCount = emojiCount;

  return metrics;
}

// Decide mood based on metrics + sensitivity
function detectMood(metrics, sensitivity) {
  const scores = {
    panic: 0,
    angry: 0,
    sad: 0,
    excited: 0,
    relaxed: 0,
    neutral: 0,
  };

  // Sensitivity multiplier
  const sensMult = sensitivity === "high" ? 1.5 : sensitivity === "low" ? 0.6 : 1.0;

  // PANIC: rapid fire + short messages + fast gaps
  if (metrics.rapidFireCount >= 2) scores.panic += 40 * sensMult;
  if (metrics.avgGapMs > 0 && metrics.avgGapMs < 5000) scores.panic += 30 * sensMult;
  if (metrics.shortMsgRatio > 0.6) scores.panic += 20 * sensMult;
  if (metrics.exclaimRatio > 40) scores.panic += 10 * sensMult;

  // ANGRY: high caps ratio + exclamation
  if (metrics.capsRatio > 25) scores.angry += 35 * sensMult;
  if (metrics.exclaimRatio > 30) scores.angry += 25 * sensMult;
  if (metrics.shortMsgRatio > 0.5) scores.angry += 15 * sensMult;
  if (metrics.rapidFireCount >= 1) scores.angry += 10 * sensMult;

  // SAD: slow gaps + short messages + low exclamation
  if (metrics.avgGapMs > 60000) scores.sad += 30 * sensMult; // gaps > 1 min
  if (metrics.shortMsgRatio > 0.5 && metrics.exclaimRatio < 10) scores.sad += 25 * sensMult;
  if (metrics.avgLength < 15 && metrics.emojiCount === 0) scores.sad += 15 * sensMult;

  // EXCITED: many emoji + caps + exclamation (positive)
  if (metrics.emojiCount >= 3) scores.excited += 35 * sensMult;
  if (metrics.exclaimRatio > 30 && metrics.capsRatio > 15) scores.excited += 25 * sensMult;
  if (metrics.rapidFireCount >= 1 && metrics.emojiCount >= 2) scores.excited += 20 * sensMult;

  // RELAXED: normal gaps, longer messages, some emoji, low caps
  if (metrics.avgLength > 30 && metrics.capsRatio < 15) scores.relaxed += 25 * sensMult;
  if (metrics.avgGapMs > 10000 && metrics.avgGapMs < 120000) scores.relaxed += 20 * sensMult;
  if (metrics.emojiCount >= 1 && metrics.emojiCount <= 5) scores.relaxed += 15 * sensMult;
  if (metrics.longMsgRatio > 0.2) scores.relaxed += 15 * sensMult;

  // NEUTRAL: baseline
  scores.neutral = 20; // base score

  // Find highest
  let maxMood = "neutral";
  let maxScore = scores.neutral;
  for (const [mood, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxMood = mood;
    }
  }

  // If nothing strong, default neutral
  if (maxScore < 25) {
    maxMood = "neutral";
    maxScore = 20;
  }

  const confidence = Math.min(100, Math.round(maxScore));

  return { mood: maxMood, confidence, scores };
}

// ═══════════════════════════════════════════════════════════════
// TRACK MESSAGE (passive — called from handler.js)
// ═══════════════════════════════════════════════════════════════

export function trackMoodTheme(m, sock) {
  try {
    const db = getDatabase();
    if (!db.db.data.moodTheme) return false;
    const gid = m.key?.remoteJid || "";
    const cfg = db.db.data.moodTheme[gid];
    if (!cfg || !cfg.enabled) return false;

    if (m.fromMe || m.isCommand) return false;

    const uid = m.sender || m.key?.participant || gid;
    if (!db.db.data.moodThemeData) db.db.data.moodThemeData = {};
    const allData = db.db.data.moodThemeData;
    if (!allData[uid]) allData[uid] = { messages: [], currentMood: "neutral", moodHistory: [] };

    const userData = allData[uid];
    const msgText = (m.text || m.body || "").slice(0, 300);

    userData.messages.push({
      time: new Date().toISOString(),
      text: msgText,
      length: msgText.length,
    });

    // Keep last 30 messages per user
    if (userData.messages.length > 30) {
      userData.messages = userData.messages.slice(-30);
    }

    // Analyze mood
    const metrics = analyzeTypingPattern(userData.messages);
    const detection = detectMood(metrics, cfg.sensitivity || "medium");

    // If mood changed, record in history
    if (userData.currentMood !== detection.mood) {
      userData.moodHistory.push({
        mood: detection.mood,
        time: new Date().toISOString(),
        confidence: detection.confidence,
      });
      if (userData.moodHistory.length > 50) userData.moodHistory = userData.moodHistory.slice(-50);
      userData.currentMood = detection.mood;
    }

    // Debounced write
    if (userData.messages.length % 3 === 0) db.db.write();

    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// GET CURRENT MOOD (called before AI response)
// ═══════════════════════════════════════════════════════════════

export function getCurrentMood(uid) {
  try {
    const db = getDatabase();
    if (!db.db.data.moodThemeData) return null;
    const userData = db.db.data.moodThemeData[uid];
    if (!userData) return null;
    return {
      mood: userData.currentMood || "neutral",
      profile: MOOD_PROFILES[userData.currentMood] || MOOD_PROFILES.neutral,
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// GET MOOD-AWARE SYSTEM PROMPT ADDITION
// ═══════════════════════════════════════════════════════════════

export function getMoodSystemPrompt(uid) {
  try {
    const moodData = getCurrentMood(uid);
    if (!moodData) return "";
    const profile = moodData.profile;
    return `\n\n[MOOD DETECTED: ${moodData.mood} — ${profile.label}]\n[INSTRUKSI GAYA JAWABAN: ${profile.aiStyle}]`;
  } catch {
    return "";
  }
}

// ═══════════════════════════════════════════════════════════════
// IS MOOD THEME ENABLED
// ═══════════════════════════════════════════════════════════════

export function isMoodThemeEnabled(m) {
  try {
    const db = getDatabase();
    if (!db.db.data.moodTheme) return false;
    const gid = m.key?.remoteJid || "";
    const cfg = db.db.data.moodTheme[gid];
    return cfg && cfg.enabled === true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// COMMAND HANDLER
// ═══════════════════════════════════════════════════════════════

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const db = getDatabase();
    if (!db.db.data.moodTheme) db.db.data.moodTheme = {};
    const cfg = db.db.data.moodTheme;
    const gid = m.key?.remoteJid || "";

    const arg = (m.text || "").trim().toLowerCase();
    const args = arg.split(/\s+/);

    if (args[0] === "on") {
      cfg[gid] = {
        enabled: true,
        sensitivity: cfg[gid]?.sensitivity || "medium",
      };
      db.db.write();
      const text = novaWrap("Mood-Driven Theme Switcher", [
        "Status: ON",
        "Sensitivity: " + cfg[gid].sensitivity,
        "",
        "Bot sekarang baca mood dari:",
        "1. Kecepatan kirim pesan (rapid fire = panik)",
        "2. Panjang pesan (pendek = buru/sedih)",
        "3. Rasio huruf kapital (tinggi = marah)",
        "4. Tanda seru (!) = urgensi/emosi",
        "5. Emoji count = senang/santai",
        "6. Gap antar pesan (lambat = santai/sedih)",
        "",
        "Mood terdeteksi -> gaya jawaban berubah:",
        "Panik -> super ringkas, to the point",
        "Marah -> tenang, de-eskalasi",
        "Sedih -> empatik, lembut",
        "Senang -> ikut semangat",
        "Santai -> ngobrol santai",
        "Netral -> normal",
        "",
        "Default OFF. Tidak aktif saat pairing.",
      ].join("\n")) + "\n" + tipText("Ketik " + prefix + "moodtheme off untuk matikan");
      await m.reply( text, "moodtheme");
    } else if (args[0] === "off") {
      if (cfg[gid]) cfg[gid].enabled = false;
      db.db.write();
      const text = novaWrap("Mood-Driven Theme Switcher", ["Status: OFF", "Bot kembali ke gaya jawaban standar"].join("\n"));
      await m.reply( text, "moodtheme");
    } else if (args[0] === "sensitivity") {
      const sens = args[1] || "medium";
      if (!["low", "medium", "high"].includes(sens)) {
        const text = novaWrap("Mood-Driven Theme Switcher", "Pilih: low (kalem), medium (seimbang), high (sensitif)");
        await m.reply( text, "moodtheme");
        return { handled: true };
      }
      if (!cfg[gid]) cfg[gid] = {};
      cfg[gid].sensitivity = sens;
      cfg[gid].enabled = cfg[gid].enabled ?? true;
      db.db.write();
      const sensDesc = {
        low: "Hanya mood yang sangat jelas (panik ekstrem, marah kapital semua)",
        medium: "Deteksi seimbang (rekomendasi)",
        high: "Sangat sensitif, deteksi mood dari perubahan kecil",
      };
      const text = novaWrap("Mood-Driven Theme Switcher", [
        "Sensitivity: " + sens,
        sensDesc[sens],
        "Status: " + (cfg[gid].enabled ? "ON" : "OFF"),
      ].join("\n"));
      await m.reply( text, "moodtheme");
    } else if (args[0] === "status") {
      const uid = m.sender || gid;
      const allData = db.db.data.moodThemeData || {};
      const userData = allData[uid];

      let lines = ["Status: " + (cfg[gid]?.enabled ? "ON" : "OFF")];
      lines.push("Sensitivity: " + (cfg[gid]?.sensitivity || "medium"));

      if (userData && userData.messages.length >= 2) {
        const metrics = analyzeTypingPattern(userData.messages);
        const detection = detectMood(metrics, cfg[gid]?.sensitivity || "medium");
        const profile = MOOD_PROFILES[detection.mood];

        lines.push("");
        lines.push("Mood saat ini: " + profile.emoji + " " + profile.label);
        lines.push("Confidence: " + detection.confidence + "%");
        lines.push("");
        lines.push("Analisis pola ngetik:");
        lines.push("Avg panjang pesan: " + metrics.avgLength + " char");
        lines.push("Avg gap: " + (metrics.avgGapMs > 0 ? Math.round(metrics.avgGapMs / 1000) + " detik" : "-"));
        lines.push("Rasio kapital: " + metrics.capsRatio + "%");
        lines.push("Rasio tanda seru: " + metrics.exclaimRatio + "%");
        lines.push("Rasio tanda tanya: " + metrics.questionRatio + "%");
        lines.push("Emoji count: " + metrics.emojiCount);
        lines.push("Rapid fire: " + metrics.rapidFireCount + "x");
        lines.push("Short msg ratio: " + Math.round(metrics.shortMsgRatio * 100) + "%");
        lines.push("");
        lines.push("Gaya jawaban: " + detection.mood);
        lines.push(profile.aiStyle.slice(0, 80) + "...");

        // Score breakdown
        lines.push("");
        lines.push("Skor mood:");
        Object.entries(detection.scores).forEach(([mood, score]) => {
          const bar = "▰".repeat(Math.round(score / 10)) + "▱".repeat(10 - Math.round(score / 10));
          lines.push("  " + mood.padEnd(8) + " " + bar + " " + score);
        });
      } else {
        lines.push("");
        lines.push("Data belum cukup (butuh min 2 pesan)");
        lines.push("Pesan terkumpul: " + (userData?.messages?.length || 0) + "/2");
      }

      const text = novaWrap("Mood-Driven Theme Switcher", lines.join("\n"));
      await m.reply( text, "moodtheme");
    } else {
      const status = cfg[gid]?.enabled ? "ON" : "OFF";
      const sens = cfg[gid]?.sensitivity || "medium";
      const text = novaWrap("Mood-Driven Theme Switcher", [
        "Status: " + status,
        "Sensitivity: " + sens,
        "Default: OFF (tidak aktif saat pairing)",
        "",
        "Perintah:",
        prefix + "moodtheme on/off — Toggle",
        prefix + "moodtheme status — Lihat mood & analisis",
        prefix + "moodtheme sensitivity <low/medium/high>",
        "",
        "Bot baca mood dari gaya ngetik,",
        "lalu ubah gaya jawaban AI otomatis",
      ].join("\n"));
      await m.reply( text, "moodtheme");
    }
  } catch (e) {
    await m.reply(novaWrap("moodtheme", "Gagal proses. Coba lagi.", "error"));
  }
  return { handled: true };
}

export { pluginConfig as config, handler };
