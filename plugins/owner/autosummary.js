// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .autosummary — Auto-Smart Summary (Daily Group Digest)
 *
 * Fitur automation "bot masa depan" #4:
 * - Setiap malem, bot auto-summarize semua obrolan grup hari ini
 * - AI generate ringkasan: siapa ngobrolin apa, topik panas, keputusan
 * - Member yang offline tinggal baca summary, tidak ketinggalan
 * - Message buffer: simpan pesan sepanjang hari, summarize di jam tertentu
 * - 2 mode: full (detail per topik) atau brief (sangat singkat)
 * - Per-grup toggle, custom waktu kirim
 * - Kirim ke grup atau PM owner
 * - Top participants, top topics, key decisions, mood/vibe
 * - Stats: total summaries, messages summarized, topics detected
 * - Summary history (last 14 days)
 * - Fallback ke stats-based summary kalau AI gagal
 *
 * Commands:
 *   .autosummary                      — Dashboard status
 *   .autosummary on/off               — Aktifkan/matikan
 *   .autosummary mode <full/brief>    — Pilih mode summary
 *   .autosummary time HH:MM           — Set jam kirim (default 22:00)
 *   .autosummary addgc/delgc <gid>    — Manage grup aktif
 *   .autosummary sendto group/owner   — Kirim ke grup atau PM owner
 *   .autosummary now [gid]            — Generate summary sekarang
 *   .autosummary history              — Lihat history summary
 *   .autosummary stats                — Statistik
 *   .autosummary reset                — Reset stats & buffer
 */

import { CronJob } from "cron";
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaBox, toSC } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import config from "../../config.js";

const pluginConfig = {
  name: "autosummary",
  alias: ["autosummary", "autodigest", "groupsummary", "gsummary", "adigest"],
  category: "owner",
  description: "Auto-Smart Summary — AI ringkasan obrolan grup harian otomatis",
  usage: ".autosummary <on/off/mode/time/addgc/delgc/sendto/now/history/stats/reset>",
  example: ".autosummary on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ============================================================
// SETTINGS
// ============================================================
const DEFAULT_AUTOSUMMARY = {
  enabled: false,
  mode: "full", // full or brief
  sendTime: "22:00", // default 22:00 WIB
  sendTo: "group", // group or owner
  activeGroups: [], // empty = all groups
  maxMessagesPerGroup: 500, // max messages to buffer per group per day
  stats: {
    totalSummaries: 0,
    totalMessagesSummarized: 0,
    totalTopics: 0,
    totalAI: 0,
    totalFallback: 0,
    lastSummary: null,
    byGroup: {}, // { jid: { count, lastSummary, messages } }
  },
  history: [], // last 14 summaries
};

function getSettings() {
  const db = getDatabase();
  if (!db.db.data.automation) db.db.data.automation = {};
  if (!db.db.data.automation.autoSummary) {
    db.db.data.automation.autoSummary = DEFAULT_AUTOSUMMARY;
    db.db.write();
  } else {
    // SCHEMA EVOLUTION: settings lama (persist sebelum field baru ada)
    // di-merge dengan defaults biar gak TypeError "reading 'push'/undefined"
    // saat fitur jalan. Field user yang udah ada gak ketimpa.
    db.db.data.automation.autoSummary = { ...DEFAULT_AUTOSUMMARY, ...db.db.data.automation.autoSummary };
  }
  return db.db.data.automation.autoSummary;
}

// ============================================================
// MESSAGE BUFFER (per-group daily message log)
// ============================================================
// Format: { [groupJid]: [{ sender, text, time, isCommand }] }
const messageBuffers = {};

export function logMessageForSummary(m) {
  const settings = getSettings();
  if (!settings.enabled) return;
  if (!m.isGroup || m.fromMe) return;

  const text = m.text || m.body || "";
  if (!text || text.length < 2) return;

  // Skip commands
  const prefix = config.command?.prefix || ".";
  if (text.startsWith(prefix)) return;

  const groupJid = m.chat;
  if (settings.activeGroups.length > 0 && !settings.activeGroups.includes(groupJid)) return;

  const sender = (m.sender || "").split("@")[0];
  const senderName = m.pushName || sender;

  if (!messageBuffers[groupJid]) {
    messageBuffers[groupJid] = [];
  }

  messageBuffers[groupJid].push({
    sender: senderName,
    senderJid: m.sender,
    text: text.slice(0, 300), // cap per message
    time: Date.now(),
  });

  // Cap buffer
  const max = settings.maxMessagesPerGroup || 500;
  if (messageBuffers[groupJid].length > max) {
    messageBuffers[groupJid] = messageBuffers[groupJid].slice(-max);
  }
}

// ============================================================
// AI GENERATE SUMMARY
// ============================================================
async function generateAISummary(groupName, messages, settings) {
  if (messages.length === 0) return null;

  // Build conversation log
  const conversationLog = messages.map((msg) => {
    return `${msg.sender}: "${msg.text}"`;
  }).join("\n");

  const modeGuide = settings.mode === "brief"
    ? "SANGAT SINGKAT. 3-5 baris saja. Hanya poin-poin paling penting."
    : "DETAIL tapi tetap ringkas. 8-15 baris. Breakdown per topik.";

  const systemPrompt = `Kamu adalah AI yang merangkum obrolan WhatsApp grup menjadi digest harian yang enak dibaca.
Mode: ${modeGuide}

Format output (gunakan bahasa Indonesia, santai tapi informatif):
- Ringkasan utama: apa yang dibahas hari ini
- Topik panas: 2-3 topik yang paling banyak dibicarakan
- Key moments: keputusan/kesepakatan/berita penting (kalau ada)
- Mood grup: vibe obrolan hari ini (serius/santai/rame/lucu/debat)
- Top 3 member paling aktif

Aturan:
- Jangan pakai markdown bold/italic
- Jangan pakai emoji berlebihan (max 3-4 di seluruh pesan)
- Gunakan box-drawing style (╭╮╰╯│) untuk format
- Pastikan nama member ditulis natural, bukan nomor`;

  const userPrompt = `Rangkum obrolan grup "${groupName}" hari ini (${messages.length} pesan):\n\n${conversationLog.slice(0, 8000)}`;

  try {
    const result = await callAI({
      providerKey: "openai",
      messages: [{ role: "user", content: userPrompt }],
      systemPrompt,
      apiKey: config.aiHelp?.openaiApiKey || "",
      apiEndpoint: config.aiHelp?.apiEndpoint || "",
      model: config.aiHelp?.model || "gpt-4o-mini",
      temperature: 0.4,
      maxTokens: 800,
    });

    if (result && result.trim().length > 20) {
      return result.trim();
    }
    return null;
  } catch (e) {
    console.error("[autosummary] AI error:", e.message);
    return null;
  }
}

// ============================================================
// FALLBACK SUMMARY (stats-based, no AI)
// ============================================================
function generateFallbackSummary(groupName, messages) {
  if (messages.length === 0) return null;

  // Count messages per sender
  const senderCount = {};
  messages.forEach((msg) => {
    senderCount[msg.sender] = (senderCount[msg.sender] || 0) + 1;
  });

  // Top 3 senders
  const topSenders = Object.entries(senderCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count], i) => `${i + 1}. ${name} (${count} pesan)`)
    .join("\n");

  // Time range
  const first = messages[0];
  const last = messages[messages.length - 1];
  const firstTime = new Date(first.time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
  const lastTime = new Date(last.time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

  // Extract some keywords (simple frequency)
  const wordFreq = {};
  messages.forEach((msg) => {
    const words = msg.text.toLowerCase().split(/\s+/);
    words.forEach((w) => {
      if (w.length > 4 && !["yang", "dengan", "untuk", "adalah", "karena", "tidak", "tapi", "akan", "sudah", "bisa", "ini", "itu", "ada"].includes(w)) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    });
  });
  const topWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w, c]) => `${w} (${c}x)`)
    .join(", ");

  return (
    `Grup: ${groupName}\n` +
    `Tanggal: ${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta" })}\n` +
    `Total pesan: ${messages.length}\n` +
    `Aktifitas: ${firstTime} — ${lastTime} WIB\n` +
    `
` +
    `Top Member:\n` +
    `${topSenders}\n` +
    `
` +
    `Topik sering: ${topWords || "tidak terdeteksi"}\n` +
    `
` +
    `Vibe: ${messages.length > 100 ? "Sangat rame" : messages.length > 50 ? "Ramai" : messages.length > 20 ? "Cukup aktif" : "Tenang"}\n`
  );
}

// ============================================================
// GENERATE & SEND SUMMARY FOR A GROUP
// ============================================================
async function generateAndSendSummary(sock, groupJid, isManual = false) {
  const settings = getSettings();
  const messages = messageBuffers[groupJid] || [];

  if (messages.length === 0) {
    console.log(`[autosummary] No messages for ${groupJid}, skipping`);
    return { success: false, reason: "no_messages" };
  }

  // Get group name
  let groupName = "Grup";
  try {
    const metadata = await sock.groupMetadata(groupJid);
    groupName = metadata?.subject || "Grup";
  } catch {}

  // Generate summary
  let summary = null;
  let usedAI = false;

  summary = await generateAISummary(groupName, messages, settings);
  if (summary) usedAI = true;

  if (!summary) {
    summary = generateFallbackSummary(groupName, messages);
    if (!summary) return { success: false, reason: "generate_failed" };
  }

  // Send summary
  let targetJid = groupJid;
  if (settings.sendTo === "owner") {
    const ownerNum = config.owner?.number?.[0];
    if (ownerNum) {
      targetJid = ownerNum.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    }
  }

  const header =
    `Grup: ${groupName}\n` +
    `Tanggal: ${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta" })}\n` +
    `Pesan: ${messages.length} | Mode: ${usedAI ? "AI" : "Stats"}\n` +
    `\n`;

  try {
    await sock.sendMessage(targetJid, { text: header + summary });
  } catch (e) {
    console.error("[autosummary] send error:", e.message);
    return { success: false, reason: "send_failed" };
  }

  // Update stats
  settings.stats.totalSummaries++;
  settings.stats.totalMessagesSummarized += messages.length;
  if (usedAI) settings.stats.totalAI++;
  else settings.stats.totalFallback++;

  if (!settings.stats.byGroup[groupJid]) {
    settings.stats.byGroup[groupJid] = { count: 0, lastSummary: null, messages: 0 };
  }
  settings.stats.byGroup[groupJid].count++;
  settings.stats.byGroup[groupJid].lastSummary = new Date().toISOString();
  settings.stats.byGroup[groupJid].messages += messages.length;
  settings.stats.lastSummary = new Date().toISOString();

  // History (last 14)
  settings.history.push({
    group: groupName,
    groupJid,
    messageCount: messages.length,
    ai: usedAI,
    timestamp: new Date().toISOString(),
  });
  if (settings.history.length > 14) settings.history.shift();

  // Clear buffer after summary
  if (!isManual) {
    messageBuffers[groupJid] = [];
  }

  getDatabase().db.write();
  return { success: true, groupName, messageCount: messages.length, usedAI };
}

// ============================================================
// SEND ALL SUMMARIES (for all active groups)
// ============================================================
async function sendAllSummaries(sock) {
  const settings = getSettings();
  console.log("[autosummary] Generating daily summaries...");

  // Determine which groups to process
  let groupJids = settings.activeGroups;
  if (groupJids.length === 0) {
    groupJids = Object.keys(messageBuffers).filter((g) => messageBuffers[g]?.length > 0);
  }

  let sent = 0;
  for (const gid of groupJids) {
    try {
      const result = await generateAndSendSummary(sock, gid, false);
      if (result.success) {
        sent++;
        console.log(`[autosummary] Sent to ${result.groupName} (${result.messageCount} msgs, AI: ${result.usedAI})`);
      }
    } catch (e) {
      console.error(`[autosummary] Error for ${gid}:`, e.message);
    }
  }

  console.log(`[autosummary] Done — ${sent} summaries sent`);
}

// ============================================================
// CRON JOB
// ============================================================
let summaryCron = null;

function startSummaryCron(sock) {
  if (summaryCron) summaryCron.stop();

  const settings = getSettings();
  if (!settings.enabled) return;

  const [hour, minute] = (settings.sendTime || "22:00").split(":");
  summaryCron = new CronJob(
    `0 ${minute || "00"} ${hour || "22"} * * *`,
    async () => {
      console.log("[autosummary] Cron triggered — generating daily summaries...");
      await sendAllSummaries(sock);
    },
    null,
    true,
    "Asia/Jakarta"
  );

  console.log(`[autosummary] Cron started — daily ${settings.sendTime} WIB`);
}

function stopSummaryCron() {
  if (summaryCron) {
    summaryCron.stop();
    summaryCron = null;
  }
}

// ============================================================
// START FUNCTION (called from index.js)
// ============================================================
export async function startAutoSummary(sock) {
  const settings = getSettings();
  if (settings.enabled) {
    startSummaryCron(sock);
  }
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
      const groupList = settings.activeGroups.length === 0 ? "Semua grup" : `${settings.activeGroups.length} grup`;

      // Buffer status
      const bufferInfo = Object.entries(messageBuffers)
        .filter(([_, msgs]) => msgs.length > 0)
        .map(([jid, msgs]) => `| ${jid.slice(0, 18)}... : ${msgs.length} pesan`)
        .join("\n") || "Belum ada pesan buffered";

      await m.reply(novaBox("AUTO-SMART SUMMARY", [
        `Status: ${status}`,
        `Mode: ${settings.mode}`,
        `Kirim: ${settings.sendTime} WIB`,
        `Send to: ${settings.sendTo}`,
        `Active: ${groupList}`,
        "---",
        `Stats:`,
        `| Total summaries: ${settings.stats.totalSummaries}`,
        `| Messages summarized: ${settings.stats.totalMessagesSummarized}`,
        `| AI: ${settings.stats.totalAI} | Fallback: ${settings.stats.totalFallback}`,
        `| Last: ${settings.stats.lastSummary || "Belum ada"}`,
        "---",
        `Buffer:`,
        bufferInfo,
      ]) + "\n\n" + novaBox("COMMANDS", [
        `${prefix}autosummary on/off`,
        `${prefix}autosummary mode <full/brief>`,
        `${prefix}autosummary time HH:MM`,
        `${prefix}autosummary sendto group/owner`,
        `${prefix}autosummary addgc/delgc <gid>`,
        `${prefix}autosummary now [gid]`,
        `${prefix}autosummary history`,
        `${prefix}autosummary stats`,
        `${prefix}autosummary reset`,
      ]));
      return { handled: true };
    }

    // ─── ON ───
    if (sub === "on") {
      settings.enabled = true;
      db.db.write();
      startSummaryCron(sock);
      await m.reply(novaBox("AUTO-SMART SUMMARY", [
        "Status: ON",
        `Kirim: ${settings.sendTime} WIB`,
        `Mode: ${settings.mode}`,
        "Bot akan buffer pesan & summarize setiap hari",
      ]));
      return { handled: true };
    }

    // ─── OFF ───
    if (sub === "off") {
      settings.enabled = false;
      db.db.write();
      stopSummaryCron();
      await m.reply(novaBox("AUTO-SMART SUMMARY", ["Status: OFF", "Cron dihentikan"]));
      return { handled: true };
    }

    // ─── MODE ───
    if (sub === "mode") {
      const mode = (args[1] || "").toLowerCase();
      if (!["full", "brief"].includes(mode)) {
        await m.reply(novaBox("AUTO-SMART SUMMARY", [
          `Current: ${settings.mode}`,
          "Pilihan: full, brief",
          `Ketik: ${prefix}autosummary mode <full/brief>`,
          "",
          "full = detail per topik (8-15 baris)",
          "brief = sangat singkat (3-5 baris)",
        ]));
        return { handled: true };
      }
      settings.mode = mode;
      db.db.write();
      await m.reply(novaBox("AUTO-SMART SUMMARY", [`Mode: ${mode}`]));
      return { handled: true };
    }

    // ─── TIME ───
    if (sub === "time") {
      const time = args[1];
      if (!time || !/^\d{1,2}:\d{2}$/.test(time)) {
        await m.reply(novaBox("AUTO-SMART SUMMARY", [
          `Current: ${settings.sendTime} WIB`,
          `Ketik: ${prefix}autosummary time HH:MM`,
          `Contoh: ${prefix}autosummary time 22:00`,
        ]));
        return { handled: true };
      }
      settings.sendTime = time;
      db.db.write();
      if (settings.enabled) startSummaryCron(sock);
      await m.reply(novaBox("AUTO-SMART SUMMARY", [
        `Waktu kirim: ${time} WIB`,
        "Cron di-restart",
      ]));
      return { handled: true };
    }

    // ─── SENDTO ───
    if (sub === "sendto") {
      const target = (args[1] || "").toLowerCase();
      if (!["group", "owner"].includes(target)) {
        await m.reply(novaBox("AUTO-SMART SUMMARY", [
          `Current: ${settings.sendTo}`,
          `Ketik: ${prefix}autosummary sendto group/owner`,
        ]));
        return { handled: true };
      }
      settings.sendTo = target;
      db.db.write();
      await m.reply(novaBox("AUTO-SMART SUMMARY", [`Send to: ${target === "group" ? "Grup" : "PM Owner"}`]));
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
        await m.reply(novaBox("AUTO-SMART SUMMARY", [`Grup ditambah: ${gid}`, `Total: ${settings.activeGroups.length}`]));
      } else {
        settings.activeGroups = settings.activeGroups.filter((g) => g !== gid);
        db.db.write();
        await m.reply(novaBox("AUTO-SMART SUMMARY", [`Grup dihapus: ${gid}`, `Total: ${settings.activeGroups.length}`]));
      }
      return { handled: true };
    }

    // ─── NOW (generate immediately) ───
    if (sub === "now") {
      const gid = args[1] || m.chat;
      if (!gid || !gid.endsWith("@g.us")) {
        await m.reply(novaBox("AUTO-SMART SUMMARY", [
          `Ketik di grup atau: ${prefix}autosummary now <groupId>`,
          `Contoh: ${prefix}autosummary now 120363xxx@g.us`,
        ]));
        return { handled: true };
      }

      await m.reply(novaBox("AUTO-SMART SUMMARY", [`Generating summary for ${gid.slice(0, 18)}...`]));

      const result = await generateAndSendSummary(sock, gid, true);
      if (result.success) {
        await m.reply(novaBox("AUTO-SMART SUMMARY", [
          `Summary terkirim!`,
          `Grup: ${result.groupName}`,
          `Pesan: ${result.messageCount}`,
          `Mode: ${result.usedAI ? "AI" : "Fallback"}`,
        ]));
      } else {
        await m.reply(novaBox("AUTO-SMART SUMMARY", [
          `Gagal: ${result.reason}`,
          "Mungkin belum ada pesan yang di-buffer",
        ]));
      }
      return { handled: true };
    }

    // ─── HISTORY ───
    if (sub === "history") {
      if (settings.history.length === 0) {
        await m.reply(novaBox("AUTO-SMART SUMMARY", ["History: kosong"]));
        return { handled: true };
      }
      const recent = settings.history.slice(-10).reverse();
      const lines = recent.map((h) => {
        const time = new Date(h.timestamp).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
        return `| ${h.group} — ${h.messageCount} msgs ${h.ai ? "[AI]" : "[FB]"} ${time}`;
      });
      await m.reply(novaBox("SUMMARY HISTORY", lines));
      return { handled: true };
    }

    // ─── STATS ───
    if (sub === "stats") {
      const groupStats = Object.entries(settings.stats.byGroup)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([jid, s]) => `| ${jid.slice(0, 18)}... : ${s.count}x, ${s.messages} msgs`)
        .join("\n") || "Belum ada data";

      await m.reply(novaBox("SMART SUMMARY — STATISTIK", [
        `Total summaries: ${settings.stats.totalSummaries}`,
        `Messages summarized: ${settings.stats.totalMessagesSummarized}`,
        `AI: ${settings.stats.totalAI}`,
        `Fallback: ${settings.stats.totalFallback}`,
        `Last: ${settings.stats.lastSummary || "Belum ada"}`,
        "---",
        `Per Grup:`,
        groupStats,
      ]));
      return { handled: true };
    }

    // ─── RESET ───
    if (sub === "reset") {
      settings.stats = {
        totalSummaries: 0,
        totalMessagesSummarized: 0,
        totalTopics: 0,
        totalAI: 0,
        totalFallback: 0,
        lastSummary: null,
        byGroup: {},
      };
      settings.history = [];
      // Clear buffers too
      for (const k of Object.keys(messageBuffers)) delete messageBuffers[k];
      db.db.write();
      await m.reply(novaBox("AUTO-SMART SUMMARY", ["Stats, history & buffer direset"]));
      return { handled: true };
    }

    // ─── UNKNOWN ───
    await m.reply(novaBox("AUTO-SMART SUMMARY", [`Command tidak dikenal: ${sub}`, `Ketik ${prefix}autosummary untuk dashboard`]));
    return { handled: true };

  } catch (error) {
    console.error("[autosummary] handler error:", error.message);
    await m.reply(novaError("AutoSummary", "Gagal nih, coba lagi ya"));
    return { handled: true };
  }
}

// ============================================================
// EXPORT
// ============================================================
export { pluginConfig as config, handler };
