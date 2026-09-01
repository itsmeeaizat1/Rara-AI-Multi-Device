// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Info section builder untuk not-found reply
// Reuses same info as menu/allmenu: user, bot, server, database, weather

import os from "os";
import { formatUptime, getTimeGreeting, getImportantDay } from "./nova-formatter.js";
import { getWeatherFooter } from "./nova-weather-footer.js";
import { toSC } from "./nova-menu-style.js";

function getWeton(date = new Date()) {
  const days = ["Pahing", "Pon", "Wage", "Kliwon", "Legi"];
  const ref = new Date(1900, 0, 1);
  const diff = Math.floor((date.getTime() - ref.getTime()) / 86400000);
  return days[((diff % 5) + 5) % 5];
}

function getIslamicDate(date = new Date()) {
  try {
    return new Intl.DateTimeFormat("id-ID-u-ca-islamic", {
      day: "numeric", month: "long", year: "numeric",
    }).format(date);
  } catch { return "-"; }
}

/**
 * Build info section lengkap untuk not-found reply
 * Returns array of strings (box-drawing lines)
 */
export async function buildNotFoundInfo(m, { db, config: botConfig, uptime } = {}) {
  const lines = [];
  const now = new Date();

  // ── Time & date ──
  let timeStr = "";
  let dayName = "";
  let dateStr = "";
  try {
    const timeHelper = await import("./nova-time.js");
    timeStr = timeHelper.formatTime("HH:mm");
    dayName = timeHelper.formatFull("dddd");
    dateStr = timeHelper.formatFull("DD MMMM YYYY");
  } catch {
    timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    dayName = now.toLocaleDateString("id-ID", { weekday: "long" });
    dateStr = now.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  }

  const weton = getWeton(now);
  const islamicDate = getIslamicDate(now);
  const importantDay = await getImportantDay(now).catch(() => "-");

  // ── User info ──
  const user = db ? db.getUser(m.sender) : null;
  let userRole = "User";
  if (m.isOwner) userRole = "Owner";
  else if (m.isPremium) userRole = "Premium";
  const userExp = user?.exp || 0;
  const userLevel = Math.floor(userExp / 20000) + 1;
  const expMin = (userLevel - 1) * 20000;
  const expMax = userLevel * 20000;
  const expCurr = userExp - expMin;
  const expPct = expMax > 0 ? Math.floor((expCurr / (expMax - expMin)) * 100) : 0;

  // ── Bot info ──
  const prefix = botConfig?.command?.prefix || ".";
  const runtimeStr = formatUptime(uptime || process.uptime() * 1000);
  const botName = botConfig?.bot?.name || "Nova AI";

  // ── Database info ──
  let totalUsers = 0, totalPremium = 0, totalBanned = 0, totalRegistered = 0;
  let totalGroups = 0, totalActiveGroups = 0;
  let totalCommandsRun = 0, totalMessagesIn = 0, totalMessagesOut = 0;
  if (db) {
    try {
      totalUsers = db.getUserCount();
      const allUsers = db.getAllUsers();
      totalRegistered = Object.values(allUsers).filter(u => u.registeredAt || u.isRegistered).length;
      totalPremium = Object.values(allUsers).filter(u => u.isPremium).length;
      totalBanned = Object.values(allUsers).filter(u => u.isBanned).length;
      const allGroups = db.getAllGroups();
      totalGroups = Object.keys(allGroups).length;
      totalActiveGroups = Object.values(allGroups).filter(g => g.isLeft !== true && g.isBanned !== true).length;
      const dbStats = db.getStats();
      totalCommandsRun = dbStats.commandsRun || dbStats.totalCommands || 0;
      totalMessagesIn = dbStats.messagesReceived || dbStats.totalMessages || 0;
      totalMessagesOut = dbStats.messagesSent || 0;
    } catch {}
  }

  // ── Server info ──
  const platform = process.platform;
  const hostname = os.hostname();
  const serverUptime = formatUptime(os.uptime());
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const usedMem = totalMem - os.freemem();
  const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
  const cpuCores = os.cpus().length;
  let cpuSpeed = os.cpus()[0]?.speed || 0;
  let cpuModel = os.cpus()[0]?.model || "Unknown";
  if ((!cpuSpeed || cpuSpeed === 0) || cpuModel === "Unknown") {
    try {
      const fs = await import("fs");
      const cpuinfo = fs.readFileSync("/proc/cpuinfo", "utf8");
      const mhzMatch = cpuinfo.match(/cpu MHz\s*:\s*([\d.]+)/i);
      if (mhzMatch) cpuSpeed = Math.round(parseFloat(mhzMatch[1]));
      const modelMatch = cpuinfo.match(/model name\s*:\s*(.+)/i);
      if (modelMatch) cpuModel = modelMatch[1].trim();
    } catch {}
  }
  if (!cpuSpeed || cpuSpeed === 0) cpuSpeed = "-";
  const loadAvg = os.loadavg()[0].toFixed(2);

  // ── Group info (if in group) ──
  let groupInfo = "";
  if (m.isGroup) {
    try {
      const groupData = db ? (db.getGroup(m.chat) || {}) : {};
      const botMode = groupData.botMode || "md";
      const groupName = m.groupName || groupData.name || "Grup";
      groupInfo = toSC("Grup") + ": " + groupName + " (" + botMode.toUpperCase() + ")";
    } catch {}
  }

  // ── Build sections ──
  // Header greeting
  lines.push(toSC(getTimeGreeting()) + ", " + (m.pushName || "User"));

  // Info User
  lines.push("│");
  lines.push("│ " + toSC("Info User"));
  lines.push("│ • " + toSC("Nama") + " : " + (m.pushName || "-"));
  lines.push("│ • " + toSC("Role") + " : " + userRole);
  lines.push("│ • " + toSC("Level") + " : " + userLevel + " (" + expPct + "%)");
  lines.push("│ • " + toSC("Energi") + " : " + (m.isOwner || m.isPremium ? "\u221E Unlimited" : (user?.energi ?? 25)));
  if (m.isGroup && groupInfo) {
    lines.push("│ • " + groupInfo);
  }

  // Info Bot
  lines.push("│");
  lines.push("│ " + toSC("Info Bot"));
  lines.push("│ • " + toSC("Nama") + " : " + botName);
  lines.push("│ • " + toSC("Mode") + " : " + (botConfig?.mode || "public").toUpperCase());
  lines.push("│ • " + toSC("Prefix") + " : " + prefix);
  lines.push("│ • " + toSC("Uptime") + " : " + runtimeStr);

  // Info Database
  lines.push("│");
  lines.push("│ " + toSC("Info Database"));
  lines.push("│ • " + toSC("User") + " : " + totalUsers + " (" + totalPremium + " Premium)");
  lines.push("│ • " + toSC("Grup") + " : " + totalActiveGroups + " / " + totalGroups);
  lines.push("│ • " + toSC("Terdaftar") + " : " + totalRegistered);
  lines.push("│ • " + toSC("Diblokir") + " : " + totalBanned);
  lines.push("│ • " + toSC("Commands") + " : " + totalCommandsRun);
  lines.push("│ • " + toSC("Messages") + " : " + totalMessagesIn + " / " + totalMessagesOut);

  // Info Server
  lines.push("│");
  lines.push("│ " + toSC("Info Server"));
  lines.push("│ • " + toSC("Platform") + " : " + platform);
  lines.push("│ • " + toSC("Hostname") + " : " + hostname);
  lines.push("│ • " + toSC("Uptime") + " : " + serverUptime);
  lines.push("│ • " + toSC("RAM") + " : " + (usedMem / 1024 / 1024).toFixed(0) + "/" + (totalMem / 1024 / 1024).toFixed(0) + " MB (" + memPercent + "%)");
  lines.push("│ • " + toSC("CPU") + " : " + cpuCores + " cores / " + cpuSpeed + " MHz");
  lines.push("│ • " + toSC("Load") + " : " + loadAvg);

  // Waktu & Tanggal
  lines.push("│");
  lines.push("│ " + toSC("Waktu & Tanggal"));
  lines.push("│ • " + toSC("Jam") + " : " + timeStr);
  lines.push("│ • " + toSC("Hari") + " : " + dayName + " (" + weton + ")");
  lines.push("│ • " + toSC("Tanggal") + " : " + dateStr);
  lines.push("│ • " + toSC("Hijriah") + " : " + islamicDate);
  if (importantDay && importantDay !== "-") {
    lines.push("│ • " + toSC("Hari Penting") + " : " + importantDay);
  }

  // Weather
  try {
    const wf = await getWeatherFooter();
    if (wf) {
      lines.push("│");
      lines.push(wf);
    }
  } catch {}

  return lines;
}

/**
 * Build not-found reply with info section
 */
export async function buildNotFoundReply(m, ctx, command, closest, level, totalHits) {
  const { config: botConfig } = ctx || {};
  const prefix = botConfig?.command?.prefix || ".";
  const smartEnabled = botConfig?.features?.commandSuggestionSmart !== false;
  if (!smartEnabled) level = 0;

  // Build info lines
  const infoLines = await buildNotFoundInfo(m, ctx);

  // Build header based on level
  let header = "\u256D\u2500\u300C \u2726 Not Found \u2726 \u300D";

  // Build not-found message based on level
  let notFoundLines = [];
  if (level === 0) {
    notFoundLines.push("\u2502 Command *" + prefix + command + "* tidak ditemukan");
    if (closest) {
      notFoundLines.push("\u2502 Mungkin maksudmu: *" + prefix + closest + "* ?");
    }
    notFoundLines.push("\u2502");
    notFoundLines.push("\u2502 \u{1F4A1} Ketik *" + prefix + "tanyaai* untuk tanya AI");
  } else if (level === 1) {
    notFoundLines.push("\u2502 \u26A0 Kamu sudah salah ketik " + totalHits + "x dalam 1 menit");
    notFoundLines.push("\u2502 Command *" + prefix + command + "* tidak ditemukan");
    if (closest) {
      notFoundLines.push("\u2502 Mungkin: *" + prefix + closest + "*");
    }
    notFoundLines.push("\u2502");
    notFoundLines.push("\u2502 \u{1F4A1} Cek *" + prefix + "menu* untuk daftar lengkap");
  } else if (level === 2) {
    notFoundLines.push("\u2502 \u26A0 Sudah " + totalHits + "x command tidak ditemukan!");
    notFoundLines.push("\u2502 Tolong cek *" + prefix + "menu* dulu ya");
    notFoundLines.push("\u2502");
    notFoundLines.push("\u2502 \u{1F4A1} Atau tanya *" + prefix + "tanyaai* \u2014 AI bantu cari");
  } else if (level === 4) {
    notFoundLines.push("\u2502 \u{1F6A2} Kamu mengirim " + totalHits + " command salah!");
    notFoundLines.push("\u2502 Bot tidak mengenal command tersebut.");
    notFoundLines.push("\u2502");
    notFoundLines.push("\u2502 \u{1F4A1} Daripada tebak-tebakan, langsung tanya AI:");
    notFoundLines.push("\u2502 *" + prefix + "tanyaai* <apa yang kamu cari>");
    notFoundLines.push("\u2502");
    notFoundLines.push("\u2502 Atau cek daftar: *" + prefix + "menu*");
  }

  // Compose: header + not-found + info
  let result = header + "\n";
  result += notFoundLines.join("\n") + "\n";
  result += infoLines.join("\n") + "\n";
  result += "\u2570\u2500\u2500\u2500\u2500 \u2022 \u2500\u2500\u2500\u2500";

  return result;
}
