// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Shared info section builder untuk menu, allmenu, allmenucategory
// Format: Info User, Info Bot, Info Database, Info Server, Waktu & Tanggal, Cuaca

import os from "os";
import fs from "fs";
import path from "path";
import { formatUptime, getTimeGreeting, getImportantDay } from "./nova-formatter.js";
import { getAiGreeting } from "./nova-greeting.js";
import { getWeatherDetail } from "./nova-weather-footer.js";
import { toSC } from "./nova-menu-style.js";
import { getDatabase } from "./nova-database.js";

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

function formatNum(n) {
  const num = Number(n) || 0;
  try { return num.toLocaleString("id-ID"); } catch { return String(num); }
}

// Versi Baileys terpasang (package "nova" = ourin-baileys fork)
let _baileysVersion = null;
function getBaileysVersion() {
  if (_baileysVersion) return _baileysVersion;
  try {
    const pkgPath = path.join(process.cwd(), "node_modules", "nova", "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    _baileysVersion = `${pkg.name} v${pkg.version}`;
  } catch {
    try {
      const rootPkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
      _baileysVersion = `ourin-baileys ${rootPkg.dependencies?.nova || ""}`.trim();
    } catch { _baileysVersion = "-"; }
  }
  return _baileysVersion;
}

// Lokasi server — IP geolocation (ipwho.is, HTTPS, no-key), cache 6 jam
let _locCache = { data: null, ts: 0 };
async function getServerLocation() {
  const now = Date.now();
  if (_locCache.data && now - _locCache.ts < 6 * 3600 * 1000) return _locCache.data;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const res = await fetch("https://ipwho.is/?fields=success,city,region,country", { signal: controller.signal });
    clearTimeout(t);
    const data = await res.json();
    if (data?.success && data.city) {
      _locCache = { data: `${data.city}, ${data.region}, ${data.country}`, ts: now };
      return _locCache.data;
    }
  } catch {}
  return "-";
}

// Ping — latency pesan user sampai diproses bot
function getMessagePingMs(m) {
  try {
    const ts = m?.timestamp || m?.messageTimestamp || 0;
    if (!ts) return "-";
    const ms = Date.now() - ts * 1000;
    if (ms < 0 || ms > 3600 * 1000) return "-";
    return `${Math.max(0, Math.round(ms))} ms`;
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

  // Ping dihitung SEKALI di awal (sebelum network call cuaca/greeting) — kalau
  // dihitung pas build info array, latency ketutup waktu proses API jadi bengkak.
  const pingMs = getMessagePingMs(m);

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
      totalCommandsRun = dbStats.commandsRun || 0;
      totalMessagesIn = dbStats.messagesReceived || 0;
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

  // ── Weather (cek setting weatherRealtime dulu) ──
  let weatherDetail = null;
  let weatherEnabled = true;
  try {
    const db2 = getDatabase();
    const wrSettings = db2.setting("weatherRealtime");
    if (wrSettings && wrSettings.realtime === false) {
      weatherEnabled = false;
    }
    // Sync lokasi dari setting ke config kalau ada
    if (wrSettings?.location) {
      if (!config.weather) config.weather = {};
      config.weather.location = wrSettings.location;
    }
  } catch {}
  if (weatherEnabled) {
    try {
      weatherDetail = await getWeatherDetail();
    } catch {}
  }

  // ── Build info array ──
  // Ucapan AI berubah tiap menu dimuat (IkyyXD free — jangan nguras token DeepSeek)
  let aiGreeting = null;
  try { aiGreeting = await getAiGreeting(); } catch {}
  const greeting = aiGreeting
    ? `${String(aiGreeting).replace(/[.,!?]+\s*$/, "")}, ${m.pushName || "User"}`
    : `${getTimeGreeting()}, ${m.pushName || "User"}`;

  const serverLocation = await getServerLocation();

  const info = [
    "Info User",
    { label: "Nama", value: m.pushName || "-" },
    { label: "Role", value: userRole },
    { label: "Level", value: `${formatNum(userLevel)} (${expPct}%)` },
    { label: "Energi", value: m.isOwner || m.isPremium ? "∞ Unlimited" : (user?.energi ?? 25) },
    { label: "Exp", value: formatNum(userExp) },
    { label: "Gold", value: formatNum(user?.rpg?.gold ?? 0) },
    { label: "Bank", value: formatNum(user?.rpg?.bank?.deposit ?? 0) },
    ...(m.isGroup ? [{ label: "Grup Mode", value: (groupMode || "md").toUpperCase() }] : []),
    "",
    "Info Waktu",
    { label: "Jam", value: timeStr },
    { label: "Hari", value: `${dayName} (${weton})` },
    { label: "Tanggal", value: dateStr },
    { label: "Hijriah", value: islamicDate },
    { label: "Hari Penting", value: importantDay || "Tidak ada" },
    "",
    "Info Bot",
    { label: "Nama", value: botName },
    { label: "Mode", value: (botConfig?.mode || "public").toUpperCase() },
    { label: "Prefix", value: prefix },
    { label: "Tipe", value: "Baileys MD (Multi Device)" },
    { label: "Baileys", value: getBaileysVersion() },
    { label: "Uptime", value: runtimeStr },
    "",
    "Info Database",
    { label: "User", value: `${formatNum(totalUsers)} (${formatNum(totalPremium)} Premium)` },
    { label: "Grup", value: `${totalActiveGroups} / ${totalGroups}` },
    { label: "Terdaftar", value: `${formatNum(totalRegistered)}` },
    { label: "Diblokir", value: `${formatNum(totalBanned)}` },
    { label: "Commands", value: formatNum(totalCommandsRun) },
    { label: "Messages", value: `${formatNum(totalMessagesIn)} / ${formatNum(totalMessagesOut)}` },
    "",
    "Info Server",
    { label: "Platform", value: platform },
    { label: "Hostname", value: hostname },
    { label: "Lokasi", value: serverLocation },
    { label: "Uptime", value: serverUptime },
    { label: "Ping", value: pingMs },
    { label: "RAM", value: `${(usedMem / 1024 / 1024).toFixed(0)}/${(totalMem / 1024 / 1024).toFixed(0)} MB (${memPercent}%)` },
    { label: "CPU", value: `${cpuCores} cores / ${cpuSpeed} MHz` },
    { label: "Load", value: loadAvg },
    ...(weatherDetail ? [
      "",
      "Cuaca",
      { label: "Lokasi", value: `${weatherDetail.location}` },
      { label: "Kondisi", value: `${weatherDetail.kondisi} ${weatherDetail.emoji}` },
      { label: "Suhu", value: weatherDetail.suhu },
      { label: "Terasa", value: weatherDetail.terasa },
      { label: "Kelembapan", value: weatherDetail.kelembapan },
      { label: "Angin", value: weatherDetail.angin },
      { label: "Arah Angin", value: weatherDetail.arahAngin },
      { label: "Tutupan Awan", value: weatherDetail.tutupanAwan },
      { label: "UV Index", value: weatherDetail.uv },
      { label: "Curah Hujan", value: weatherDetail.curahHujan },
    ] : []),
  ];

  // weatherStr null karena weather sudah di dalam info
  return { greeting, info, weatherStr: null };
}
