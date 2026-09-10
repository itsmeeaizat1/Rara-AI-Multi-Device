// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Shared info section builder untuk menu, allmenu, allmenucategory
// Format: Info User, Info Bot, Info Database, Info Server, Waktu & Tanggal, Cuaca

import { speedtestInfoRows } from "./nova-speedtest.js";
import os from "os";
import fs from "fs";
import { formatUptime, getTimeGreeting, getImportantDay } from "./nova-formatter.js";
import { getAiGreeting } from "./nova-greeting.js";
import { getWeatherDetail } from "./nova-weather-footer.js";
import { toSC } from "./nova-menu-style.js";
import { getDatabase } from "./nova-database.js";
import { botIdentity } from "./config/bot-identity.js";

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

// ─── network info server: IP publik/lokal, port, DNS 1/2 ───
// (request owner 11 Sep 2026: "tambah info ip, port info dns 1 dns 2 juga
// ke section info server")
function getInternalIp() {
  try {
    for (const addrs of Object.values(os.networkInterfaces())) {
      for (const a of addrs || []) {
        if (a.family === "IPv4" && !a.internal) return a.address;
      }
    }
  } catch {}
  return "-";
}

function getDnsServers() {
  try {
    const txt = fs.readFileSync("/etc/resolv.conf", "utf8");
    return txt.split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("nameserver"))
      .map((l) => l.split(/\s+/)[1])
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getWebPort() {
  return String(process.env.NOVA_WEB_PORT || 8080);
}

export function serverNetworkRows(db) {
  const rows = [];
  // IP publik dari hasil speedtest tersimpan (biar gak fetch tiap buka menu)
  try {
    const saved = db?.setting?.("serverSpeedtest");
    if (saved?.ip) rows.push({ label: "IP Publik", value: saved.ip });
  } catch {}
  rows.push({ label: "IP Lokal", value: getInternalIp() });
  rows.push({ label: "Port", value: getWebPort() });
  const dns = getDnsServers();
  if (dns[0]) rows.push({ label: "DNS 1", value: dns[0] });
  if (dns[1]) rows.push({ label: "DNS 2", value: dns[1] });
  return rows;
}

export async function buildMenuInfo(m, ctx = {}) {
  const { db, config: botConfig, uptime } = ctx;
  const now = new Date();

  // Ping dihitung SEKALI di awal (sebelum network call cuaca/greeting) — kalau
  // dihitung pas build info array, latency ketutup waktu proses API jadi bengkak.
  const pingMs = getMessagePingMs(m);

  // ── Time & date ──
  // total hari sebulan (bulan berjalan) + sisa hari menuju akhir tahun —
  // request owner 11 Sep, revisi: "berapa hari lagi untuk setahun".
  // Fallback pakai jam sistem; versi WIB dihitung ulang di try timeHelper.
  let daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let daysLeftYear = Math.max(1, Math.ceil((new Date(now.getFullYear() + 1, 0, 1) - now) / 86_400_000));
  let timeStr = "";
  let dayName = "";
  let dateStr = "";
  try {
    const timeHelper = await import("./nova-time.js");
    // hitung pakai timezone WIB biar konsisten sama jam yang ditampilin
    try {
      const mn = timeHelper.now(); // moment.tz Asia/Jakarta
      daysInMonth = mn.daysInMonth();
      daysLeftYear = Math.ceil(mn.clone().startOf("year").add(1, "year").diff(mn) / 86_400_000);
    } catch {}
    // detik ikut ditampilin (request owner 11 Sep: HH:MM:SS)
    timeStr = timeHelper.formatTime("HH:mm:ss");
    dayName = timeHelper.formatFull("dddd");
    dateStr = timeHelper.formatFull("DD MMMM YYYY");
  } catch {
    timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
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

  // ── Total fitur & perintah (dari plugin store) ──
  let totalFeatures = null;
  let totalCommands = null;
  try {
    const plugins = await import("./nova-plugins.js");
    totalFeatures = new Set(plugins.getAllPlugins()).size;
    totalCommands = new Set(plugins.getAllCommandNames()).size;
  } catch {}

  // ── RPG data (energi game + semua mata uang di database) ──
  const rpgData = user?.rpg || {};
  const rpgEnergy = rpgData.energy ?? 100;
  const rpgMaxEnergy = rpgData.maxEnergy ?? 100;
  const rpgEnergyPct = rpgMaxEnergy > 0 ? Math.round((rpgEnergy / rpgMaxEnergy) * 100) : 0;
  const userKoin = user?.koin ?? 0;
  const userSaldo = user?.saldo ?? 0;

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
    { label: "Limit", value: m.isOwner || m.isPremium ? "∞ Unlimited" : (user?.energi ?? 25) },
    { label: "Energi", value: m.isOwner ? "∞ Unlimited" : `${formatNum(rpgEnergy)} (${rpgEnergyPct}%)` },
    { label: "Exp", value: formatNum(userExp) },
    { label: "Gold", value: formatNum(rpgData.gold ?? 0) },
    { label: "Gems", value: formatNum(rpgData.gems ?? 0) },
    { label: "Diamonds", value: formatNum(rpgData.diamonds ?? 0) },
    { label: "Tokens", value: formatNum(rpgData.tokens ?? 0) },
    { label: "Koin", value: userKoin === -1 ? "∞ Unlimited" : formatNum(userKoin) },
    { label: "Saldo", value: formatNum(userSaldo) },
    { label: "Bank", value: formatNum(rpgData.bank?.deposit ?? 0) },
    ...(m.isGroup ? [{ label: "Grup Mode", value: (groupMode || "md").toUpperCase() }] : []),
    "",
    "Info Waktu",
    { label: "Jam", value: timeStr },
    { label: "Hari", value: `${dayName} (${weton})` },
    { label: "Tanggal", value: dateStr },
    { label: "Hijriah", value: islamicDate },
    { label: "Hari Sebulan", value: `${daysInMonth} hari` },
    { label: "Hari Setahun", value: `${daysLeftYear} hari lagi` },
    { label: "Hari Penting", value: importantDay || "Tidak ada" },
    "",
    "Info Bot",
    { label: "Nama", value: botName },
    { label: "Versi", value: "v" + String(botIdentity.bot?.version || botConfig?.bot?.version || "-").replace(/^v/i, "") },
    { label: "Mode", value: (botConfig?.mode || "public").toUpperCase() },
    { label: "Prefix", value: prefix },
    ...(totalCommands ? [{ label: "Total Perintah", value: formatNum(totalCommands) }] : []),
    ...(totalFeatures ? [{ label: "Total Fitur", value: formatNum(totalFeatures) }] : []),
    { label: "Tipe", value: "Baileys MD (Multi Device)" },
    { label: "Baileys", value: "ESM" },
    { label: "Uptime", value: runtimeStr },
    "",
    "Info Database",
    { label: "User", value: formatNum(totalUsers) },
    // rincian user gratis vs premium — request owner 11 Sep
    { label: "User Gratis", value: formatNum(Math.max(0, totalUsers - totalPremium)) },
    { label: "User Premium", value: formatNum(totalPremium) },
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
    // IP, port, DNS 1/2 (request owner 11 Sep)
    ...serverNetworkRows(db),
    // hasil speedtest — PALING AKHIR setelah info dns (revisi owner 11 Sep)
    ...speedtestInfoRows(db),
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
