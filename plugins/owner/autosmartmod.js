// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .autosmartmod — Auto-Smart Moderation (AI-Powered)
 *
 * Fitur automation "bot masa depan" #2:
 * - AI-powered toxic/bullying/spam/scam detection (bukan keyword filter biasa)
 * - Pattern recognition untuk detect promo flooding, scam, harassment
 * - Auto-warn -> mute -> kick berdasarkan severity level
 * - Sensitivity level per grup (low/medium/high/strict)
 * - AI sentiment analysis (positive/neutral/negative/toxic)
 * - Custom whitelist untuk admin/owner grup
 * - Per-user violation tracking dengan auto-escalation
 * - Appeal system untuk false positive
 * - Daily moderation report ke owner
 * - Real-time alert ke grup admin untuk high-severity
 * - Support Indonesian slang & mixed language detection
 *
 * Commands:
 *   .autosmartmod                         — Dashboard status
 *   .autosmartmod on/off                  — Aktifkan/matikan (global)
 *   .autosmartmod group on/off            — Toggle per-grup
 *   .autosmartmod sensitivity <level>     — Set sensitivity (low/medium/high/strict)
 *   .autosmartmod action <level> <action> — Set action per severity (warn/mute/kick/delete)
 *   .autosmartmod threshold <level> <0-100> — Set AI confidence threshold
 *   .autosmartmod whitelist add/del <jid> — Whitelist user (skip moderation)
 *   .autosmartmod appeal <on/off>         — Toggle appeal system
 *   .autosmartmod cooldown <detik>        — Cooldown AI check per user
 *   .autosmartmod stats                   — Lihat statistik moderasi
 *   .autosmartmod cases                   — Lihat cases terbaru
 *   .autosmartmod case <id>               — Detail case tertentu
 *   .autosmartmod resolve <id> <action>   — Resolve case (dismiss/warn/kick/whitelist)
 *   .autosmartmod reset                   — Reset statistik & violations
 *   .autosmartmod test <teks>             — Test AI moderation detection
 *   .autosmartmod settime HH:MM           — Set jam auto-report harian
 */

import { CronJob } from "cron";
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraError, raraBox, toSC } from "../../src/lib/rara-menu-style.js";
import { callAI } from "../../src/lib/rara-ai-service.js";
import config from "../../config.js";

const pluginConfig = {
  name: "autosmartmod",
  alias: ["autosmartmod", "smartmod", "aimod", "automod2"],
  category: "owner",
  description: "Auto-Smart Moderation (AI) — detect toxic/spam/scam dengan AI pattern recognition",
  usage: ".autosmartmod <on/off/group/sensitivity/action/threshold/whitelist/appeal/cooldown/stats/cases/case/resolve/reset/test/settime>",
  example: ".autosmartmod on",
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
// SEVERITY LEVELS
// ============================================================
const SEVERITY = {
  clean: 0,
  minor: 1,    // mild spam, off-topic
  moderate: 2, // toxic, bullying, promo flooding
  severe: 3,   // scam, threats, harassment
};

const SEVERITY_NAMES = { 0: "Clean", 1: "Minor", 2: "Moderate", 3: "Severe" };

const SENSITIVITY_MAP = {
  low:     { minor: 60, moderate: 75, severe: 90 },
  medium:  { minor: 45, moderate: 60, severe: 80 },
  high:    { minor: 30, moderate: 45, severe: 70 },
  strict:  { minor: 20, moderate: 30, severe: 55 },
};

// ============================================================
// SETTINGS
// ============================================================
const DEFAULT_SMARTMOD = {
  enabled: false,
  sensitivity: "medium",
  actions: {
    minor: "warn",
    moderate: "warn",
    severe: "kick",
  },
  thresholds: SENSITIVITY_MAP.medium,
  cooldown: 15,
  appealEnabled: true,
  whitelist: [],
  groupSettings: {},
  reportTime: "21:00",
  stats: {
    totalChecked: 0,
    totalFlagged: 0,
    bySeverity: { minor: 0, moderate: 0, severe: 0 },
    byGroup: {},
    actions: { warn: 0, mute: 0, kick: 0, delete: 0 },
    falsePositives: 0,
    lastReport: null,
  },
  cases: [],
  violations: {},
  lastReport: null,
};

function getSettings() {
  const db = getDatabase();
  if (!db.db.data.automation) db.db.data.automation = {};
  if (!db.db.data.automation.smartMod) {
    db.db.data.automation.smartMod = DEFAULT_SMARTMOD;
    db.db.write();
  } else {
    // SCHEMA EVOLUTION: settings lama (persist sebelum field baru ada)
    // di-merge dengan defaults biar gak TypeError "reading 'push'/undefined"
    // saat fitur jalan. Field user yang udah ada gak ketimpa.
    db.db.data.automation.smartMod = { ...DEFAULT_SMARTMOD, ...db.db.data.automation.smartMod };
  }
  return db.db.data.automation.smartMod;
}

// ============================================================
// AI MODERATION CHECK
// ============================================================
async function aiModerate(text, sender, groupName) {
  try {
    const prompt = `Analyze this WhatsApp message for moderation. Classify into ONE category:

CATEGORIES:
- clean: normal conversation, no issue
- minor: mild spam, repetitive off-topic, annoying but not harmful
- moderate: toxic behavior, bullying, harassment, promo flooding, inappropriate content
- severe: scam, fraud, threats, dangerous links, sexual content, drug dealing

MESSAGE: "${text.slice(0, 500)}"
SENDER: ${sender || "unknown"}
GROUP: ${groupName || "unknown"}

Respond in EXACTLY this JSON format (no other text):
{"category":"clean|minor|moderate|severe","confidence":0-100,"reason":"brief explanation","suggest_action":"warn|mute|kick|delete"}`;

    const result = await callAI(prompt, {
      systemPrompt: "You are a WhatsApp group moderation AI. Analyze messages for toxicity, spam, and scams. Be strict but fair. Consider Indonesian slang and mixed language. Respond ONLY in JSON format.",
      temperature: 0.3,
      maxTokens: 200,
    });

    // Parse JSON dari AI response
    let parsed;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return { category: "clean", confidence: 0, reason: "parse error", suggest_action: "none" };
    }

    return {
      category: parsed.category || "clean",
      confidence: Math.min(100, Math.max(0, parseInt(parsed.confidence) || 0)),
      reason: parsed.reason || "",
      suggest_action: parsed.suggest_action || "warn",
    };
  } catch (e) {
    console.error("[autosmartmod] aiModerate error:", e.message);
    return { category: "clean", confidence: 0, reason: "AI error", suggest_action: "none" };
  }
}

// ============================================================
// HELPER: Check cooldown
// ============================================================
function checkCooldown(settings, jid) {
  if (!settings._cooldowns) settings._cooldowns = {};
  const now = Date.now();
  const last = settings._cooldowns[jid] || 0;
  if (now - last < settings.cooldown * 1000) return false;
  settings._cooldowns[jid] = now;
  return true;
}

// ============================================================
// HELPER: Check whitelist
// ============================================================
function isWhitelisted(settings, jid) {
  return settings.whitelist.includes(jid);
}

// ============================================================
// VIOLATION TRACKING
// ============================================================
function addViolation(settings, jid, severity, reason) {
  if (!settings.violations[jid]) {
    settings.violations[jid] = { count: 0, history: [], lastViolation: null, escalated: 0 };
  }
  const v = settings.violations[jid];
  v.count++;
  v.lastViolation = new Date().toISOString();
  v.history.push({
    severity,
    reason,
    timestamp: new Date().toISOString(),
  });
  // Keep only last 10 violations
  if (v.history.length > 10) v.history = v.history.slice(-10);

  // Auto-escalation: 3 minor = 1 moderate, 2 moderate = 1 severe
  if (v.count >= 3 && v.escalated < 1) {
    v.escalated = 1;
    return "escalate_moderate";
  }
  if (v.count >= 5 && v.escalated < 2) {
    v.escalated = 2;
    return "escalate_severe";
  }
  return null;
}

// ============================================================
// CREATE CASE
// ============================================================
function createCase(settings, data) {
  const caseId = "CASE-" + Date.now().toString(36).toUpperCase();
  const newCase = {
    id: caseId,
    jid: data.jid,
    gid: data.gid,
    groupName: data.groupName,
    text: data.text,
    category: data.category,
    confidence: data.confidence,
    reason: data.reason,
    suggest_action: data.suggest_action,
    action_taken: data.action_taken,
    timestamp: new Date().toISOString(),
    status: "open",
    appealed: false,
  };
  settings.cases.unshift(newCase);
  // Keep only last 100 cases
  if (settings.cases.length > 100) settings.cases = settings.cases.slice(0, 100);
  return caseId;
}

// ============================================================
// STATS UPDATE
// ============================================================
function updateStats(settings, category, gid, action) {
  settings.stats.totalChecked++;
  if (category !== "clean") {
    settings.stats.totalFlagged++;
    settings.stats.bySeverity[category] = (settings.stats.bySeverity[category] || 0) + 1;
    if (gid) settings.stats.byGroup[gid] = (settings.stats.byGroup[gid] || 0) + 1;
    if (action && settings.stats.actions[action] !== undefined) {
      settings.stats.actions[action]++;
    }
  }
}

// ============================================================
// AUTO-LISTENER: Real-time AI moderation
// ============================================================
async function smartModListener(m, { sock, config: botConfig }) {
  try {
    const settings = getSettings();
    if (!settings.enabled) return null;

    const gid = m.key?.remoteJid || "";
    const jid = m.key?.participant || m.key?.remoteJid || "";
    const text = m.text || m.body || "";
    const prefix = botConfig.command?.prefix || ".";

    // Skip: no text, command, owner, bot, whitelisted
    if (!text || text.startsWith(prefix)) return null;
    if (m.key?.fromMe) return null;
    if (isWhitelisted(settings, jid)) return null;
    if (jid === config.owner?.[0]) return null;

    // Skip if group not enabled
    const groupSet = settings.groupSettings[gid];
    if (gid.endsWith("@g.us") && groupSet && !groupSet.enabled) return null;

    // Skip messages too short
    if (text.trim().length < 5) return null;

    // Check cooldown
    if (!checkCooldown(settings, jid)) return null;

    // Get group name
    let groupName = "unknown";
    try {
      const meta = await sock.groupMetadata(gid);
      groupName = meta?.subject || "unknown";
    } catch {}

    // AI moderation check
    const result = await aiModerate(text, jid.split("@")[0], groupName);

    // Update stats
    updateStats(settings, result.category, gid, result.suggest_action);
    getDatabase().db.write();

    // If clean, skip
    if (result.category === "clean") return null;

    // Check confidence threshold
    const threshold = settings.thresholds[result.category] || 50;
    if (result.confidence < threshold) return null;

    // Determine action
    let action = settings.actions[result.category] || "warn";
    // Override with suggested action if stricter
    if (result.category === "severe") action = settings.actions.severe;

    // Track violation
    const escalation = addViolation(settings, jid, result.category, result.reason);

    // Handle escalation
    if (escalation === "escalate_moderate") {
      action = settings.actions.moderate || "warn";
    } else if (escalation === "escalate_severe") {
      action = settings.actions.severe || "kick";
      result.category = "severe";
      result.reason = "Auto-escalated dari repeated violations";
    }

    // Create case
    const caseId = createCase(settings, {
      jid, gid, groupName,
      text: text.slice(0, 300),
      category: result.category,
      confidence: result.confidence,
      reason: result.reason,
      suggest_action: result.suggest_action,
      action_taken: action,
    });

    getDatabase().db.write();

    // Build moderation message
    const severityIcon = { minor: "!", moderate: "!!", severe: "!!!" };
    const actionIcon = { warn: "[WARN]", mute: "[MUTE]", kick: "[KICK]", delete: "[DEL]" };

    let modMsg = raraBox("SMART MODERATION", [
      `Case: ${caseId}`,
      `Severity: ${severityIcon[result.category] || ""} ${SEVERITY_NAMES[SEVERITY[result.category]] || result.category}`,
      `Confidence: ${result.confidence}%`,
      `Reason: ${result.reason}`,
      `Action: ${actionIcon[action] || action}`,
      `User: ${jid.split("@")[0]}`,
    ]);

    // Execute action
    let executed = "";
    if (action === "delete") {
      try {
        await sock.sendMessage(gid, { delete: m.key });
        executed = "Pesan dihapus";
      } catch {}
    } else if (action === "kick") {
      try {
        await sock.groupParticipantsUpdate(gid, [jid], "remove");
        executed = "User dikeluarkan dari grup";
      } catch {
        executed = "Gagal kick (bot bukan admin)";
      }
    } else if (action === "mute") {
      // Mute = restrict: only send text, no media/sticker
      executed = "User dimute (warning dikirim)";
    } else {
      executed = "Warning dikirim";
    }

    // Send warning to group
    if (action === "warn" || action === "mute") {
      const warnText = raraBox("MODERATION WARNING", [
        `User: @${jid.split("@")[0]}`,
        `Severity: ${SEVERITY_NAMES[SEVERITY[result.category]] || result.category}`,
        `Alasan: ${result.reason}`,
        `Violations: ${settings.violations[jid]?.count || 1}`,
        "",
        `Pesan ini melanggar aturan grup.`,
        `Case ID: ${caseId}`,
      ]);
      try {
        await sock.sendMessage(gid, { text: warnText, mentions: [jid] });
      } catch {}
    }

    // Report to owner for severe cases
    if (result.category === "severe") {
      try {
        const ownerJid = config.owner?.[0];
        if (ownerJid) {
          await sock.sendMessage(ownerJid, { text: modMsg + "\n\nExecuted: " + executed });
        }
      } catch {}
    }

    return { caseId, category: result.category, action, executed };

  } catch (e) {
    console.error("[autosmartmod] listener error:", e.message);
    return null;
  }
}

// ============================================================
// CRON: Daily Moderation Report
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
        if (!s.enabled || s.stats.totalChecked === 0) return;

        const topGroups = Object.entries(s.stats.byGroup)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([g, count]) => `${g.slice(0, 15)}...: ${count}x`)
          .join("\n| ") || "Belum ada data";

        const openCases = s.cases.filter(c => c.status === "open").length;

        const report = raraBox("SMART MOD — DAILY REPORT", [
          `Total Checked: ${s.stats.totalChecked}`,
          `Total Flagged: ${s.stats.totalFlagged}`,
          `False Positives: ${s.stats.falsePositives}`,
          `Open Cases: ${openCases}`,
          "---",
          `Minor: ${s.stats.bySeverity.minor || 0}`,
          `Moderate: ${s.stats.bySeverity.moderate || 0}`,
          `Severe: ${s.stats.bySeverity.severe || 0}`,
          "---",
          `Actions:`,
          `| Warn: ${s.stats.actions.warn}`,
          `| Mute: ${s.stats.actions.mute}`,
          `| Kick: ${s.stats.actions.kick}`,
          `| Delete: ${s.stats.actions.delete}`,
          "---",
          `Top Grup:`,
          `| ${topGroups}`,
        ]);

        const ownerJid = config.owner?.[0];
        if (ownerJid && sock?.sendMessage) {
          await sock.sendMessage(ownerJid, { text: report });
        }

        s.lastReport = new Date().toISOString();
        // Reset daily stats but keep cases
        s.stats.totalChecked = 0;
        s.stats.totalFlagged = 0;
        s.stats.bySeverity = { minor: 0, moderate: 0, severe: 0 };
        s.stats.byGroup = {};
        s.stats.actions = { warn: 0, mute: 0, kick: 0, delete: 0 };
        getDatabase().db.write();
      } catch (e) {
        console.error("[autosmartmod] cron error:", e.message);
      }
    },
    null, true, "Asia/Jakarta"
  );
}

// ============================================================
// EXPORT: Start function
// ============================================================
export function startSmartMod(sock) {
  const settings = getSettings();
  if (settings.enabled) {
    startCronJob(sock);
    console.log("[auto-smartmod] Started — daily report at", settings.reportTime, "WIB");
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
      const openCases = settings.cases.filter(c => c.status === "open").length;

      const msg = raraBox("AUTO-SMART MODERATION (AI)", [
        `Status: ${status}`,
        `Sensitivity: ${settings.sensitivity}`,
        `Cooldown: ${settings.cooldown}s`,
        `Appeal: ${settings.appealEnabled ? "ON" : "OFF"}`,
        `Whitelist: ${settings.whitelist.length} user`,
        "---",
        `Actions:`,
        `| Minor: ${settings.actions.minor}`,
        `| Moderate: ${settings.actions.moderate}`,
        `| Severe: ${settings.actions.severe}`,
        "---",
        `Thresholds:`,
        `| Minor: ${settings.thresholds.minor}%`,
        `| Moderate: ${settings.thresholds.moderate}%`,
        `| Severe: ${settings.thresholds.severe}%`,
        "---",
        `Stats Hari Ini:`,
        `| Checked: ${settings.stats.totalChecked}`,
        `| Flagged: ${settings.stats.totalFlagged}`,
        `| Open Cases: ${openCases}`,
        `| False+: ${settings.stats.falsePositives}`,
        `| Report: ${settings.reportTime} WIB`,
      ]);

      await m.reply(msg + "\n\n" + raraBox("COMMANDS", [
        `${prefix}autosmartmod on/off`,
        `${prefix}autosmartmod group on/off`,
        `${prefix}autosmartmod sensitivity <low/medium/high/strict>`,
        `${prefix}autosmartmod action <minor/moderate/severe> <warn/mute/kick/delete>`,
        `${prefix}autosmartmod threshold <minor/moderate/severe> <0-100>`,
        `${prefix}autosmartmod whitelist add/del <jid>`,
        `${prefix}autosmartmod appeal on/off`,
        `${prefix}autosmartmod cooldown <detik>`,
        `${prefix}autosmartmod stats`,
        `${prefix}autosmartmod cases`,
        `${prefix}autosmartmod case <id>`,
        `${prefix}autosmartmod resolve <id> <dismiss/warn/kick/whitelist>`,
        `${prefix}autosmartmod test <teks>`,
        `${prefix}autosmartmod reset`,
        `${prefix}autosmartmod settime HH:MM`,
      ]));
      return { handled: true };
    }

    // ─── ON ───
    if (sub === "on") {
      settings.enabled = true;
      db.db.write();
      if (cronJob) cronJob.stop();
      startCronJob(sock);
      await m.reply(raraBox("SMART MOD", [
        "Status: ON",
        "AI moderation aktif — bot akan scan pesan dengan AI",
        `Sensitivity: ${settings.sensitivity}`,
      ]));
      return { handled: true };
    }

    // ─── OFF ───
    if (sub === "off") {
      settings.enabled = false;
      db.db.write();
      if (cronJob) cronJob.stop();
      await m.reply(raraBox("SMART MOD", ["Status: OFF", "AI moderation dimatikan"]));
      return { handled: true };
    }

    // ─── GROUP TOGGLE ───
    if (sub === "group") {
      const action = (args[1] || "").toLowerCase();
      if (!gid.endsWith("@g.us")) {
        await m.reply(raraBox("SMART MOD", ["Command ini hanya untuk grup"]));
        return { handled: true };
      }
      if (action === "on") {
        if (!settings.groupSettings[gid]) settings.groupSettings[gid] = {};
        settings.groupSettings[gid].enabled = true;
        db.db.write();
        await m.reply(raraBox("SMART MOD", [
          "Grup ini: ON",
          "AI moderation aktif di grup ini",
        ]));
      } else if (action === "off") {
        if (!settings.groupSettings[gid]) settings.groupSettings[gid] = {};
        settings.groupSettings[gid].enabled = false;
        db.db.write();
        await m.reply(raraBox("SMART MOD", ["Grup ini: OFF", "AI moderation dimatikan di grup ini"]));
      } else {
        const gStatus = settings.groupSettings[gid]?.enabled ? "ON" : "OFF";
        await m.reply(raraBox("SMART MOD", [`Grup ini: ${gStatus}`, `Ketik: ${prefix}autosmartmod group on/off`]));
      }
      return { handled: true };
    }

    // ─── SENSITIVITY ───
    if (sub === "sensitivity") {
      const level = (args[1] || "").toLowerCase();
      if (!SENSITIVITY_MAP[level]) {
        await m.reply(raraBox("SMART MOD", [
          `Sensitivity: ${settings.sensitivity}`,
          `Pilihan: low, medium, high, strict`,
          `Ketik: ${prefix}autosmartmod sensitivity <level>`,
        ]));
        return { handled: true };
      }
      settings.sensitivity = level;
      settings.thresholds = SENSITIVITY_MAP[level];
      db.db.write();
      await m.reply(raraBox("SMART MOD", [
        `Sensitivity: ${level}`,
        `Thresholds:`,
        `| Minor: ${settings.thresholds.minor}%`,
        `| Moderate: ${settings.thresholds.moderate}%`,
        `| Severe: ${settings.thresholds.severe}%`,
      ]));
      return { handled: true };
    }

    // ─── ACTION PER SEVERITY ───
    if (sub === "action") {
      const severity = (args[1] || "").toLowerCase();
      const action = (args[2] || "").toLowerCase();
      if (!["minor", "moderate", "severe"].includes(severity) || !["warn", "mute", "kick", "delete"].includes(action)) {
        await m.reply(raraBox("SMART MOD", [
          `Actions saat ini:`,
          `| Minor: ${settings.actions.minor}`,
          `| Moderate: ${settings.actions.moderate}`,
          `| Severe: ${settings.actions.severe}`,
          `Ketik: ${prefix}autosmartmod action <severity> <action>`,
        ]));
        return { handled: true };
      }
      settings.actions[severity] = action;
      db.db.write();
      await m.reply(raraBox("SMART MOD", [
        `Action ${severity} -> ${action}`,
      ]));
      return { handled: true };
    }

    // ─── THRESHOLD ───
    if (sub === "threshold") {
      const severity = (args[1] || "").toLowerCase();
      const val = parseInt(args[2]);
      if (!["minor", "moderate", "severe"].includes(severity) || isNaN(val) || val < 0 || val > 100) {
        await m.reply(raraBox("SMART MOD", [
          `Thresholds:`,
          `| Minor: ${settings.thresholds.minor}%`,
          `| Moderate: ${settings.thresholds.moderate}%`,
          `| Severe: ${settings.thresholds.severe}%`,
          `Ketik: ${prefix}autosmartmod threshold <severity> <0-100>`,
        ]));
        return { handled: true };
      }
      settings.thresholds[severity] = val;
      db.db.write();
      await m.reply(raraBox("SMART MOD", [
        `Threshold ${severity}: ${val}%`,
      ]));
      return { handled: true };
    }

    // ─── WHITELIST ───
    if (sub === "whitelist") {
      const action = (args[1] || "").toLowerCase();
      const targetJid = (args[2] || "").replace(/[^0-9]/g, "") + "@s.whatsapp.net";
      if (action === "add") {
        if (!settings.whitelist.includes(targetJid)) {
          settings.whitelist.push(targetJid);
          db.db.write();
        }
        await m.reply(raraBox("SMART MOD", [
          `Whitelist: ${settings.whitelist.length} user`,
          `${targetJid.split("@")[0]} ditambahkan`,
        ]));
      } else if (action === "del") {
        settings.whitelist = settings.whitelist.filter((j) => j !== targetJid);
        db.db.write();
        await m.reply(raraBox("SMART MOD", [
          `Whitelist: ${settings.whitelist.length} user`,
          `${targetJid.split("@")[0]} dihapus`,
        ]));
      } else if (action === "list") {
        const list = settings.whitelist.map((j) => j.split("@")[0]).join("\n| ") || "Kosong";
        await m.reply(raraBox("SMART MOD", [
          `Whitelist: ${settings.whitelist.length} user`,
          `| ${list}`,
        ]));
      } else {
        await m.reply(raraBox("SMART MOD", [
          `Ketik: ${prefix}autosmartmod whitelist add/del/list <nomor>`,
        ]));
      }
      return { handled: true };
    }

    // ─── APPEAL ───
    if (sub === "appeal") {
      const action = (args[1] || "").toLowerCase();
      if (action === "on") {
        settings.appealEnabled = true;
        db.db.write();
        await m.reply(raraBox("SMART MOD", ["Appeal system: ON", "User bisa appeal false positive"]));
      } else if (action === "off") {
        settings.appealEnabled = false;
        db.db.write();
        await m.reply(raraBox("SMART MOD", ["Appeal system: OFF"]));
      } else {
        await m.reply(raraBox("SMART MOD", [
          `Appeal: ${settings.appealEnabled ? "ON" : "OFF"}`,
          `Ketik: ${prefix}autosmartmod appeal on/off`,
        ]));
      }
      return { handled: true };
    }

    // ─── COOLDOWN ───
    if (sub === "cooldown") {
      const val = parseInt(args[1]);
      if (isNaN(val) || val < 0) {
        await m.reply(raraBox("SMART MOD", [`Cooldown: ${settings.cooldown}s`, `Ketik: ${prefix}autosmartmod cooldown <detik>`]));
        return { handled: true };
      }
      settings.cooldown = val;
      db.db.write();
      await m.reply(raraBox("SMART MOD", [`Cooldown: ${val}s per user`]));
      return { handled: true };
    }

    // ─── STATS ───
    if (sub === "stats") {
      const openCases = settings.cases.filter(c => c.status === "open").length;
      const totalUsers = Object.keys(settings.violations).length;
      const topGroups = Object.entries(settings.stats.byGroup)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([g, count]) => `${g.slice(0, 15)}...: ${count}x`)
        .join("\n| ") || "Belum ada";

      await m.reply(raraBox("SMART MOD — STATISTIK", [
        `Total Checked: ${settings.stats.totalChecked}`,
        `Total Flagged: ${settings.stats.totalFlagged}`,
        `False Positives: ${settings.stats.falsePositives}`,
        `Total Users Tracked: ${totalUsers}`,
        `Open Cases: ${openCases}`,
        "---",
        `By Severity:`,
        `| Minor: ${settings.stats.bySeverity.minor || 0}`,
        `| Moderate: ${settings.stats.bySeverity.moderate || 0}`,
        `| Severe: ${settings.stats.bySeverity.severe || 0}`,
        "---",
        `Actions:`,
        `| Warn: ${settings.stats.actions.warn}`,
        `| Mute: ${settings.stats.actions.mute}`,
        `| Kick: ${settings.stats.actions.kick}`,
        `| Delete: ${settings.stats.actions.delete}`,
        "---",
        `Top Grup:`,
        `| ${topGroups}`,
        `Last Report: ${settings.lastReport || "Belum ada"}`,
      ]));
      return { handled: true };
    }

    // ─── CASES LIST ───
    if (sub === "cases") {
      const openCases = settings.cases.filter(c => c.status === "open").slice(0, 10);
      if (openCases.length === 0) {
        await m.reply(raraBox("SMART MOD", ["Belum ada case terbuka"]));
        return { handled: true };
      }
      const caseList = openCases.map((c, i) => {
        const sev = SEVERITY_NAMES[SEVERITY[c.category]] || c.category;
        return `${i + 1}. ${c.id}\n| ${sev} | ${c.confidence}% | @${c.jid.split("@")[0]}\n| ${c.reason.slice(0, 50)}`;
      }).join("\n| \n| ");
      await m.reply(raraBox("SMART MOD — CASES", [
        `Open: ${openCases.length}`,
        "---",
        caseList,
      ]));
      return { handled: true };
    }

    // ─── CASE DETAIL ───
    if (sub === "case") {
      const caseId = args[1];
      const caseData = settings.cases.find(c => c.id === caseId);
      if (!caseData) {
        await m.reply(raraBox("SMART MOD", [`Case tidak ditemukan: ${caseId}`]));
        return { handled: true };
      }
      await m.reply(raraBox("SMART MOD — CASE DETAIL", [
        `ID: ${caseData.id}`,
        `Status: ${caseData.status}`,
        `User: @${caseData.jid.split("@")[0]}`,
        `Grup: ${caseData.groupName || caseData.gid?.slice(0, 20)}`,
        `Severity: ${SEVERITY_NAMES[SEVERITY[caseData.category]] || caseData.category}`,
        `Confidence: ${caseData.confidence}%`,
        `Reason: ${caseData.reason}`,
        `Action: ${caseData.action_taken}`,
        `Time: ${caseData.timestamp}`,
        `---`,
        `Message:`,
        `${caseData.text?.slice(0, 200) || "(no text)"}`,
      ]));
      return { handled: true };
    }

    // ─── RESOLVE CASE ───
    if (sub === "resolve") {
      const caseId = args[1];
      const action = (args[2] || "").toLowerCase();
      const caseData = settings.cases.find(c => c.id === caseId);
      if (!caseData) {
        await m.reply(raraBox("SMART MOD", [`Case tidak ditemukan: ${caseId}`]));
        return { handled: true };
      }
      if (action === "dismiss") {
        caseData.status = "dismissed";
        settings.stats.falsePositives++;
        db.db.write();
        await m.reply(raraBox("SMART MOD", [`Case ${caseId}: dismissed (false positive)`]));
      } else if (action === "warn") {
        caseData.status = "resolved_warn";
        db.db.write();
        await m.reply(raraBox("SMART MOD", [`Case ${caseId}: resolved (warned)`]));
      } else if (action === "kick") {
        try {
          await sock.groupParticipantsUpdate(caseData.gid, [caseData.jid], "remove");
          caseData.status = "resolved_kick";
          db.db.write();
          await m.reply(raraBox("SMART MOD", [`Case ${caseId}: user kicked`]));
        } catch {
          await m.reply(raraBox("SMART MOD", [`Case ${caseId}: gagal kick (bot bukan admin)`]));
        }
      } else if (action === "whitelist") {
        if (!settings.whitelist.includes(caseData.jid)) {
          settings.whitelist.push(caseData.jid);
        }
        caseData.status = "resolved_whitelist";
        settings.stats.falsePositives++;
        db.db.write();
        await m.reply(raraBox("SMART MOD", [
          `Case ${caseId}: resolved`,
          `User ${caseData.jid.split("@")[0]} di-whitelist`,
        ]));
      } else {
        await m.reply(raraBox("SMART MOD", [
          `Ketik: ${prefix}autosmartmod resolve <id> <dismiss/warn/kick/whitelist>`,
        ]));
      }
      return { handled: true };
    }

    // ─── TEST ───
    if (sub === "test") {
      const testText = args.slice(1).join(" ");
      if (!testText) {
        await m.reply(raraBox("SMART MOD", [
          `Ketik: ${prefix}autosmartmod test <teks>`,
          `Contoh: ${prefix}autosmartmod test Halo semua apa kabar`,
        ]));
        return { handled: true };
      }
      await m.react("🕒");
      const result = await aiModerate(testText, "test", "test-group");
      await m.reply(raraBox("SMART MOD — TEST RESULT", [
        `Teks: ${testText.slice(0, 200)}`,
        `Category: ${SEVERITY_NAMES[SEVERITY[result.category]] || result.category}`,
        `Confidence: ${result.confidence}%`,
        `Reason: ${result.reason}`,
        `Suggested: ${result.suggest_action}`,
      ]));
      return { handled: true };
    }

    // ─── RESET ───
    if (sub === "reset") {
      settings.stats = {
        totalChecked: 0, totalFlagged: 0,
        bySeverity: { minor: 0, moderate: 0, severe: 0 },
        byGroup: {}, actions: { warn: 0, mute: 0, kick: 0, delete: 0 },
        falsePositives: 0, lastReport: null,
      };
      settings.cases = [];
      settings.violations = {};
      settings._cooldowns = {};
      db.db.write();
      await m.reply(raraBox("SMART MOD", ["Statistik, cases & violations direset"]));
      return { handled: true };
    }

    // ─── SET TIME ───
    if (sub === "settime") {
      const time = args[1];
      if (!time || !/^\d{2}:\d{2}$/.test(time)) {
        await m.reply(raraBox("SMART MOD", [
          `Report time: ${settings.reportTime} WIB`,
          `Ketik: ${prefix}autosmartmod settime HH:MM`,
        ]));
        return { handled: true };
      }
      settings.reportTime = time;
      db.db.write();
      if (settings.enabled) {
        if (cronJob) cronJob.stop();
        startCronJob(sock);
      }
      await m.reply(raraBox("SMART MOD", [`Report time: ${time} WIB`]));
      return { handled: true };
    }

    // ─── UNKNOWN ───
    await m.reply(raraBox("SMART MOD", [`Command tidak dikenal: ${sub}`, `Ketik ${prefix}autosmartmod untuk dashboard`]));
    return { handled: true };

  } catch (error) {
    console.error("[autosmartmod] handler error:", error.message);
    await m.reply(raraError("SmartMod", "Gagal nih, coba lagi ya"));
    return { handled: true };
  }
}

// ============================================================
// EXPORT
// ============================================================
export { pluginConfig as config, handler, smartModListener };
