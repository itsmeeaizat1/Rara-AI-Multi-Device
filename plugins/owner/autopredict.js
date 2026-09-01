// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .autopredict — Auto-Predictive Insights
 *
 * Fitur automation "bot masa depan" #1:
 * - Analisis pola aktivitas grup 7 hari terakhir, prediksi tren minggu depan
 * - AI-powered prediction: siapa yang mungkin inactive, topik yang naik, jam tersibuk
 * - Engagement forecast: naik/turun/stabil berdasarkan trend
 * - Churn risk score per member (high/medium/low)
 * - Topic trend detection (apa yang lagi ramai dibahas)
 * - Peak hour prediction untuk setiap grup
 * - Health score per grup (0-100)
 * - Auto kirim insight ke owner setiap Senin pagi
 * - Per-grup toggle, bisa juga generate on-demand
 * - Historical comparison (week over week)
 * - Actionable recommendations dari AI
 *
 * Commands:
 *   .autopredict                          — Dashboard status
 *   .autopredict on/off                   — Aktifkan/matikan
 *   .autopredict now [gid]                — Generate insight sekarang
 *   .autopredict group on/off              — Toggle per-grup
 *   .autopredict addgc <gid>              — Tambah grup ke monitoring
 *   .autopredict delgc <gid>              — Hapus grup dari monitoring
 *   .autopredict listgc                    — Lihat grup terdaftar
 *   .autopredict health [gid]             — Health score grup
 *   .autopredict churn [gid]              — Churn risk per member
 *   .autopredict trend [gid]              — Topic & engagement trend
 *   .autopredict peak [gid]               — Peak hour prediction
 *   .autopredict forecast [gid]           — Full AI forecast minggu depan
 *   .autopredict settime HH:MM            — Set jam auto-report Senin
 *   .autopredict reset                    — Reset data
 */

import { CronJob } from "cron";
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaBox, toSC } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import { getWeeklyStats, getLeaderboard } from "../../src/lib/nova-activity-tracker.js";
import config from "../../config.js";

const pluginConfig = {
  name: "autopredict",
  alias: ["autopredict", "predictinsight", "autopredictinsight", "autopredictive", "insightai"],
  category: "owner",
  description: "Auto-Predictive Insights — AI analisis pola grup & prediksi tren minggu depan",
  usage: ".autopredict <on/off/now/group/addgc/delgc/listgc/health/churn/trend/peak/forecast/settime/reset>",
  example: ".autopredict now",
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
// SETTINGS
// ============================================================
function getSettings() {
  const db = getDatabase();
  if (!db.db.data.automation) db.db.data.automation = {};
  if (!db.db.data.automation.autoPredict) {
    db.db.data.automation.autoPredict = {
      enabled: false,
      reportTime: "08:00",
      groups: [],
      groupSettings: {},
      lastReport: null,
      history: [],
      stats: {
        totalReports: 0,
        totalPredictions: 0,
        accuracyScore: null,
      },
    };
    db.db.write();
  }
  return db.db.data.automation.autoPredict;
}

// ============================================================
// CALCULATE HEALTH SCORE (0-100)
// ============================================================
function calculateHealthScore(stats) {
  if (!stats || stats.totalMembersTracked === 0) return 0;

  let score = 0;

  // 1. Active member ratio (0-30 points)
  const activeRatio = stats.totalMembersTracked > 0
    ? stats.activeMembers / stats.totalMembersTracked : 0;
  score += Math.round(activeRatio * 30);

  // 2. Message volume (0-25 points) — normalize: 100+ msgs/week = full
  const msgScore = Math.min(25, Math.round((stats.totalMessages / 100) * 25));
  score += msgScore;

  // 3. Command usage (0-15 points) — engagement via commands
  const cmdScore = Math.min(15, Math.round((stats.totalCommands / 50) * 15));
  score += cmdScore;

  // 4. Media contribution (0-10 points)
  const mediaScore = Math.min(10, Math.round((stats.totalMedia / 30) * 10));
  score += mediaScore;

  // 5. Points distribution (0-20 points) — members earning points = active ecosystem
  const pointScore = Math.min(20, Math.round((stats.totalPoints / 200) * 20));
  score += pointScore;

  return Math.min(100, score);
}

function healthLabel(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Moderate";
  if (score >= 20) return "Low";
  return "Critical";
}

// ============================================================
// CALCULATE CHURN RISK PER MEMBER
// ============================================================
function calculateChurnRisk(members) {
  if (!members || members.length === 0) return [];

  const now = Date.now();
  const WEEK = 7 * 24 * 60 * 60 * 1000;

  return members.map((m) => {
    const lastActive = m.lastActive ? new Date(m.lastActive).getTime() : 0;
    const daysSinceActive = lastActive > 0 ? (now - lastActive) / (24 * 60 * 60 * 1000) : 99;

    // Churn risk factors
    let riskScore = 0;

    // Days inactive (0-50 points)
    if (daysSinceActive > 7) riskScore += 50;
    else if (daysSinceActive > 5) riskScore += 35;
    else if (daysSinceActive > 3) riskScore += 20;
    else if (daysSinceActive > 1) riskScore += 10;

    // Low message count (0-30 points)
    if ((m.messageCount || 0) < 3) riskScore += 30;
    else if ((m.messageCount || 0) < 10) riskScore += 15;

    // Low command usage (0-20 points)
    if ((m.commandCount || 0) === 0) riskScore += 20;
    else if ((m.commandCount || 0) < 3) riskScore += 10;

    const level = riskScore >= 70 ? "high" : riskScore >= 40 ? "medium" : "low";

    return {
      jid: m.jid,
      name: m.name || m.jid?.split("@")[0],
      riskScore: Math.min(100, riskScore),
      level,
      daysInactive: Math.round(daysSinceActive),
      messageCount: m.messageCount || 0,
      commandCount: m.commandCount || 0,
      lastActive: m.lastActive,
    };
  }).sort((a, b) => b.riskScore - a.riskScore);
}

// ============================================================
// AI PREDICTION ENGINE
// ============================================================
async function generatePrediction(groupData) {
  try {
    const {
      groupName,
      stats,
      leaderboard,
      healthScore,
      churnRisks,
      previousWeek,
    } = groupData;

    const topMembers = leaderboard.slice(0, 5).map((m) =>
      `${m.name || m.jid?.split("@")[0]} (${m.points || 0}pts, ${m.messageCount || 0}msg)`
    ).join(", ");

    const highRisk = churnRisks.filter(c => c.level === "high").length;
    const medRisk = churnRisks.filter(c => c.level === "medium").length;
    const lowRisk = churnRisks.filter(c => c.level === "low").length;

    const prevMsgs = previousWeek?.totalMessages || 0;
    const msgTrend = prevMsgs > 0
      ? Math.round(((stats.totalMessages - prevMsgs) / prevMsgs) * 100)
      : 0;

    const prompt = `Analyze this WhatsApp group's weekly data and predict next week's trends.

GROUP: ${groupName}
WEEK DATA:
- Total messages: ${stats.totalMessages} (trend vs last week: ${msgTrend >= 0 ? "+" : ""}${msgTrend}%)
- Total commands: ${stats.totalCommands}
- Total media: ${stats.totalMedia}
- Active members: ${stats.activeMembers}/${stats.totalMembersTracked}
- Health score: ${healthScore}/100
- Top members: ${topMembers}
- Churn risk: ${highRisk} high, ${medRisk} medium, ${lowRisk} low

PREDICT:
1. Engagement forecast (naik/turun/stabil) with reasoning
2. Which members likely to go inactive
3. What topics/commands are trending up
4. Peak activity hours prediction
5. 2-3 actionable recommendations for group admin

Respond in Indonesian. Keep it concise (max 200 words). Be specific, not generic.`;

    const result = await callAI(prompt, {
      systemPrompt: "You are a WhatsApp group analytics AI. Analyze patterns and predict trends. Be specific and actionable. Respond in natural Indonesian.",
      temperature: 0.5,
      maxTokens: 500,
    });

    return result?.trim() || null;
  } catch (e) {
    console.error("[autopredict] generatePrediction error:", e.message);
    return null;
  }
}

// ============================================================
// GET FULL GROUP DATA
// ============================================================
async function getGroupInsights(sock, gid) {
  const stats = getWeeklyStats(gid);
  const leaderboard = getLeaderboard(gid, 20);
  const healthScore = calculateHealthScore(stats);
  const churnRisks = calculateChurnRisk(leaderboard);

  let groupName = "unknown";
  try {
    const meta = await sock.groupMetadata(gid);
    groupName = meta?.subject || "unknown";
  } catch {}

  // Get previous week from history
  const settings = getSettings();
  const prev = settings.history.find((h) => h.gid === gid);

  return {
    groupName,
    stats,
    leaderboard,
    healthScore,
    churnRisks,
    previousWeek: prev?.stats || null,
  };
}

// ============================================================
// BUILD INSIGHT REPORT
// ============================================================
async function buildInsightReport(sock, gid) {
  const data = await getGroupInsights(sock, gid);
  const { groupName, stats, leaderboard, healthScore, churnRisks } = data;

  // Churn summary
  const highRisk = churnRisks.filter((c) => c.level === "high");
  const medRisk = churnRisks.filter((c) => c.level === "medium");

  // AI prediction
  const prediction = await generatePrediction(data);

  // Save to history
  const settings = getSettings();
  settings.history = settings.history.filter((h) => h.gid !== gid);
  settings.history.push({
    gid,
    groupName,
    stats: { ...stats },
    healthScore,
    timestamp: new Date().toISOString(),
  });
  // Keep only last 50 entries
  if (settings.history.length > 50) settings.history = settings.history.slice(-50);
  getDatabase().db.write();

  const report = novaBox("PREDICTIVE INSIGHTS", [
    `Grup: ${groupName}`,
    `Health: ${healthScore}/100 (${healthLabel(healthScore)})`,
    "---",
    `Minggu Ini:`,
    `| Pesan: ${stats.totalMessages}`,
    `| Commands: ${stats.totalCommands}`,
    `| Media: ${stats.totalMedia}`,
    `| Aktif: ${stats.activeMembers}/${stats.totalMembersTracked}`,
    "---",
    `Churn Risk:`,
    `| High: ${highRisk.length} | Medium: ${medRisk.length}`,
    highRisk.length > 0
      ? `| Watch: ${highRisk.slice(0, 3).map((c) => c.name).join(", ")}`
      : "| No high-risk members",
    "---",
    `Top Members:`,
    `| ${leaderboard.slice(0, 3).map((m, i) => `${i + 1}. ${m.name || m.jid?.split("@")[0]} (${m.points || 0}pts)`).join("\n| ")}`,
  ]);

  if (prediction) {
    return report + "\n\n" + novaBox("AI PREDICTION — MINGGU DEPAN", [prediction]);
  }
  return report;
}

// ============================================================
// CRON: Weekly Report (Senin pagi)
// ============================================================
function startCronJob(sock) {
  if (cronJob) cronJob.stop();
  const settings = getSettings();
  const [hh, mm] = settings.reportTime.split(":").map(Number);

  // Senin = day 1 in cron
  cronJob = new CronJob(
    `0 ${mm} ${hh} * * 1`,
    async () => {
      try {
        const s = getSettings();
        if (!s.enabled || s.groups.length === 0) return;

        const ownerJid = config.owner?.[0];
        if (!ownerJid || !sock?.sendMessage) return;

        await sock.sendMessage(ownerJid, {
          text: novaBox("PREDICTIVE INSIGHTS", [
            "Weekly auto-report mulai...",
            `Grup: ${s.groups.length}`,
          ]),
        });

        for (const gid of s.groups) {
          try {
            const report = await buildInsightReport(sock, gid);
            await sock.sendMessage(ownerJid, { text: report });
            settings.stats.totalReports++;
            settings.stats.totalPredictions++;
            // Smart delay
            await new Promise((r) => setTimeout(r, 3000));
          } catch (e) {
            console.error("[autopredict] report error for", gid, e.message);
          }
        }

        s.lastReport = new Date().toISOString();
        getDatabase().db.write();

        await sock.sendMessage(ownerJid, {
          text: novaBox("PREDICTIVE INSIGHTS", ["Weekly report selesai."]),
        });
      } catch (e) {
        console.error("[autopredict] cron error:", e.message);
      }
    },
    null, true, "Asia/Jakarta"
  );
}

// ============================================================
// EXPORT: Start function
// ============================================================
export function startAutoPredict(sock) {
  const settings = getSettings();
  if (settings.enabled) {
    startCronJob(sock);
    console.log("[auto-predict] Started — weekly report every Monday at", settings.reportTime, "WIB");
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
      const msg = novaBox("AUTO-PREDICTIVE INSIGHTS", [
        `Status: ${status}`,
        `Report: Senin ${settings.reportTime} WIB`,
        `Grup monitored: ${settings.groups.length}`,
        `Last report: ${settings.lastReport || "Belum ada"}`,
        `Total reports: ${settings.stats.totalReports}`,
      ]);

      await m.reply(msg + "\n\n" + novaBox("COMMANDS", [
        `${prefix}autopredict on/off`,
        `${prefix}autopredict now [gid]`,
        `${prefix}autopredict addgc/delgc <gid>`,
        `${prefix}autopredict listgc`,
        `${prefix}autopredict health [gid]`,
        `${prefix}autopredict churn [gid]`,
        `${prefix}autopredict trend [gid]`,
        `${prefix}autopredict peak [gid]`,
        `${prefix}autopredict forecast [gid]`,
        `${prefix}autopredict settime HH:MM`,
        `${prefix}autopredict reset`,
      ]));
      return { handled: true };
    }

    // ─── ON ───
    if (sub === "on") {
      settings.enabled = true;
      db.db.write();
      if (cronJob) cronJob.stop();
      startCronJob(sock);
      await m.reply(novaBox("AUTO-PREDICT", [
        "Status: ON",
        "Auto-predictive insights aktif",
        `Report: Senin ${settings.reportTime} WIB`,
        `Grup monitored: ${settings.groups.length}`,
      ]));
      return { handled: true };
    }

    // ─── OFF ───
    if (sub === "off") {
      settings.enabled = false;
      db.db.write();
      if (cronJob) cronJob.stop();
      await m.reply(novaBox("AUTO-PREDICT", ["Status: OFF", "Auto-predictive insights dimatikan"]));
      return { handled: true };
    }

    // ─── NOW (Generate report) ───
    if (sub === "now") {
      const targetGid = args[1] || gid;
      if (!targetGid.endsWith("@g.us")) {
        await m.reply(novaBox("AUTO-PREDICT", ["Gunakan di grup atau ketik: .autopredict now <gid>"]));
        return { handled: true };
      }
      await m.reply(novaBox("AUTO-PREDICT", ["Menganalisis data grup & generating AI prediction..."]));
      const report = await buildInsightReport(sock, targetGid);
      settings.stats.totalReports++;
      settings.stats.totalPredictions++;
      db.db.write();
      await m.reply(report);
      return { handled: true };
    }

    // ─── ADD GROUP ───
    if (sub === "addgc") {
      const targetGid = args[1];
      if (!targetGid?.endsWith("@g.us")) {
        await m.reply(novaBox("AUTO-PREDICT", ["Format: .autopredict addgc <groupId>"]));
        return { handled: true };
      }
      if (!settings.groups.includes(targetGid)) {
        settings.groups.push(targetGid);
        db.db.write();
      }
      let gName = "unknown";
      try {
        const meta = await sock.groupMetadata(targetGid);
        gName = meta?.subject || "unknown";
      } catch {}
      await m.reply(novaBox("AUTO-PREDICT", [
        `Grup ditambah: ${gName}`,
        `Total monitored: ${settings.groups.length}`,
      ]));
      return { handled: true };
    }

    // ─── DEL GROUP ───
    if (sub === "delgc") {
      const targetGid = args[1];
      settings.groups = settings.groups.filter((g) => g !== targetGid);
      db.db.write();
      await m.reply(novaBox("AUTO-PREDICT", [
        `Grup dihapus: ${targetGid?.slice(0, 20)}...`,
        `Total monitored: ${settings.groups.length}`,
      ]));
      return { handled: true };
    }

    // ─── LIST GROUPS ───
    if (sub === "listgc") {
      if (settings.groups.length === 0) {
        await m.reply(novaBox("AUTO-PREDICT", ["Belum ada grup terdaftar", `Ketik: ${prefix}autopredict addgc <gid>`]));
        return { handled: true };
      }
      const list = await Promise.all(settings.groups.map(async (g, i) => {
        let name = g.slice(0, 20);
        try {
          const meta = await sock.groupMetadata(g);
          name = meta?.subject || name;
        } catch {}
        return `${i + 1}. ${name}`;
      }));
      await m.reply(novaBox("AUTO-PREDICT — GRUP MONITORED", [
        `Total: ${settings.groups.length}`,
        "---",
        list.join("\n"),
      ]));
      return { handled: true };
    }

    // ─── HEALTH SCORE ───
    if (sub === "health") {
      const targetGid = args[1] || gid;
      if (!targetGid.endsWith("@g.us")) {
        await m.reply(novaBox("AUTO-PREDICT", ["Gunakan di grup atau ketik: .autopredict health <gid>"]));
        return { handled: true };
      }
      const stats = getWeeklyStats(targetGid);
      const score = calculateHealthScore(stats);
      await m.reply(novaBox("PREDICT — HEALTH SCORE", [
        `Grup: ${targetGid.slice(0, 20)}...`,
        `Score: ${score}/100 (${healthLabel(score)})`,
        "---",
        `Breakdown:`,
        `| Pesan: ${stats.totalMessages} (cap 100)`,
        `| Aktif: ${stats.activeMembers}/${stats.totalMembersTracked}`,
        `| Commands: ${stats.totalCommands}`,
        `| Media: ${stats.totalMedia}`,
        `| Points: ${stats.totalPoints}`,
      ]));
      return { handled: true };
    }

    // ─── CHURN RISK ───
    if (sub === "churn") {
      const targetGid = args[1] || gid;
      if (!targetGid.endsWith("@g.us")) {
        await m.reply(novaBox("AUTO-PREDICT", ["Gunakan di grup atau ketik: .autopredict churn <gid>"]));
        return { handled: true };
      }
      const leaderboard = getLeaderboard(targetGid, 20);
      const risks = calculateChurnRisk(leaderboard);
      const high = risks.filter((r) => r.level === "high");
      const med = risks.filter((r) => r.level === "medium");

      const highList = high.slice(0, 5).map((r) =>
        `${r.name} (${r.riskScore}% — ${r.daysInactive}d inactive)`
      ).join("\n| ") || "Tidak ada";
      const medList = med.slice(0, 5).map((r) =>
        `${r.name} (${r.riskScore}%)`
      ).join("\n| ") || "Tidak ada";

      await m.reply(novaBox("PREDICT — CHURN RISK", [
        `Grup: ${targetGid.slice(0, 20)}...`,
        `High: ${high.length} | Medium: ${med.length} | Low: ${risks.length - high.length - med.length}`,
        "---",
        `High Risk:`,
        `| ${highList}`,
        "---",
        `Medium Risk:`,
        `| ${medList}`,
      ]));
      return { handled: true };
    }

    // ─── TREND ───
    if (sub === "trend") {
      const targetGid = args[1] || gid;
      if (!targetGid.endsWith("@g.us")) {
        await m.reply(novaBox("AUTO-PREDICT", ["Gunakan di grup atau ketik: .autopredict trend <gid>"]));
        return { handled: true };
      }
      const stats = getWeeklyStats(targetGid);
      const prev = settings.history.find((h) => h.gid === targetGid);
      const prevMsgs = prev?.stats?.totalMessages || 0;
      const trend = prevMsgs > 0
        ? Math.round(((stats.totalMessages - prevMsgs) / prevMsgs) * 100)
        : null;

      const trendIcon = trend === null ? "?" : trend > 5 ? "NAIK" : trend < -5 ? "TURUN" : "STABIL";

      await m.reply(novaBox("PREDICT — ENGAGEMENT TREND", [
        `Grup: ${targetGid.slice(0, 20)}...`,
        `Minggu ini: ${stats.totalMessages} pesan`,
        `Minggu lalu: ${prevMsgs} pesan`,
        `Trend: ${trendIcon} ${trend !== null ? `(${trend >= 0 ? "+" : ""}${trend}%)` : "(no data)"}`,
        "---",
        `Commands: ${stats.totalCommands} (prev: ${prev?.stats?.totalCommands || 0})`,
        `Media: ${stats.totalMedia} (prev: ${prev?.stats?.totalMedia || 0})`,
        `Active: ${stats.activeMembers} (prev: ${prev?.stats?.activeMembers || 0})`,
      ]));
      return { handled: true };
    }

    // ─── PEAK HOURS ───
    if (sub === "peak") {
      const targetGid = args[1] || gid;
      if (!targetGid.endsWith("@g.us")) {
        await m.reply(novaBox("AUTO-PREDICT", ["Gunakan di grup atau ketik: .autopredict peak <gid>"]));
        return { handled: true };
      }
      // Use activity tracker data if available
      const leaderboard = getLeaderboard(targetGid, 5);
      const stats = getWeeklyStats(targetGid);

      // Estimate peak hours from member lastActive distribution
      const hourMap = new Array(24).fill(0);
      leaderboard.forEach((m) => {
        if (m.lastActive) {
          const h = new Date(m.lastActive).getHours();
          hourMap[h]++;
        }
      });

      const top3 = hourMap
        .map((count, hour) => ({ hour, count }))
        .filter((h) => h.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      const peakList = top3.length > 0
        ? top3.map((t) => `${String(t.hour).padStart(2, "0")}:00 (${t.count} members active)`).join("\n| ")
        : "Belum cukup data";

      await m.reply(novaBox("PREDICT — PEAK HOURS", [
        `Grup: ${targetGid.slice(0, 20)}...`,
        `Active members: ${stats.activeMembers}`,
        "---",
        `Predicted peak:`,
        `| ${peakList}`,
      ]));
      return { handled: true };
    }

    // ─── FULL FORECAST ───
    if (sub === "forecast") {
      const targetGid = args[1] || gid;
      if (!targetGid.endsWith("@g.us")) {
        await m.reply(novaBox("AUTO-PREDICT", ["Gunakan di grup atau ketik: .autopredict forecast <gid>"]));
        return { handled: true };
      }
      await m.reply(novaBox("AUTO-PREDICT", ["Generating AI forecast..."]));
      const data = await getGroupInsights(sock, targetGid);
      const prediction = await generatePrediction(data);

      if (!prediction) {
        await m.reply(novaBox("AUTO-PREDICT", ["Gagal generate forecast. Coba lagi."]));
        return { handled: true };
      }

      const score = calculateHealthScore(data.stats);
      await m.reply(novaBox("PREDICT — AI FORECAST", [
        `Grup: ${data.groupName}`,
        `Health: ${score}/100 (${healthLabel(score)})`,
        `Active: ${data.stats.activeMembers}/${data.stats.totalMembersTracked}`,
        `Churn: ${data.churnRisks.filter(c => c.level === "high").length} high risk`,
        "---",
        prediction,
      ]));
      return { handled: true };
    }

    // ─── SET TIME ───
    if (sub === "settime") {
      const time = args[1];
      if (!time || !/^\d{2}:\d{2}$/.test(time)) {
        await m.reply(novaBox("AUTO-PREDICT", [
          `Report time: Senin ${settings.reportTime} WIB`,
          `Ketik: ${prefix}autopredict settime HH:MM`,
        ]));
        return { handled: true };
      }
      settings.reportTime = time;
      db.db.write();
      if (settings.enabled) {
        if (cronJob) cronJob.stop();
        startCronJob(sock);
      }
      await m.reply(novaBox("AUTO-PREDICT", [`Report time: Senin ${time} WIB`]));
      return { handled: true };
    }

    // ─── RESET ───
    if (sub === "reset") {
      settings.history = [];
      settings.stats = { totalReports: 0, totalPredictions: 0, accuracyScore: null };
      settings.lastReport = null;
      db.db.write();
      await m.reply(novaBox("AUTO-PREDICT", ["History & stats direset"]));
      return { handled: true };
    }

    // ─── UNKNOWN ───
    await m.reply(novaBox("AUTO-PREDICT", [
      `Command tidak dikenal: ${sub}`,
      `Ketik ${prefix}autopredict untuk dashboard`,
    ]));
    return { handled: true };

  } catch (error) {
    console.error("[autopredict] handler error:", error.message);
    await m.reply(novaError("AutoPredict", "Gagal nih, coba lagi ya"));
    return { handled: true };
  }
}

// ============================================================
// EXPORT
// ============================================================
export { pluginConfig as config, handler };
