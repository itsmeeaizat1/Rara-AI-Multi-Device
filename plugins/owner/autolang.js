// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .autolang — Auto Language Detect & Translate
 *
 * Fitur automation "bot masa depan" #6:
 * - Deteksi bahasa incoming message secara real-time
 * - Auto-translate ke bahasa target (default: id/Bahasa Indonesia)
 * - Bot respond dalam bahasa user yang terdeteksi
 * - Support 100+ bahasa via Google Translate API
 * - Per-grup & per-user toggle, configurable sensitivity
 * - Whitelist/blacklist bahasa tertentu
 * - Reply-based translation untuk pesan spesifik
 * - Auto-detect mode: translate semua pesan asing otomatis
 * - Smart mode: hanya translate jika confidence > threshold
 * - Statistics tracking (total detected, translated, per-language)
 * - Cooldown per user untuk anti-spam
 * - Exclude owner, bot, dan command messages
 *
 * Commands:
 *   .autolang                          — Dashboard status
 *   .autolang on/off                   — Aktifkan/matikan (global)
 *   .autolang group on/off              — Toggle per-grup
 *   .autolang target <kode>             — Set bahasa target (id, en, ja, ar, dll)
 *   .autolang respond <on/off>         — Bot respond dalam bahasa user
 *   .autolang smart <on/off>            — Smart mode (confidence threshold)
 *   .autolang confidence <0-100>        — Set confidence threshold
 *   .autolang whitelist add/del <kode>  — Hanya translate bahasa tertentu
 *   .autolang blacklist add/del <kode>  — Skip bahasa tertentu
 *   .autolang cooldown <detik>          — Cooldown per user
 *   .autolang stats                     — Lihat statistik deteksi
 *   .autolang reset                     — Reset statistik
 *   .autolang test <teks>               — Test deteksi bahasa
 *   .autolang list                      — Lihat daftar bahasa support
 *   .autolang settime HH:MM             — Set jam auto-report harian
 */

import { CronJob } from "cron";
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraError, raraGuide, toSC, raraBox } from "../../src/lib/rara-menu-style.js";
import config from "../../config.js";

const pluginConfig = {
  name: "autolang",
  alias: ["autolang", "autolanguage", "autotranslate2", "langdetect"],
  category: "owner",
  description: "Auto Language Detect & Translate — deteksi bahasa & translate otomatis",
  usage: ".autolang <on/off/group/target/respond/smart/confidence/whitelist/blacklist/cooldown/stats/reset/test/list/settime>",
  example: ".autolang on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ============================================================
// STATE
// ============================================================
let cronJob = null;

// ============================================================
// CONSTANTS
// ============================================================

const LANG_NAMES = {
  id: "Indonesia", en: "English", ja: "Japanese", ko: "Korean", zh: "Chinese",
  ar: "Arabic", th: "Thai", vi: "Vietnamese", ms: "Malay", ru: "Russian",
  de: "German", fr: "French", es: "Spanish", it: "Italian", pt: "Portuguese",
  nl: "Dutch", tr: "Turkish", hi: "Hindi", ur: "Urdu", fa: "Persian",
  pl: "Polish", sv: "Swedish", no: "Norwegian", da: "Danish", fi: "Finnish",
  cs: "Czech", el: "Greek", he: "Hebrew", hu: "Hungarian", ro: "Romanian",
  uk: "Ukrainian", hr: "Croatian", sr: "Serbian", sk: "Slovak", sl: "Slovenian",
  bg: "Bulgarian", lv: "Latvian", lt: "Lithuanian", et: "Estonian", is: "Icelandic",
  ga: "Irish", cy: "Welsh", ca: "Catalan", eu: "Basque", gl: "Galician",
  af: "Afrikaans", sw: "Swahili", ta: "Tamil", te: "Telugu", ml: "Malayalam",
  kn: "Kannada", bn: "Bengali", gu: "Gujarati", pa: "Punjabi", mr: "Marathi",
  ne: "Nepali", si: "Sinhala", my: "Burmese", km: "Khmer", lo: "Lao",
  jv: "Javanese", su: "Sundanese", fil: "Filipino", tl: "Tagalog", ceb: "Cebuano",
  haw: "Hawaiian", mi: "Maori", sm: "Samoan", to: "Tongan", fj: "Fijian",
  mn: "Mongolian", kk: "Kazakh", uz: "Uzbek", ky: "Kyrgyz", tg: "Tajik",
  tk: "Turkmen", az: "Azerbaijani", hy: "Armenian", ka: "Georgian",
  am: "Amharic", ti: "Tigrinya", om: "Oromo", so: "Somali", rw: "Kinyarwanda",
  ny: "Chichewa", st: "Sesotho", zu: "Zulu", xh: "Xhosa",
};

const COMMON_LANGS = ["id", "en", "ja", "ko", "zh", "ar", "th", "vi", "jv", "su", "ms", "fil"];

// ============================================================
// SETTINGS
// ============================================================
function getSettings() {
  const db = getDatabase();
  if (!db.db.data.automation) db.db.data.automation = {};
  if (!db.db.data.automation.autoLang) {
    db.db.data.automation.autoLang = {
      enabled: false,
      targetLang: "id",
      respondInUserLang: true,
      smartMode: true,
      confidenceThreshold: 70,
      cooldown: 10,
      whitelist: [],
      blacklist: [],
      groupSettings: {},
      reportTime: "20:00",
      stats: {
        totalDetected: 0,
        totalTranslated: 0,
        byLanguage: {},
        byGroup: {},
        lastReport: null,
      },
      lastReport: null,
    };
    db.db.write();
  }
  return db.db.data.automation.autoLang;
}

// ============================================================
// LANGUAGE DETECTION (Google Translate API)
// ============================================================

async function detectLanguage(text) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text.slice(0, 500))}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { lang: null, confidence: 0 };
    const json = await res.json();
    const detectedLang = json?.[2] || json?.[8]?.[0]?.[0] || null;
    let confidence = 0;
    if (json?.[8] && json[8][0]) {
      confidence = Math.round((json[8][0][1] || 0) * 100);
    } else {
      confidence = detectedLang ? 75 : 0;
    }
    return { lang: detectedLang, confidence };
  } catch (e) {
    console.error("[autolang] detectLanguage error:", e.message);
    return { lang: null, confidence: 0 };
  }
}

async function translateText(text, from, to) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from || "auto"}&tl=${to}&dt=t&q=${encodeURIComponent(text.slice(0, 4000))}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = await res.json();
    const translated = json?.[0]?.map((s) => s?.[0]).join("") || null;
    const detectedSource = json?.[2] || from;
    return { translated, detectedSource };
  } catch (e) {
    console.error("[autolang] translateText error:", e.message);
    return null;
  }
}

// ============================================================
// HELPER: Check if message is a command
// ============================================================
function isCommand(text, prefix) {
  if (!text || !prefix) return false;
  return text.startsWith(prefix);
}

// ============================================================
// HELPER: Check if message is too short for detection
// ============================================================
function isTooShort(text) {
  const clean = text.trim();
  if (clean.length < 3) return true;
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length < 2) return true;
  return false;
}

// ============================================================
// HELPER: Get user cooldown
// ============================================================
function checkCooldown(settings, jid) {
  if (!settings._cooldowns) settings._cooldowns = {};
  const now = Date.now();
  const last = settings._cooldowns[jid] || 0;
  if (now - last < settings.cooldown * 1000) {
    return false;
  }
  settings._cooldowns[jid] = now;
  return true;
}

// ============================================================
// STATS UPDATE
// ============================================================
function updateStats(settings, lang, gid) {
  settings.stats.totalDetected++;
  settings.stats.byLanguage[lang] = (settings.stats.byLanguage[lang] || 0) + 1;
  if (gid) {
    settings.stats.byGroup[gid] = (settings.stats.byGroup[gid] || 0) + 1;
  }
}

// ============================================================
// AUTO-LISTENER: Real-time message detection
// ============================================================
async function autoLangListener(m, { sock, config: botConfig }) {
  try {
    const settings = getSettings();
    if (!settings.enabled) return null;

    const gid = m.key?.remoteJid || "";
    const jid = m.key?.participant || m.key?.remoteJid || "";
    const text = m.text || m.body || "";
    const prefix = botConfig.command?.prefix || ".";

    // Skip: command, media-only, too short, owner, bot
    if (!text || isCommand(text, prefix) || isTooShort(text)) return null;
    if (jid === config.owner?.[0] || m.key?.fromMe) return null;

    // Check group setting
    const groupSet = settings.groupSettings[gid];
    if (gid.endsWith("@g.us") && groupSet && !groupSet.enabled) return null;

    // Check cooldown
    if (!checkCooldown(settings, jid)) return null;

    // Detect language
    const { lang, confidence } = await detectLanguage(text);
    if (!lang) return null;

    // Update stats
    updateStats(settings, lang, gid);

    // Skip if same as target language
    const targetLang = groupSet?.targetLang || settings.targetLang;
    if (lang === targetLang) return null;

    // Skip if blacklisted
    if (settings.blacklist.length > 0 && settings.blacklist.includes(lang)) return null;

    // Skip if whitelist set and lang not in whitelist
    if (settings.whitelist.length > 0 && !settings.whitelist.includes(lang)) return null;

    // Smart mode: check confidence
    if (settings.smartMode && confidence < settings.confidenceThreshold) return null;

    // Translate
    const result = await translateText(text, lang, targetLang);
    if (!result || !result.translated) {
      getDatabase().db.write();
      return null;
    }

    settings.stats.totalTranslated++;
    getDatabase().db.write();

    // Build translation message
    const langName = LANG_NAMES[lang] || lang.toUpperCase();
    const targetName = LANG_NAMES[targetLang] || targetLang.toUpperCase();
    const flag = getFlag(lang);
    const targetFlag = getFlag(targetLang);

    let msg = raraBox("AUTO TRANSLATE", [
      `${flag} ${langName} -> ${targetFlag} ${targetName}`,
      `Confidence: ${confidence}%`,
      `Teks Asli: ${text.slice(0, 200)}`,
      `Hasil: ${result.translated.slice(0, 500)}`,
    ]);

    // If respondInUserLang is on, respond in detected language too
    let replyText = msg;
    if (settings.respondInUserLang) {
      const langReply = await translateText(
        `Halo! Aku sudah menerjemahkan pesanmu ke ${targetName}. Kalau butuh bantuan, ketik .menu ya!`,
        "id", lang
      );
      if (langReply?.translated) {
        replyText += `\n\n${flag} ${langReply.translated}`;
      }
    }

    return { text: replyText, lang, confidence, translated: result.translated };

  } catch (e) {
    console.error("[autolang] listener error:", e.message);
    return null;
  }
}

// ============================================================
// FLAG HELPER
// ============================================================
function getFlag(lang) {
  const flags = {
    id: "ID", en: "EN", ja: "JP", ko: "KR", zh: "CN",
    ar: "SA", th: "TH", vi: "VN", ms: "MY", ru: "RU",
    de: "DE", fr: "FR", es: "ES", it: "IT", pt: "PT",
    nl: "NL", tr: "TR", hi: "IN", ur: "PK", fa: "IR",
    jv: "JV", su: "SU", fil: "PH", tl: "PH", pl: "PL",
    sv: "SE", no: "NO", da: "DK", fi: "FI", cs: "CZ",
    el: "GR", he: "IL", hu: "HU", ro: "RO", uk: "UA",
  };
  return flags[lang] ? `[${flags[lang]}]` : "[--]";
}

// ============================================================
// CRON: Daily Stats Report
// ============================================================
function startCronJob(sock) {
  if (cronJob) cronJob.stop();
  const settings = getSettings();
  const [hh, mm] = settings.reportTime.split(":").map(Number);

  cronJob = new CronJob(
    `0 ${mm} ${hh} * * *`,
    async () => {
      try {
        const s = getSettings();
        if (!s.enabled || s.stats.totalDetected === 0) return;

        const topLangs = Object.entries(s.stats.byLanguage)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([lang, count]) => `${getFlag(lang)} ${LANG_NAMES[lang] || lang}: ${count}x`)
          .join("\n| ");

        const report = raraBox("AUTO LANG — DAILY REPORT", [
          `Total Deteksi: ${settings.stats.totalDetected}`,
          `Total Translate: ${settings.stats.totalTranslated}`,
          `Top Bahasa:`,
          `| ${topLangs || "Belum ada data"}`,
          `Whitelist: ${s.whitelist.length} bahasa`,
          `Blacklist: ${s.blacklist.length} bahasa`,
        ]);

        const ownerJid = config.owner?.[0];
        if (ownerJid && sock?.sendMessage) {
          await sock.sendMessage(ownerJid, { text: report });
        }

        s.lastReport = new Date().toISOString();
        s.stats.totalDetected = 0;
        s.stats.totalTranslated = 0;
        s.stats.byLanguage = {};
        s.stats.byGroup = {};
        getDatabase().db.write();
      } catch (e) {
        console.error("[autolang] cron error:", e.message);
      }
    },
    null, true, "Asia/Jakarta"
  );
}

// ============================================================
// EXPORT: Start function (dipanggil dari index.js)
// ============================================================
export function startAutoLang(sock) {
  const settings = getSettings();
  if (settings.enabled) {
    startCronJob(sock);
    console.log("[auto-lang] Started — daily report at", settings.reportTime, "WIB");
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================
async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const settings = getSettings();
    const db = getDatabase();
    const arg = (m.text || "").trim();
    const args = arg.split(/\s+/).filter(Boolean);
    const sub = (args[0] || "").toLowerCase();
    const gid = m.key?.remoteJid || "";

    // ─── DASHBOARD ───
    if (!sub) {
      const status = settings.enabled ? "ON" : "OFF";
      const targetName = LANG_NAMES[settings.targetLang] || settings.targetLang;
      const targetFlag = getFlag(settings.targetLang);

      const topLangs = Object.entries(settings.stats.byLanguage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([lang, count]) => `${getFlag(lang)} ${LANG_NAMES[lang] || lang}: ${count}x`)
        .join(" | ") || "Belum ada";

      const msg = raraBox("AUTO LANG DETECT & TRANSLATE", [
        `Status: ${status}`,
        `Target: ${targetFlag} ${targetName}`,
        `Respond in user lang: ${settings.respondInUserLang ? "ON" : "OFF"}`,
        `Smart mode: ${settings.smartMode ? "ON" : "OFF"}`,
        `Confidence: ${settings.confidenceThreshold}%`,
        `Cooldown: ${settings.cooldown}s`,
        `Whitelist: ${settings.whitelist.length > 0 ? settings.whitelist.join(", ") : "Semua"}`,
        `Blacklist: ${settings.blacklist.length > 0 ? settings.blacklist.join(", ") : "Tidak ada"}`,
        `Report: ${settings.reportTime} WIB`,
        `Total Deteksi: ${settings.stats.totalDetected}`,
        `Total Translate: ${settings.stats.totalTranslated}`,
        `Top: ${topLangs}`,
      ]);

      await m.reply(msg + "\n\n" + raraBox("COMMANDS", [
        `${prefix}autolang on/off`,
        `${prefix}autolang group on/off`,
        `${prefix}autolang target <kode>`,
        `${prefix}autolang respond on/off`,
        `${prefix}autolang smart on/off`,
        `${prefix}autolang confidence <0-100>`,
        `${prefix}autolang whitelist add/del <kode>`,
        `${prefix}autolang blacklist add/del <kode>`,
        `${prefix}autolang cooldown <detik>`,
        `${prefix}autolang stats`,
        `${prefix}autolang test <teks>`,
        `${prefix}autolang list`,
        `${prefix}autolang reset`,
        `${prefix}autolang settime HH:MM`,
      ]));
      return { handled: true };
    }

    // ─── ON ───
    if (sub === "on") {
      settings.enabled = true;
      db.db.write();
      if (cronJob) cronJob.stop();
      startCronJob(sock);
      await m.reply(raraBox("AUTO LANG", [
        "Status: ON",
        "Bot akan auto-detect & translate pesan asing",
        `Target: ${getFlag(settings.targetLang)} ${LANG_NAMES[settings.targetLang] || settings.targetLang}`,
      ]));
      return { handled: true };
    }

    // ─── OFF ───
    if (sub === "off") {
      settings.enabled = false;
      db.db.write();
      if (cronJob) cronJob.stop();
      await m.reply(raraBox("AUTO LANG", [
        "Status: OFF",
        "Auto-translate dimatikan",
      ]));
      return { handled: true };
    }

    // ─── GROUP TOGGLE ───
    if (sub === "group") {
      const action = (args[1] || "").toLowerCase();
      if (!gid.endsWith("@g.us")) {
        await m.reply(raraBox("AUTO LANG", ["Command ini hanya untuk grup"]));
        return { handled: true };
      }
      if (action === "on") {
        if (!settings.groupSettings[gid]) settings.groupSettings[gid] = {};
        settings.groupSettings[gid].enabled = true;
        settings.groupSettings[gid].targetLang = settings.groupSettings[gid].targetLang || settings.targetLang;
        db.db.write();
        await m.reply(raraBox("AUTO LANG", [
          `Grup ini: ON`,
          `Target: ${getFlag(settings.groupSettings[gid].targetLang)} ${LANG_NAMES[settings.groupSettings[gid].targetLang] || settings.groupSettings[gid].targetLang}`,
          "Auto-translate aktif di grup ini",
        ]));
      } else if (action === "off") {
        if (!settings.groupSettings[gid]) settings.groupSettings[gid] = {};
        settings.groupSettings[gid].enabled = false;
        db.db.write();
        await m.reply(raraBox("AUTO LANG", ["Grup ini: OFF", "Auto-translate dimatikan di grup ini"]));
      } else {
        const gStatus = settings.groupSettings[gid]?.enabled ? "ON" : "OFF";
        await m.reply(raraBox("AUTO LANG", [
          `Grup ini: ${gStatus}`,
          `Ketik: ${prefix}autolang group on/off`,
        ]));
      }
      return { handled: true };
    }

    // ─── TARGET LANG ───
    if (sub === "target") {
      const lang = (args[1] || "").toLowerCase();
      if (!lang) {
        await m.reply(raraBox("AUTO LANG", [
          `Target saat ini: ${getFlag(settings.targetLang)} ${LANG_NAMES[settings.targetLang] || settings.targetLang}`,
          `Ketik: ${prefix}autolang target <kode>`,
          `Contoh: ${prefix}autolang target en`,
        ]));
        return { handled: true };
      }
      if (!LANG_NAMES[lang]) {
        await m.reply(raraBox("AUTO LANG", [
          `Kode bahasa tidak dikenal: ${lang}`,
          `Ketik ${prefix}autolang list untuk daftar bahasa`,
        ]));
        return { handled: true };
      }
      settings.targetLang = lang;
      db.db.write();
      await m.reply(raraBox("AUTO LANG", [
        `Target diubah ke: ${getFlag(lang)} ${LANG_NAMES[lang]}`,
        "Semua pesan asing akan di-translate ke bahasa ini",
      ]));
      return { handled: true };
    }

    // ─── RESPOND IN USER LANG ───
    if (sub === "respond") {
      const action = (args[1] || "").toLowerCase();
      if (action === "on") {
        settings.respondInUserLang = true;
        db.db.write();
        await m.reply(raraBox("AUTO LANG", ["Respond in user lang: ON", "Bot akan respond dalam bahasa user"]));
      } else if (action === "off") {
        settings.respondInUserLang = false;
        db.db.write();
        await m.reply(raraBox("AUTO LANG", ["Respond in user lang: OFF", "Bot hanya translate"]));
      } else {
        await m.reply(raraBox("AUTO LANG", [
          `Respond: ${settings.respondInUserLang ? "ON" : "OFF"}`,
          `Ketik: ${prefix}autolang respond on/off`,
        ]));
      }
      return { handled: true };
    }

    // ─── SMART MODE ───
    if (sub === "smart") {
      const action = (args[1] || "").toLowerCase();
      if (action === "on") {
        settings.smartMode = true;
        db.db.write();
        await m.reply(raraBox("AUTO LANG", ["Smart mode: ON", `Hanya translate jika confidence >= ${settings.confidenceThreshold}%`]));
      } else if (action === "off") {
        settings.smartMode = false;
        db.db.write();
        await m.reply(raraBox("AUTO LANG", ["Smart mode: OFF", "Semua pesan asing akan di-translate"]));
      } else {
        await m.reply(raraBox("AUTO LANG", [
          `Smart mode: ${settings.smartMode ? "ON" : "OFF"}`,
          `Confidence: ${settings.confidenceThreshold}%`,
          `Ketik: ${prefix}autolang smart on/off`,
        ]));
      }
      return { handled: true };
    }

    // ─── CONFIDENCE THRESHOLD ───
    if (sub === "confidence") {
      const val = parseInt(args[1]);
      if (isNaN(val) || val < 0 || val > 100) {
        await m.reply(raraBox("AUTO LANG", [
          `Confidence: ${settings.confidenceThreshold}%`,
          `Ketik: ${prefix}autolang confidence <0-100>`,
        ]));
        return { handled: true };
      }
      settings.confidenceThreshold = val;
      db.db.write();
      await m.reply(raraBox("AUTO LANG", [
        `Confidence threshold: ${val}%`,
        `Hanya pesan confidence >= ${val}% yang akan di-translate`,
      ]));
      return { handled: true };
    }

    // ─── WHITELIST ───
    if (sub === "whitelist") {
      const action = (args[1] || "").toLowerCase();
      const lang = (args[2] || "").toLowerCase();
      if (action === "add" && lang) {
        if (!settings.whitelist.includes(lang)) {
          settings.whitelist.push(lang);
          db.db.write();
        }
        await m.reply(raraBox("AUTO LANG", [
          `Whitelist: ${settings.whitelist.length} bahasa`,
          settings.whitelist.join(", "),
        ]));
      } else if (action === "del" && lang) {
        settings.whitelist = settings.whitelist.filter((l) => l !== lang);
        db.db.write();
        await m.reply(raraBox("AUTO LANG", [
          `Whitelist: ${settings.whitelist.length} bahasa`,
          settings.whitelist.length > 0 ? settings.whitelist.join(", ") : "Semua bahasa",
        ]));
      } else if (action === "clear") {
        settings.whitelist = [];
        db.db.write();
        await m.reply(raraBox("AUTO LANG", ["Whitelist dikosongkan — semua bahasa diterjemahkan"]));
      } else {
        await m.reply(raraBox("AUTO LANG", [
          `Whitelist: ${settings.whitelist.length} bahasa`,
          settings.whitelist.length > 0 ? settings.whitelist.join(", ") : "Semua bahasa (no filter)",
          `Ketik: ${prefix}autolang whitelist add/del <kode>`,
        ]));
      }
      return { handled: true };
    }

    // ─── BLACKLIST ───
    if (sub === "blacklist") {
      const action = (args[1] || "").toLowerCase();
      const lang = (args[2] || "").toLowerCase();
      if (action === "add" && lang) {
        if (!settings.blacklist.includes(lang)) {
          settings.blacklist.push(lang);
          db.db.write();
        }
        await m.reply(raraBox("AUTO LANG", [
          `Blacklist: ${settings.blacklist.length} bahasa`,
          settings.blacklist.join(", "),
        ]));
      } else if (action === "del" && lang) {
        settings.blacklist = settings.blacklist.filter((l) => l !== lang);
        db.db.write();
        await m.reply(raraBox("AUTO LANG", [
          `Blacklist: ${settings.blacklist.length} bahasa`,
          settings.blacklist.length > 0 ? settings.blacklist.join(", ") : "Tidak ada",
        ]));
      } else if (action === "clear") {
        settings.blacklist = [];
        db.db.write();
        await m.reply(raraBox("AUTO LANG", ["Blacklist dikosongkan"]));
      } else {
        await m.reply(raraBox("AUTO LANG", [
          `Blacklist: ${settings.blacklist.length} bahasa`,
          settings.blacklist.length > 0 ? settings.blacklist.join(", ") : "Tidak ada",
          `Ketik: ${prefix}autolang blacklist add/del <kode>`,
        ]));
      }
      return { handled: true };
    }

    // ─── COOLDOWN ───
    if (sub === "cooldown") {
      const val = parseInt(args[1]);
      if (isNaN(val) || val < 0) {
        await m.reply(raraBox("AUTO LANG", [
          `Cooldown: ${settings.cooldown}s`,
          `Ketik: ${prefix}autolang cooldown <detik>`,
        ]));
        return { handled: true };
      }
      settings.cooldown = val;
      db.db.write();
      await m.reply(raraBox("AUTO LANG", [`Cooldown: ${val}s per user`]));
      return { handled: true };
    }

    // ─── STATS ───
    if (sub === "stats") {
      const topLangs = Object.entries(settings.stats.byLanguage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([lang, count]) => `${getFlag(lang)} ${LANG_NAMES[lang] || lang}: ${count}x`)
        .join("\n| ") || "Belum ada data";

      await m.reply(raraBox("AUTO LANG — STATISTIK", [
        `Total Deteksi: ${settings.stats.totalDetected}`,
        `Total Translate: ${settings.stats.totalTranslated}`,
        `Top Bahasa:`,
        `| ${topLangs}`,
        `Last Report: ${settings.lastReport || "Belum ada"}`,
      ]));
      return { handled: true };
    }

    // ─── RESET ───
    if (sub === "reset") {
      settings.stats = { totalDetected: 0, totalTranslated: 0, byLanguage: {}, byGroup: {}, lastReport: null };
      settings._cooldowns = {};
      db.db.write();
      await m.reply(raraBox("AUTO LANG", ["Statistik & cooldown direset"]));
      return { handled: true };
    }

    // ─── TEST DETECTION ───
    if (sub === "test") {
      const testText = args.slice(1).join(" ");
      if (!testText) {
        await m.reply(raraBox("AUTO LANG", [
          `Ketik: ${prefix}autolang test <teks>`,
          `Contoh: ${prefix}autolang test Hello world`,
        ]));
        return { handled: true };
      }
      const { lang, confidence } = await detectLanguage(testText);
      if (!lang) {
        await m.reply(raraBox("AUTO LANG", ["Gagal deteksi bahasa"]));
        return { handled: true };
      }
      const result = await translateText(testText, lang, settings.targetLang);
      await m.reply(raraBox("AUTO LANG — TEST", [
        `Teks: ${testText.slice(0, 200)}`,
        `Deteksi: ${getFlag(lang)} ${LANG_NAMES[lang] || lang}`,
        `Confidence: ${confidence}%`,
        `Translate ke ${getFlag(settings.targetLang)} ${LANG_NAMES[settings.targetLang] || settings.targetLang}:`,
        `${result?.translated || "Gagal translate"}`,
      ]));
      return { handled: true };
    }

    // ─── LIST LANGUAGES ───
    if (sub === "list") {
      const common = COMMON_LANGS.map((l) => `${getFlag(l)} ${l} = ${LANG_NAMES[l] || l}`).join("\n| ");
      const all = Object.entries(LANG_NAMES).map(([code, name]) => `${code} = ${name}`).join("\n| ");
      await m.reply(raraBox("AUTO LANG — DAFTAR BAHASA", [
        "Bahasa umum:",
        `| ${common}`,
        "",
        "Semua bahasa support:",
        `| ${all}`,
      ]));
      return { handled: true };
    }

    // ─── SET TIME ───
    if (sub === "settime") {
      const time = args[1];
      if (!time || !/^\d{2}:\d{2}$/.test(time)) {
        await m.reply(raraBox("AUTO LANG", [
          `Report time: ${settings.reportTime} WIB`,
          `Ketik: ${prefix}autolang settime HH:MM`,
          `Contoh: ${prefix}autolang settime 20:00`,
        ]));
        return { handled: true };
      }
      settings.reportTime = time;
      db.db.write();
      if (settings.enabled) {
        if (cronJob) cronJob.stop();
        startCronJob(sock);
      }
      await m.reply(raraBox("AUTO LANG", [`Report time: ${time} WIB`, "Auto-report harian diupdate"]));
      return { handled: true };
    }

    // ─── UNKNOWN ───
    await m.reply(raraBox("AUTO LANG", [
      `Command tidak dikenal: ${sub}`,
      `Ketik ${prefix}autolang untuk dashboard`,
    ]));
    return { handled: true };

  } catch (error) {
    console.error("[autolang] handler error:", error.message);
    await m.reply(raraError("AutoLang", "Gagal nih, coba lagi ya"));
    return { handled: true };
  }
}

// ============================================================
// EXPORT
// ============================================================
export { pluginConfig as config, handler, autoLangListener };
