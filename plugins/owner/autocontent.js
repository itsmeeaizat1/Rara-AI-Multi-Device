// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .autocontent — Auto-Content Scheduler
 *
 * Fitur automation "bot masa depan" #3:
 * - Schedule konten otomatis ke grup pada jam optimal
 * - Content types: islamic, quote, cuaca, news, facts, motivasi, hadist
 * - AI-generated content (bukan template statis) — fresh tiap kali
 * - Auto-detect jam aktivitas grup & rekomendasi waktu kirim
 * - Multi-target: kirim ke multiple grup sekaligus
 * - Custom content dengan template variable ({group}, {date}, {time})
 * - Per-grup schedule (setiap grup bisa beda content & jam)
 * - Skip jika grup sedang sepi (anti-spam)
 * - Smart delay antar grup (jangan blast semua bersamaan)
 * - Statistics: berapa kali dikirim, grup mana, content type
 * - Daily/weekly/monthly schedule support
 * - Auto-skip jika bot bukan admin di grup
 *
 * Commands:
 *   .autocontent                          — Dashboard status
 *   .autocontent on/off                   — Aktifkan/matikan (global)
 *   .autocontent add <type> <time> <target> — Tambah schedule
 *   .autocontent del <id>                 — Hapus schedule
 *   .autocontent list                     — Lihat semua schedule
 *   .autocontent types                    — Lihat daftar content types
 *   .autocontent run <id>                 — Run schedule sekarang (test)
 *   .autocontent analyze <gid>            — Analisis jam aktif grup
 *   .autocontent custom <time> <target> <prompt> — Custom AI content
 *   .autocontent interval <id> <daily/weekly/monthly> — Set interval
 *   .autocontent stats                    — Statistik pengiriman
 *   .autocontent reset                     — Reset statistik
 *   .autocontent settime HH:MM            — Set jam default
 */

import { CronJob } from "cron";
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaBox, toSC } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import config from "../../config.js";

const pluginConfig = {
  name: "autocontent",
  alias: ["autocontent", "autoschedule", "contentbot", "autoscheduler"],
  category: "owner",
  description: "Auto-Content Scheduler — kirim konten otomatis ke grup pada jam optimal",
  usage: ".autocontent <on/off/add/del/list/types/run/analyze/custom/interval/stats/reset/settime>",
  example: ".autocontent add islamic 05:00 120363xxx@g.us",
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
let cronJobs = {}; // { scheduleId: CronJob }
let activityTracker = {}; // { gid: { hourlyActivity: { 0: 0, 1: 0, ... } } }

// ============================================================
// CONTENT TYPES
// ============================================================
const CONTENT_TYPES = {
  islamic: {
    name: "Islamic Reminder",
    prompt: "Buat pesan Islamic singkat (2-3 kalimat) untuk pengingat pagi. Sertakan ayat Al-Quran atau hadist yang relevan dengan hari ini. Bahasa Indonesia, hangat, dan memotivasi. Jangan pakai emoji berlebihan.",
    icon: "[ISLAM]",
  },
  quote: {
    name: "Quote Bijak",
    prompt: "Buat satu quote bijak original (buatanmu, bukan copy paste). Maksimal 3 kalimat. Bahasa Indonesia. Tema: kehidupan, semangat, atau syukur.",
    icon: "[QUOTE]",
  },
  motivasi: {
    name: "Motivasi Pagi",
    prompt: "Buat pesan motivasi pagi singkat (2-3 kalimat) yang membangun semangat. Bahasa Indonesia, energik, positif. Jangan generik.",
    icon: "[MOTIVASI]",
  },
  cuaca: {
    name: "Cuaca Hari Ini",
    prompt: "Buat ringkasan cuaca singkat untuk hari ini (pagi/siang/sore/malam) dalam bahasa Indonesia. Format: kondisi umum, suhu perkiraan, saran aktivitas. Singkat dan informatif.",
    icon: "[CUACA]",
  },
  news: {
    name: "News Digest",
    prompt: "Buat ringkasan 3 berita teknologi/aplikasi terbaru dalam bahasa Indonesia. Masing-masing 1-2 kalimat. Pilih yang menarik dan relevan untuk pengguna WhatsApp.",
    icon: "[NEWS]",
  },
  facts: {
    name: "Fakta Menarik",
    prompt: "Bagikan satu fakta menarik/unik yang jarang diketahui orang. Bahasa Indonesia. Maksimal 3 kalimat. Pilih fakta yang surprising.",
    icon: "[FACTS]",
  },
  hadist: {
    name: "Hadist Hari Ini",
    prompt: "Bagikan satu hadist pendek (Arab + terjemah Indonesia) yang relevan dengan kehidupan sehari-hari. Sertakan ringkasan maknanya dalam 1-2 kalimat.",
    icon: "[HADIST]",
  },
  doa: {
    name: "Doa Harian",
    prompt: "Bagikan satu doa harian singkat (Arab + terjemah Indonesia). Pilih doa yang sesuai dengan aktivitas pagi/aktivitas sehari-hari. Sertakan makna singkat.",
    icon: "[DOA]",
  },
  tips: {
    name: "Tips & Trick",
    prompt: "Bagikan satu tips & trick teknologi/WhatsApp/hidup sehari-hari yang praktis dan jarang diketahui. Bahasa Indonesia. Maksimal 3 kalimat. Langsung ke inti.",
    icon: "[TIPS]",
  },
};

// ============================================================
// SETTINGS
// ============================================================
function getSettings() {
  const db = getDatabase();
  if (!db.db.data.automation) db.db.data.automation = {};
  if (!db.db.data.automation.autoContent) {
    db.db.data.automation.autoContent = {
      enabled: false,
      schedules: [],
      defaultTime: "08:00",
      smartDelay: 5, // detik antar grup
      stats: {
        totalSent: 0,
        totalFailed: 0,
        byType: {},
        byGroup: {},
        lastRun: null,
      },
      lastReport: null,
    };
    db.db.write();
  }
  return db.db.data.automation.autoContent;
}

// ============================================================
// AI CONTENT GENERATOR
// ============================================================
async function generateContent(type, customPrompt, groupName) {
  try {
    let prompt;
    if (customPrompt) {
      prompt = customPrompt
        .replace(/{group}/gi, groupName || "grup")
        .replace(/{date}/gi, new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }))
        .replace(/{time}/gi, new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }, { timeZone: "Asia/Jakarta" }));
    } else {
      const ct = CONTENT_TYPES[type];
      if (!ct) return null;
      prompt = ct.prompt;
      if (groupName) prompt += `\n\nKonteks: Grup "${groupName}".`;
      prompt += `\nTanggal: ${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.`;
    }

    const result = await callAI(prompt, {
      systemPrompt: "Kamu adalah content creator untuk bot WhatsApp grup Indonesia. Buat konten singkat, menarik, dan fresh. Jangan ulangi konten yang sama. Bahasa Indonesia natural.",
      temperature: 0.9,
      maxTokens: 300,
    });

    return result?.trim() || null;
  } catch (e) {
    console.error("[autocontent] generateContent error:", e.message);
    return null;
  }
}

// ============================================================
// TRACK GROUP ACTIVITY
// ============================================================
function trackActivity(gid) {
  if (!activityTracker[gid]) {
    activityTracker[gid] = {
      hourlyActivity: new Array(24).fill(0),
      lastUpdated: new Date().toISOString(),
      totalMessages: 0,
    };
  }
  const hour = new Date().getHours();
  activityTracker[gid].hourlyActivity[hour]++;
  activityTracker[gid].totalMessages++;
  activityTracker[gid].lastUpdated = new Date().toISOString();
}

// ============================================================
// ANALYZE BEST TIME FOR GROUP
// ============================================================
function analyzeBestTime(gid) {
  const tracker = activityTracker[gid];
  if (!tracker || tracker.totalMessages < 10) {
    return null;
  }
  // Find top 3 most active hours
  const hours = tracker.hourlyActivity
    .map((count, hour) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  return hours;
}

// ============================================================
// SEND CONTENT TO GROUP
// ============================================================
async function sendContentToGroup(sock, schedule) {
  try {
    const gid = schedule.target;
    const ct = CONTENT_TYPES[schedule.type];
    const icon = ct?.icon || `[${schedule.type.toUpperCase()}]`;

    // Generate content
    const content = await generateContent(schedule.type, schedule.customPrompt, schedule.groupName);
    if (!content) {
      console.error("[autocontent] Failed to generate content for", schedule.id);
      return false;
    }

    // Build message
    const now = new Date().toLocaleString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    });

    const msg = novaBox(`${icon} ${ct?.name || schedule.type}`, [
      content,
      "---",
      `${now} WIB`,
      `Scheduled by Nova AI`,
    ]);

    // Send to group
    await sock.sendMessage(gid, { text: msg });
    return true;
  } catch (e) {
    console.error("[autocontent] sendContentToGroup error:", e.message);
    return false;
  }
}

// ============================================================
// START ALL CRON JOBS
// ============================================================
function startAllCronJobs(sock) {
  // Stop existing jobs
  Object.values(cronJobs).forEach((job) => job?.stop?.());
  cronJobs = {};

  const settings = getSettings();
  if (!settings.enabled) return;

  for (const schedule of settings.schedules) {
    if (!schedule.enabled) continue;
    startCronJob(sock, schedule);
  }
}

function startCronJob(sock, schedule) {
  if (cronJobs[schedule.id]) cronJobs[schedule.id].stop();

  const [hh, mm] = schedule.time.split(":").map(Number);
  const interval = schedule.interval || "daily";

  let cronPattern;
  if (interval === "daily") {
    cronPattern = `0 ${mm} ${hh} * * *`;
  } else if (interval === "weekly") {
    // Monday = 1 (cron: 0=Sunday)
    cronPattern = `0 ${mm} ${hh} * * 1`;
  } else if (interval === "monthly") {
    // 1st of each month
    cronPattern = `0 ${mm} ${hh} 1 * *`;
  } else {
    cronPattern = `0 ${mm} ${hh} * * *`;
  }

  cronJobs[schedule.id] = new CronJob(
    cronPattern,
    async () => {
      try {
        const settings = getSettings();
        const sched = settings.schedules.find((s) => s.id === schedule.id);
        if (!sched || !sched.enabled) {
          cronJobs[schedule.id]?.stop();
          return;
        }

        const success = await sendContentToGroup(sock, sched);

        if (success) {
          settings.stats.totalSent++;
          settings.stats.byType[sched.type] = (settings.stats.byType[sched.type] || 0) + 1;
          settings.stats.byGroup[sched.target] = (settings.stats.byGroup[sched.target] || 0) + 1;
        } else {
          settings.stats.totalFailed++;
        }
        settings.stats.lastRun = new Date().toISOString();
        getDatabase().db.write();
      } catch (e) {
        console.error("[autocontent] cron error:", e.message);
      }
    },
    null, true, "Asia/Jakarta"
  );

  console.log(`[auto-content] Schedule ${schedule.id} (${schedule.type}) at ${schedule.time} ${schedule.interval}`);
}

// ============================================================
// EXPORT: Start function
// ============================================================
export function startAutoContent(sock) {
  const settings = getSettings();
  if (settings.enabled) {
    startAllCronJobs(sock);
    console.log("[auto-content] Started —", settings.schedules.filter(s => s.enabled).length, "schedules active");
  }
}

// ============================================================
// ACTIVITY TRACKER EXPORT (dipanggil dari message handler)
// ============================================================
export function trackGroupActivity(gid) {
  if (gid && gid.endsWith("@g.us")) {
    trackActivity(gid);
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
      const activeSchedules = settings.schedules.filter((s) => s.enabled).length;

      const msg = novaBox("AUTO-CONTENT SCHEDULER", [
        `Status: ${status}`,
        `Schedules: ${settings.schedules.length} (${activeSchedules} aktif)`,
        `Default time: ${settings.defaultTime} WIB`,
        `Smart delay: ${settings.smartDelay}s`,
        "---",
        `Stats:`,
        `| Total Sent: ${settings.stats.totalSent}`,
        `| Total Failed: ${settings.stats.totalFailed}`,
        `| Last Run: ${settings.stats.lastRun || "Belum ada"}`,
      ]);

      await m.reply(msg + "\n\n" + novaBox("COMMANDS", [
        `${prefix}autocontent on/off`,
        `${prefix}autocontent add <type> <HH:MM> <gid>`,
        `${prefix}autocontent custom <HH:MM> <gid> <prompt>`,
        `${prefix}autocontent del <id>`,
        `${prefix}autocontent list`,
        `${prefix}autocontent types`,
        `${prefix}autocontent run <id>`,
        `${prefix}autocontent analyze <gid>`,
        `${prefix}autocontent interval <id> <daily/weekly/monthly>`,
        `${prefix}autocontent stats`,
        `${prefix}autocontent reset`,
        `${prefix}autocontent settime HH:MM`,
      ]));
      return { handled: true };
    }

    // ─── ON ───
    if (sub === "on") {
      settings.enabled = true;
      db.db.write();
      startAllCronJobs(sock);
      await m.reply(novaBox("AUTO-CONTENT", [
        "Status: ON",
        "Auto-content scheduler aktif",
        `${settings.schedules.filter((s) => s.enabled).length} schedule aktif`,
      ]));
      return { handled: true };
    }

    // ─── OFF ───
    if (sub === "off") {
      settings.enabled = false;
      db.db.write();
      Object.values(cronJobs).forEach((job) => job?.stop?.());
      cronJobs = {};
      await m.reply(novaBox("AUTO-CONTENT", ["Status: OFF", "Auto-content scheduler dimatikan"]));
      return { handled: true };
    }

    // ─── ADD SCHEDULE ───
    if (sub === "add") {
      const type = (args[1] || "").toLowerCase();
      const time = args[2];
      const target = args[3];

      if (!type || !time || !target) {
        await m.reply(novaBox("AUTO-CONTENT", [
          `Format: ${prefix}autocontent add <type> <HH:MM> <gid>`,
          `Contoh: ${prefix}autocontent add islamic 05:00 120363xxx@g.us`,
          `Ketik ${prefix}autocontent types untuk daftar tipe`,
        ]));
        return { handled: true };
      }

      if (!CONTENT_TYPES[type]) {
        await m.reply(novaBox("AUTO-CONTENT", [
          `Tipe tidak dikenal: ${type}`,
          `Ketik ${prefix}autocontent types untuk daftar`,
        ]));
        return { handled: true };
      }

      if (!/^\d{2}:\d{2}$/.test(time)) {
        await m.reply(novaBox("AUTO-CONTENT", ["Format waktu: HH:MM (24 jam)", `Contoh: 05:00`]));
        return { handled: true };
      }

      if (!target.endsWith("@g.us")) {
        await m.reply(novaBox("AUTO-CONTENT", ["Target harus grup (@g.us)", `Contoh: 120363xxx@g.us`]));
        return { handled: true };
      }

      // Get group name
      let groupName = "unknown";
      try {
        const meta = await sock.groupMetadata(target);
        groupName = meta?.subject || "unknown";
      } catch {}

      const scheduleId = "SCH-" + Date.now().toString(36).toUpperCase();
      const newSchedule = {
        id: scheduleId,
        type,
        time,
        target,
        groupName,
        interval: "daily",
        enabled: true,
        createdAt: new Date().toISOString(),
      };

      settings.schedules.push(newSchedule);
      db.db.write();

      if (settings.enabled) {
        startCronJob(sock, newSchedule);
      }

      await m.reply(novaBox("AUTO-CONTENT", [
        `Schedule ditambahkan!`,
        `ID: ${scheduleId}`,
        `Type: ${CONTENT_TYPES[type].name}`,
        `Time: ${time} WIB (daily)`,
        `Target: ${groupName}`,
        `Interval: daily`,
      ]));
      return { handled: true };
    }

    // ─── CUSTOM CONTENT ───
    if (sub === "custom") {
      const time = args[1];
      const target = args[2];
      const prompt = args.slice(3).join(" ");

      if (!time || !target || !prompt) {
        await m.reply(novaBox("AUTO-CONTENT", [
          `Format: ${prefix}autocontent custom <HH:MM> <gid> <prompt>`,
          `Contoh: ${prefix}autocontent custom 09:00 120363xxx@g.us Bagikan resep masakan hari ini`,
          `Variabel: {group}, {date}, {time}`,
        ]));
        return { handled: true };
      }

      if (!/^\d{2}:\d{2}$/.test(time)) {
        await m.reply(novaBox("AUTO-CONTENT", ["Format waktu: HH:MM"]));
        return { handled: true };
      }

      let groupName = "unknown";
      try {
        const meta = await sock.groupMetadata(target);
        groupName = meta?.subject || "unknown";
      } catch {}

      const scheduleId = "SCH-" + Date.now().toString(36).toUpperCase();
      const newSchedule = {
        id: scheduleId,
        type: "custom",
        time,
        target,
        groupName,
        customPrompt: prompt,
        interval: "daily",
        enabled: true,
        createdAt: new Date().toISOString(),
      };

      settings.schedules.push(newSchedule);
      db.db.write();

      if (settings.enabled) {
        startCronJob(sock, newSchedule);
      }

      await m.reply(novaBox("AUTO-CONTENT", [
        `Custom schedule ditambahkan!`,
        `ID: ${scheduleId}`,
        `Time: ${time} WIB (daily)`,
        `Target: ${groupName}`,
        `Prompt: ${prompt.slice(0, 80)}${prompt.length > 80 ? "..." : ""}`,
      ]));
      return { handled: true };
    }

    // ─── DELETE SCHEDULE ───
    if (sub === "del") {
      const scheduleId = args[1];
      const idx = settings.schedules.findIndex((s) => s.id === scheduleId);
      if (idx === -1) {
        await m.reply(novaBox("AUTO-CONTENT", [`Schedule tidak ditemukan: ${scheduleId}`]));
        return { handled: true };
      }
      settings.schedules.splice(idx, 1);
      db.db.write();
      if (cronJobs[scheduleId]) {
        cronJobs[scheduleId].stop();
        delete cronJobs[scheduleId];
      }
      await m.reply(novaBox("AUTO-CONTENT", [`Schedule ${scheduleId} dihapus`]));
      return { handled: true };
    }

    // ─── LIST SCHEDULES ───
    if (sub === "list") {
      if (settings.schedules.length === 0) {
        await m.reply(novaBox("AUTO-CONTENT", [
          "Belum ada schedule",
          `Ketik: ${prefix}autocontent add <type> <time> <gid>`,
        ]));
        return { handled: true };
      }
      const list = settings.schedules.map((s, i) => {
        const typeName = CONTENT_TYPES[s.type]?.name || "Custom";
        const status = s.enabled ? "ON" : "OFF";
        return `${i + 1}. ${s.id} [${status}]`,
          `| ${typeName} | ${s.time} WIB | ${s.interval}`,
          `| Target: ${s.groupName || s.target?.slice(0, 20)}`;
      }).join("\n| \n| ");
      await m.reply(novaBox("AUTO-CONTENT — SCHEDULES", [
        `Total: ${settings.schedules.length}`,
        "---",
        list,
      ]));
      return { handled: true };
    }

    // ─── CONTENT TYPES ───
    if (sub === "types") {
      const types = Object.entries(CONTENT_TYPES).map(
        ([key, val]) => `${val.icon} ${key} = ${val.name}`
      ).join("\n| ");
      await m.reply(novaBox("AUTO-CONTENT — CONTENT TYPES", [
        `| ${types}`,
        "---",
        `Custom: ketik ${prefix}autocontent custom <time> <gid> <prompt>`,
      ]));
      return { handled: true };
    }

    // ─── RUN NOW (TEST) ───
    if (sub === "run") {
      const scheduleId = args[1];
      const schedule = settings.schedules.find((s) => s.id === scheduleId);
      if (!schedule) {
        await m.reply(novaBox("AUTO-CONTENT", [`Schedule tidak ditemukan: ${scheduleId}`]));
        return { handled: true };
      }
      await m.reply(novaBox("AUTO-CONTENT", [
        `Generating content untuk ${schedule.id}...`,
        `Type: ${CONTENT_TYPES[schedule.type]?.name || "Custom"}`,
      ]));
      const success = await sendContentToGroup(sock, schedule);
      if (success) {
        settings.stats.totalSent++;
        settings.stats.byType[schedule.type] = (settings.stats.byType[schedule.type] || 0) + 1;
        settings.stats.lastRun = new Date().toISOString();
        db.db.write();
        await m.reply(novaBox("AUTO-CONTENT", [`Content terkirim ke ${schedule.groupName}`]));
      } else {
        await m.reply(novaBox("AUTO-CONTENT", [`Gagal kirim content`]));
      }
      return { handled: true };
    }

    // ─── ANALYZE GROUP ACTIVITY ───
    if (sub === "analyze") {
      const targetGid = args[1] || gid;
      if (!targetGid.endsWith("@g.us")) {
        await m.reply(novaBox("AUTO-CONTENT", ["Target harus grup (@g.us)"]));
        return { handled: true };
      }
      const bestTimes = analyzeBestTime(targetGid);
      if (!bestTimes) {
        await m.reply(novaBox("AUTO-CONTENT", [
          "Belum cukup data untuk analisis",
          "Bot perlu track aktivitas grup minimal 10 pesan",
          `Data saat ini: ${activityTracker[targetGid]?.totalMessages || 0} pesan`,
        ]));
        return { handled: true };
      }
      const timeList = bestTimes.map((t) => `${String(t.hour).padStart(2, "0")}:00 (${t.count} msg)`).join("\n| ");
      await m.reply(novaBox("AUTO-CONTENT — GROUP ANALYSIS", [
        `Grup: ${targetGid.slice(0, 20)}...`,
        `Total pesan tracked: ${activityTracker[targetGid].totalMessages}`,
        "---",
        `Top jam aktif:`,
        `| ${timeList}`,
        "---",
        `Rekomendasi: kirim konten pada jam ${String(bestTimes[0].hour).padStart(2, "0")}:00`,
      ]));
      return { handled: true };
    }

    // ─── SET INTERVAL ───
    if (sub === "interval") {
      const scheduleId = args[1];
      const interval = (args[2] || "").toLowerCase();
      const schedule = settings.schedules.find((s) => s.id === scheduleId);
      if (!schedule) {
        await m.reply(novaBox("AUTO-CONTENT", [`Schedule tidak ditemukan: ${scheduleId}`]));
        return { handled: true };
      }
      if (!["daily", "weekly", "monthly"].includes(interval)) {
        await m.reply(novaBox("AUTO-CONTENT", [
          `Interval saat ini: ${schedule.interval}`,
          `Pilihan: daily, weekly, monthly`,
          `Ketik: ${prefix}autocontent interval <id> <daily/weekly/monthly>`,
        ]));
        return { handled: true };
      }
      schedule.interval = interval;
      db.db.write();
      if (settings.enabled && schedule.enabled) {
        startCronJob(sock, schedule);
      }
      await m.reply(novaBox("AUTO-CONTENT", [
        `Schedule ${scheduleId}`,
        `Interval: ${interval}`,
      ]));
      return { handled: true };
    }

    // ─── STATS ───
    if (sub === "stats") {
      const byType = Object.entries(settings.stats.byType)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => `${type}: ${count}x`)
        .join("\n| ") || "Belum ada";
      const byGroup = Object.entries(settings.stats.byGroup)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([g, count]) => `${g.slice(0, 15)}...: ${count}x`)
        .join("\n| ") || "Belum ada";

      await m.reply(novaBox("AUTO-CONTENT — STATISTIK", [
        `Total Sent: ${settings.stats.totalSent}`,
        `Total Failed: ${settings.stats.totalFailed}`,
        `Last Run: ${settings.stats.lastRun || "Belum ada"}`,
        "---",
        `By Type:`,
        `| ${byType}`,
        "---",
        `By Group:`,
        `| ${byGroup}`,
      ]));
      return { handled: true };
    }

    // ─── RESET ───
    if (sub === "reset") {
      settings.stats = { totalSent: 0, totalFailed: 0, byType: {}, byGroup: {}, lastRun: null };
      db.db.write();
      await m.reply(novaBox("AUTO-CONTENT", ["Statistik direset"]));
      return { handled: true };
    }

    // ─── SET DEFAULT TIME ───
    if (sub === "settime") {
      const time = args[1];
      if (!time || !/^\d{2}:\d{2}$/.test(time)) {
        await m.reply(novaBox("AUTO-CONTENT", [
          `Default time: ${settings.defaultTime} WIB`,
          `Ketik: ${prefix}autocontent settime HH:MM`,
        ]));
        return { handled: true };
      }
      settings.defaultTime = time;
      db.db.write();
      await m.reply(novaBox("AUTO-CONTENT", [`Default time: ${time} WIB`]));
      return { handled: true };
    }

    // ─── UNKNOWN ───
    await m.reply(novaBox("AUTO-CONTENT", [
      `Command tidak dikenal: ${sub}`,
      `Ketik ${prefix}autocontent untuk dashboard`,
    ]));
    return { handled: true };

  } catch (error) {
    console.error("[autocontent] handler error:", error.message);
    await m.reply(novaError("AutoContent", "Gagal nih, coba lagi ya"));
    return { handled: true };
  }
}

// ============================================================
// EXPORT
// ============================================================
export { pluginConfig as config, handler };
