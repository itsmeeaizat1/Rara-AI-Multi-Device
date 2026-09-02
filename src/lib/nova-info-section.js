// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Shared info section builder untuk menu, allmenu, allmenucategory
// Format: Info User, Info Bot, Info Database, Info Server, Waktu & Tanggal, Cuaca

import os from "os";
import fs from "fs";
import { formatUptime, getTimeGreeting, getImportantDay } from "./nova-formatter.js";
import { getWeatherFooter, getWeatherAddress } from "./nova-weather-footer.js";
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
 * Build info section lengkap untuk menu/allmenu/allmenucategory
 * Weather dimasukkan LANGSUNG ke dalam info array (bukan terpisah)
 *
 * @param m — message object
 * @param ctx — { db, config: botConfig, uptime }
 * @returns { greeting, info, weatherStr }
 *   - info: array untuk novaMenuLayout
 *   - weatherStr: null (weather sudah di dalam info), tetap dikembalikan untuk backward compat
 */
export async function buildMenuInfo(m, ctx = {}) {
  const { db, config: botConfig, uptime } = ctx;
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
  let groupMode = "";
  if (m.isGroup) {
    try {
      const groupData = db ? (db.getGroup(m.chat) || {}) : {};
      groupMode = groupData.botMode || "md";
    } catch {}
  }

  // ── Weather (fetch address singkat untuk info section) ──
  let weatherAddr = "";
  try {
    weatherAddr = await getWeatherAddress();
  } catch {}

  // ── Build info array ──
  const greeting = `${getTimeGreeting()}, ${m.pushName || "User"}`;

  const info = [
    greeting,
    "",
    "Info User",
    { label: "Nama", value: m.pushName || "-" },
    { label: "Role", value: userRole },
    { label: "Level", value: `${userLevel} (${expPct}%)` },
    { label: "Energi", value: m.isOwner || m.isPremium ? "∞ Unlimited" : (user?.energi ?? 25) },
    ...(m.isGroup ? [{ label: "Grup Mode", value: (groupMode || "md").toUpperCase() }] : []),
    "",
    "Info Bot",
    { label: "Nama", value: botName },
    { label: "Mode", value: (botConfig?.mode || "public").toUpperCase() },
    { label: "Prefix", value: prefix },
    { label: "Uptime", value: runtimeStr },
    "",
    "Info Database",
    { label: "User", value: `${totalUsers} (${totalPremium} Premium)` },
    { label: "Grup", value: `${totalActiveGroups} / ${totalGroups}` },
    { label: "Terdaftar", value: `${totalRegistered}` },
    { label: "Diblokir", value: `${totalBanned}` },
    { label: "Commands", value: `${totalCommandsRun}` },
    { label: "Messages", value: `${totalMessagesIn} / ${totalMessagesOut}` },
    "",
    "Info Server",
    { label: "Platform", value: platform },
    { label: "Hostname", value: hostname },
    { label: "Uptime", value: serverUptime },
    { label: "RAM", value: `${(usedMem / 1024 / 1024).toFixed(0)}/${(totalMem / 1024 / 1024).toFixed(0)} MB (${memPercent}%)` },
    { label: "CPU", value: `${cpuCores} cores / ${cpuSpeed} MHz` },
    { label: "Load", value: loadAvg },
    "",
    "Waktu & Tanggal",
    { label: "Jam", value: timeStr },
    { label: "Hari", value: `${dayName} (${weton})` },
    { label: "Tanggal", value: dateStr },
    { label: "Hijriah", value: islamicDate },
    ...(importantDay && importantDay !== "-" ? [{ label: "Hari Penting", value: importantDay }] : []),
    ...(weatherAddr ? ["", "Cuaca", { label: "Cuaca", value: weatherAddr }] : []),
  ];

  // weatherStr null karena weather sudah di dalam info
  return { greeting, info, weatherStr: null };
}
