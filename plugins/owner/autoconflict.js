// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .autoconflict — Auto-Conflict Detector & De-escalation
 *
 * Fitur automation "bot masa depan" #8:
 * - AI real-time analisis pesan grup untuk deteksi konflik/perdebatan
 * - Tracking tension level per grup (0-100) berdasarkan keyword + sentiment
 * - Deteksi: adu mulut, bullying, provokasi, drama, sara, toxic escalation
 * - Auto-intervensi dengan pesan netral/fakta/humor untuk de-eskalasi
 * - 3 intervention style: calm (tenang), humor (humor), fact (fakta netral)
 * - Per-grup toggle & sensitivity level (low/medium/high)
 * - Cooldown intervention (tidak spam intervensi)
 * - Conflict history & stats tracking
 * - Keyword blacklist: kata-kata pemicu konflik (customizable per grup)
 * - Whitelist: grup bebas konflik yang di-skip
 * - Notifikasi owner saat tension level critical
 *
 * Commands:
 *   .autoconflict                      — Dashboard status
 *   .autoconflict on/off               — Aktifkan/matikan
 *   .autoconflict addgc/delgc <gid>    — Manage grup aktif
 *   .autoconflict sensitivity <low/medium/high> — Set sensitivitas
 *   .autoconflict style <calm/humor/fact> — Set style intervensi
 *   .autoconflict cooldown <menit>    — Set cooldown intervensi
 *   .autoconflict notify on/off        — Notifikasi owner saat critical
 *   .autoconflict status               — Lihat tension level semua grup
 *   .autoconflict history              — Conflict history
 *   .autoconflict addword/delword <kata> — Manage conflict keywords
 *   .autoconflict reset                — Reset stats & tension
 */

import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaBox, toSC } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import config from "../../config.js";

const pluginConfig = {
  name: "autoconflict",
  alias: ["autoconflict", "conflictdetector", "autoresolve", "aconflict", "antikonflik"],
  category: "owner",
  description: "Auto-Conflict Detector — AI deteksi konflik grup & auto de-eskalasi",
  usage: ".autoconflict <on/off/addgc/delgc/sensitivity/style/cooldown/notify/status/history/addword/delword/reset>",
  example: ".autoconflict on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// ============================================================
// SETTINGS
// ============================================================
function getSettings() {
  const db = getDatabase();
  if (!db.db.data.automation) db.db.data.automation = {};
  if (!db.db.data.automation.autoConflict) {
    db.db.data.automation.autoConflict = {
      enabled: false,
      sensitivity: "medium", // low, medium, high
      style: "calm", // calm, humor, fact
      cooldownMinutes: 10, // cooldown between interventions per group
      notifyOwner: true,
      activeGroups: [], // empty = all groups
      conflictKeywords: [
        "bego", "goblok", "anjing", "kontol", "memek", "bangsat", "gblk",
        "kampret", "setan", "sialan", "brengsek", "tolol", "idiot", "bodoh",
        "soktahu", "nyebelin", "gak guna", "mental", "lempar", "usir",
        "kafir", "sesat", "sara", "rasist", "racist", "babi", "monyet",
      ],
      groupTension: {}, // { jid: { level, lastMessage, lastIntervention, messageBuffer, peak } }
      stats: {
        totalAnalyzed: 0,
        totalConflicts: 0,
        totalInterventions: 0,
        totalDeEscalated: 0,
        totalFalseAlarm: 0,
        byGroup: {},
        lastConflict: null,
      },
      history: [], // last 30 conflicts
    };
    db.db.write();
  }
  return db.db.data.automation.autoConflict;
}

// ============================================================
// SENSITIVITY THRESHOLDS
// ============================================================
const THRESHOLDS = {
  low: { warn: 65, critical: 85, decay: 8, buffer: 12 },
  medium: { warn: 50, critical: 75, decay: 6, buffer: 10 },
  high: { warn: 35, critical: 60, decay: 4, buffer: 8 },
};

// ============================================================
// KEYWORD DETECTION
// ============================================================
function detectConflictKeywords(text, keywords) {
  const lower = text.toLowerCase();
  let matches = 0;
  let matchedWords = [];
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) {
      matches++;
      matchedWords.push(kw);
    }
  }
  return { matches, matchedWords };
}

// ============================================================
// AI CONFLICT ANALYSIS
// ============================================================
async function analyzeConflict(text, sender, groupName, settings) {
  const threshold = THRESHOLDS[settings.sensitivity] || THRESHOLDS.medium;

  try {
    const prompt = `Analyze this WhatsApp group message for conflict/tension indicators.

Rate the tension level from 0-100 where:
- 0-20: Normal/friendly conversation
- 21-40: Mild disagreement, debate (healthy)
- 41-60: Heated argument, sarcasm, passive-aggressive
- 61-80: Direct insult, provocation, bullying
- 81-100: Severe conflict, threats, hate speech, potential violence

MESSAGE: "${text.slice(0, 500)}"
SENDER: ${sender || "unknown"}
GROUP: ${groupName || "unknown"}

Respond in EXACTLY this JSON format (no other text):
{"tension":0-100,"type":"none|debate|argument|insult|bullying|threat|hate","is_escalating":true|false,"reason":"brief"}`;

    const result = await callAI(prompt, {
      systemPrompt: "You are a WhatsApp group conflict analysis AI. Detect tension, arguments, bullying, and escalating conflicts. Consider Indonesian slang, mixed language, and cultural context. Be objective. Respond ONLY in JSON.",
      temperature: 0.2,
      maxTokens: 200,
      apiKey: config.aiHelp?.openaiApiKey || "",
      apiEndpoint: config.aiHelp?.apiEndpoint || "",
      providerKey: "openai",
      model: config.aiHelp?.model || "gpt-4o-mini",
    });

    let parsed;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }

    return {
      tension: Math.min(100, Math.max(0, parseInt(parsed.tension) || 0)),
      type: parsed.type || "none",
      isEscalating: parsed.is_escalating || false,
      reason: parsed.reason || "",
    };
  } catch (e) {
    console.error("[autoconflict] AI analyze error:", e.message);
    return null;
  }
}

// ============================================================
// AI GENERATE DE-ESCALATION MESSAGE
// ============================================================
async function generateIntervention(groupName, tensionLevel, conflictType, recentMessages, settings) {
  const styleGuide = {
    calm: "Tenang, netral, bijaksana. Jabarkan dengan logis tanpa menyalahkan siapapun. Sapa semua pihak dengan hormat.",
    humor: "Rileks, pakai humor/light joke untuk meredakan tension. Jangan menyindir, buat mereka tersenyum.",
    fact: "Berikan fakta netral dan objektif. Bawa konversasi ke topik yang konstruktif. Hindari emosi.",
  };

  const styleText = styleGuide[settings.style] || styleGuide.calm;

  try {
    const prompt = `Generate a SHORT de-escalation message for a WhatsApp group conflict.

Group: ${groupName}
Tension Level: ${tensionLevel}/100
Conflict Type: ${conflictType}
Recent messages context:
${recentMessages.map((m) => `${m.sender}: "${m.text}"`).join("\n")}

Style: ${styleText}

Rules:
- MAX 2-3 lines, very short
- Bahasa Indonesia
- Jangan menyalahkan siapapun
- Jangan gunakan emoji berlebihan (max 2)
- Jangan gunakan markdown
- Tujuan: redakan tension, alihkan ke topik positif
- Jangan kaku seperti robot`;

    const result = await callAI(prompt, {
      systemPrompt: "You are a peacemaker AI for WhatsApp groups. Generate short, natural de-escalation messages in Indonesian. Be warm but neutral.",
      temperature: 0.8,
      maxTokens: 150,
      apiKey: config.aiHelp?.openaiApiKey || "",
      apiEndpoint: config.aiHelp?.apiEndpoint || "",
      providerKey: "openai",
      model: config.aiHelp?.model || "gpt-4o-mini",
    });

    if (result && result.trim().length > 5) {
      return result.trim();
    }
    return null;
  } catch (e) {
    console.error("[autoconflict] AI intervention error:", e.message);
    return null;
  }
}

// ============================================================
// FALLBACK DE-ESCALATION
// ============================================================
const FALLBACK_MESSAGES = [
  "Eh guys, tenang dulu yuk. Kita semua di sini buat santai, bukan buat ribut.",
  "Hmm, kayaknya lagi panas nih. Break dulu sebentar, tarik napas, lanjut damai ya.",
  "Guys, jangan sampai emosi mengambil alih. Kita bisa beda pendapat tanpa harus ribut.",
  "Waduh, slow down dulu. Ngobrol santai aja, jangan diambil hati.",
  "Eh, inget ya — di grup ini kita keluarga. Beda pendapat itu wajar, santai aja.",
];

function getFallbackIntervention() {
  return FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
}

// ============================================================
// MAIN: processMessage — dipanggil di handler untuk setiap pesan grup
// ============================================================
export async function processConflictMessage(m, sock) {
  const settings = getSettings();
  if (!settings.enabled) return;

  // Hanya proses pesan grup
  if (!m.isGroup || m.fromMe) return;

  const groupJid = m.chat;
  const text = m.text || m.body || "";
  if (!text || text.length < 3) return;

  // Cek grup aktif
  if (settings.activeGroups.length > 0 && !settings.activeGroups.includes(groupJid)) return;

  // Skip commands
  const prefix = config.command?.prefix || ".";
  if (text.startsWith(prefix)) return;

  const threshold = THRESHOLDS[settings.sensitivity] || THRESHOLDS.medium;
  const groupName = m.groupName || m.metadata?.subject || "Grup";
  const sender = (m.sender || "").split("@")[0];

  // Init group tension state
  if (!settings.groupTension[groupJid]) {
    settings.groupTension[groupJid] = {
      level: 0,
      peak: 0,
      lastMessage: null,
      lastIntervention: 0,
      messageBuffer: [], // last N messages for context
      conflictActive: false,
      conflictStartTime: null,
    };
  }
  const gt = settings.groupTension[groupJid];

  // Decay tension over time (jika tidak ada pesan dalam 2 menit, decay)
  const now = Date.now();
  if (gt.lastMessage && now - gt.lastMessage > 120000) {
    gt.level = Math.max(0, gt.level - threshold.decay * 3);
  }
  gt.lastMessage = now;

  // Add to message buffer (keep last 10)
  gt.messageBuffer.push({ sender, text: text.slice(0, 200), time: now });
  if (gt.messageBuffer.length > 10) gt.messageBuffer.shift();

  // Step 1: Quick keyword check
  const kwCheck = detectConflictKeywords(text, settings.conflictKeywords);
  let quickTension = 0;
  if (kwCheck.matches > 0) {
    quickTension = Math.min(50, kwCheck.matches * 15);
  }

  // Step 2: AI analysis (setiap 3 pesan atau jika keyword detected)
  let aiResult = null;
  const shouldAnalyze = kwCheck.matches > 0 || gt.messageBuffer.length % 3 === 0;

  if (shouldAnalyze) {
    aiResult = await analyzeConflict(text, sender, groupName, settings);
  }

  // Calculate tension
  let newTension = gt.level;

  if (aiResult) {
    settings.stats.totalAnalyzed++;
    // Blend: AI tension + keyword quick check
    newTension = Math.max(aiResult.tension, quickTension);

    // Jika escalating, tambah tension
    if (aiResult.isEscalating) {
      newTension = Math.min(100, newTension + 10);
    }

    // Update conflict type tracking
    if (aiResult.type !== "none" && aiResult.tension > threshold.warn) {
      gt.conflictActive = true;
      if (!gt.conflictStartTime) gt.conflictStartTime = now;

      // Add to history
      settings.history.push({
        group: groupName,
        groupJid,
        sender,
        tension: newTension,
        type: aiResult.type,
        reason: aiResult.reason,
        timestamp: new Date().toISOString(),
      });
      if (settings.history.length > 30) settings.history.shift();

      settings.stats.totalConflicts++;
      settings.stats.lastConflict = new Date().toISOString();

      if (!settings.stats.byGroup[groupJid]) {
        settings.stats.byGroup[groupJid] = { conflicts: 0, interventions: 0, peak: 0 };
      }
      settings.stats.byGroup[groupJid].conflicts++;
      settings.stats.byGroup[groupJid].peak = Math.max(settings.stats.byGroup[groupJid].peak, newTension);
    }
  } else {
    // Tanpa AI, pakai keyword check saja
    newTension = Math.max(0, Math.min(100, gt.level * 0.8 + quickTension * 0.5));
  }

  // Smooth update
  gt.level = Math.round(newTension);
  gt.peak = Math.max(gt.peak, gt.level);

  // Step 3: Check if intervention needed
  const needsIntervention = gt.level >= threshold.critical;
  const cooldownMs = settings.cooldownMinutes * 60 * 1000;
  const inCooldown = now - gt.lastIntervention < cooldownMs;

  if (needsIntervention && !inCooldown) {
    gt.lastIntervention = now;
    settings.stats.totalInterventions++;

    // Generate intervention message
    let interventionMsg = null;
    const recentMsgs = gt.messageBuffer.slice(-5);
    interventionMsg = await generateIntervention(groupName, gt.level, aiResult?.type || "argument", recentMsgs, settings);

    if (!interventionMsg) {
      interventionMsg = getFallbackIntervention();
    } else {
      settings.stats.totalDeEscalated++;
    }

    // Kirim intervensi
    try {
      await sock.sendMessage(groupJid, { text: interventionMsg });
    } catch (e) {
      console.error("[autoconflict] send intervention error:", e.message);
    }

    // Notifikasi owner jika critical
    if (settings.notifyOwner && gt.level >= 85) {
      try {
        const ownerNum = config.owner?.number?.[0];
        if (ownerNum) {
          const ownerJid = ownerNum.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
          const notifyMsg =
            "" +
            `Grup: ${groupName}\n` +
            `Tension: ${gt.level}/100\n` +
            `Type: ${aiResult?.type || "unknown"}\n` +
            `Intervention: ${interventionMsg ? "AI" : "Fallback"}\n` +
            "";
          await sock.sendMessage(ownerJid, { text: notifyMsg });
        }
      } catch {}
    }

    // Decay tension after intervention
    gt.level = Math.max(0, gt.level - 20);
  }

  // Reset conflict state jika tension turun
  if (gt.level < threshold.warn && gt.conflictActive) {
    gt.conflictActive = false;
    gt.conflictStartTime = null;
  }

  getDatabase().db.write();
}

// ============================================================
// HANDLER
// ============================================================
async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const settings = getSettings();
    const db = getDatabase();
    const arg = (m.text || "").trim();
    const args = arg.split(/\s+/).filter(Boolean);
    const sub = (args[0] || "").toLowerCase();

    // ─── DASHBOARD ───
    if (!sub) {
      const status = settings.enabled ? "ON" : "OFF";
      const threshold = THRESHOLDS[settings.sensitivity] || THRESHOLDS.medium;

      // Tension per group (top 5)
      const groupTensions = Object.entries(settings.groupTension)
        .sort((a, b) => b[1].level - a[1].level)
        .slice(0, 5)
        .map(([jid, gt]) => {
          const name = jid.slice(0, 20) + "...";
          return `| ${name} : ${gt.level}/100 (peak: ${gt.peak})`;
        })
        .join("\n") || "Belum ada data";

      await m.reply(novaBox("AUTO-CONFLICT DETECTOR", [
        `Status: ${status}`,
        `Sensitivity: ${settings.sensitivity} (warn: ${threshold.warn}, critical: ${threshold.critical})`,
        `Style: ${settings.style}`,
        `Cooldown: ${settings.cooldownMinutes} menit`,
        `Notify Owner: ${settings.notifyOwner ? "ON" : "OFF"}`,
        `Active Groups: ${settings.activeGroups.length === 0 ? "Semua" : settings.activeGroups.length}`,
        `Keywords: ${settings.conflictKeywords.length}`,
        "---",
        `Stats:`,
        `| Analyzed: ${settings.stats.totalAnalyzed}`,
        `| Conflicts: ${settings.stats.totalConflicts}`,
        `| Interventions: ${settings.stats.totalInterventions}`,
        `| De-escalated: ${settings.stats.totalDeEscalated}`,
        "---",
        `Tension per Group:`,
        groupTensions,
      ]) + "\n\n" + novaBox("COMMANDS", [
        `${prefix}autoconflict on/off`,
        `${prefix}autoconflict sensitivity <low/medium/high>`,
        `${prefix}autoconflict style <calm/humor/fact>`,
        `${prefix}autoconflict cooldown <menit>`,
        `${prefix}autoconflict notify on/off`,
        `${prefix}autoconflict addgc/delgc <gid>`,
        `${prefix}autoconflict status`,
        `${prefix}autoconflict history`,
        `${prefix}autoconflict addword/delword <kata>`,
        `${prefix}autoconflict reset`,
      ]));
      return { handled: true };
    }

    // ─── ON ───
    if (sub === "on") {
      settings.enabled = true;
      db.db.write();
      await m.reply(novaBox("AUTO-CONFLICT DETECTOR", [
        "Status: ON",
        "AI akan deteksi konflik & auto-intervensi",
        `Sensitivity: ${settings.sensitivity}`,
        `Style: ${settings.style}`,
      ]));
      return { handled: true };
    }

    // ─── OFF ───
    if (sub === "off") {
      settings.enabled = false;
      db.db.write();
      await m.reply(novaBox("AUTO-CONFLICT DETECTOR", ["Status: OFF"]));
      return { handled: true };
    }

    // ─── SENSITIVITY ───
    if (sub === "sensitivity") {
      const level = (args[1] || "").toLowerCase();
      if (!["low", "medium", "high"].includes(level)) {
        await m.reply(novaBox("AUTO-CONFLICT DETECTOR", [
          `Current: ${settings.sensitivity}`,
          "Pilihan: low, medium, high",
          `Ketik: ${prefix}autoconflict sensitivity <level>`,
          "",
          "low = trigger di tension 65+",
          "medium = trigger di tension 50+",
          "high = trigger di tension 35+",
        ]));
        return { handled: true };
      }
      settings.sensitivity = level;
      db.db.write();
      const t = THRESHOLDS[level];
      await m.reply(novaBox("AUTO-CONFLICT DETECTOR", [
        `Sensitivity: ${level}`,
        `Warn: ${t.warn} | Critical: ${t.critical}`,
      ]));
      return { handled: true };
    }

    // ─── STYLE ───
    if (sub === "style") {
      const style = (args[1] || "").toLowerCase();
      if (!["calm", "humor", "fact"].includes(style)) {
        await m.reply(novaBox("AUTO-CONFLICT DETECTOR", [
          `Current: ${settings.style}`,
          "Pilihan: calm, humor, fact",
          `Ketik: ${prefix}autoconflict style <calm/humor/fact>`,
          "",
          "calm = tenang & bijaksana",
          "humor = rilex & light joke",
          "fact = fakta netral & objektif",
        ]));
        return { handled: true };
      }
      settings.style = style;
      db.db.write();
      await m.reply(novaBox("AUTO-CONFLICT DETECTOR", [`Style: ${style}`]));
      return { handled: true };
    }

    // ─── COOLDOWN ───
    if (sub === "cooldown") {
      const mins = parseInt(args[1]);
      if (!mins || mins < 1) {
        await m.reply(novaBox("AUTO-CONFLICT DETECTOR", [
          `Current: ${settings.cooldownMinutes} menit`,
          `Ketik: ${prefix}autoconflict cooldown <menit>`,
        ]));
        return { handled: true };
      }
      settings.cooldownMinutes = mins;
      db.db.write();
      await m.reply(novaBox("AUTO-CONFLICT DETECTOR", [`Cooldown: ${mins} menit`]));
      return { handled: true };
    }

    // ─── NOTIFY ───
    if (sub === "notify") {
      const val = (args[1] || "").toLowerCase();
      if (!["on", "off"].includes(val)) {
        await m.reply(novaBox("AUTO-CONFLICT DETECTOR", [
          `Current: ${settings.notifyOwner ? "ON" : "OFF"}`,
          `Ketik: ${prefix}autoconflict notify on/off`,
        ]));
        return { handled: true };
      }
      settings.notifyOwner = val === "on";
      db.db.write();
      await m.reply(novaBox("AUTO-CONFLICT DETECTOR", [`Notify Owner: ${val.toUpperCase()}`]));
      return { handled: true };
    }

    // ─── ADDGC / DELGC ───
    if (sub === "addgc" || sub === "delgc") {
      const gid = args[1] || m.chat;
      if (sub === "addgc") {
        if (!settings.activeGroups.includes(gid)) {
          settings.activeGroups.push(gid);
          db.db.write();
        }
        await m.reply(novaBox("AUTO-CONFLICT DETECTOR", [`Grup ditambah: ${gid}`, `Total: ${settings.activeGroups.length}`]));
      } else {
        settings.activeGroups = settings.activeGroups.filter((g) => g !== gid);
        db.db.write();
        await m.reply(novaBox("AUTO-CONFLICT DETECTOR", [`Grup dihapus: ${gid}`, `Total: ${settings.activeGroups.length}`]));
      }
      return { handled: true };
    }

    // ─── STATUS (tension per group) ───
    if (sub === "status") {
      const groups = Object.entries(settings.groupTension)
        .sort((a, b) => b[1].level - a[1].level);

      if (groups.length === 0) {
        await m.reply(novaBox("AUTO-CONFLICT DETECTOR", ["Belum ada data tension"]));
        return { handled: true };
      }

      const lines = groups.map(([jid, gt]) => {
        const bar = "█".repeat(Math.floor(gt.level / 10)) + "░".repeat(10 - Math.floor(gt.level / 10));
        const status = gt.level >= 75 ? "CRITICAL" : gt.level >= 50 ? "WARN" : gt.level >= 20 ? "MILD" : "SAFE";
        return `| ${jid.slice(0, 15)}... ${bar} ${gt.level}/100 [${status}]`;
      });

      await m.reply(novaBox("TENSION STATUS", lines));
      return { handled: true };
    }

    // ─── HISTORY ───
    if (sub === "history") {
      if (settings.history.length === 0) {
        await m.reply(novaBox("AUTO-CONFLICT DETECTOR", ["History: kosong"]));
        return { handled: true };
      }
      const recent = settings.history.slice(-15).reverse();
      const lines = recent.map((h) => {
        const time = new Date(h.timestamp).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
        return `| ${h.sender} [${h.tension}] ${h.type} — ${h.group} ${time}`;
      });
      await m.reply(novaBox("CONFLICT HISTORY", lines));
      return { handled: true };
    }

    // ─── ADDWORD / DELWORD ───
    if (sub === "addword" || sub === "delword") {
      const word = args.slice(1).join(" ").toLowerCase();
      if (!word) {
        await m.reply(novaBox("AUTO-CONFLICT DETECTOR", [
          `Ketik: ${prefix}autoconflict ${sub} <kata>`,
        ]));
        return { handled: true };
      }
      if (sub === "addword") {
        if (!settings.conflictKeywords.includes(word)) {
          settings.conflictKeywords.push(word);
          db.db.write();
        }
        await m.reply(novaBox("AUTO-CONFLICT DETECTOR", [`Keyword ditambah: ${word}`, `Total: ${settings.conflictKeywords.length}`]));
      } else {
        settings.conflictKeywords = settings.conflictKeywords.filter((w) => w !== word);
        db.db.write();
        await m.reply(novaBox("AUTO-CONFLICT DETECTOR", [`Keyword dihapus: ${word}`, `Total: ${settings.conflictKeywords.length}`]));
      }
      return { handled: true };
    }

    // ─── RESET ───
    if (sub === "reset") {
      settings.groupTension = {};
      settings.stats = {
        totalAnalyzed: 0,
        totalConflicts: 0,
        totalInterventions: 0,
        totalDeEscalated: 0,
        totalFalseAlarm: 0,
        byGroup: {},
        lastConflict: null,
      };
      settings.history = [];
      db.db.write();
      await m.reply(novaBox("AUTO-CONFLICT DETECTOR", ["Tension, stats & history direset"]));
      return { handled: true };
    }

    // ─── UNKNOWN ───
    await m.reply(novaBox("AUTO-CONFLICT DETECTOR", [`Command tidak dikenal: ${sub}`, `Ketik ${prefix}autoconflict untuk dashboard`]));
    return { handled: true };

  } catch (error) {
    console.error("[autoconflict] handler error:", error.message);
    await m.reply(novaError("AutoConflict", "Gagal nih, coba lagi ya"));
    return { handled: true };
  }
}

// ============================================================
// EXPORT
// ============================================================
export { pluginConfig as config, handler };
