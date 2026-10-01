// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import os from "os";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { getWeatherFooter } from "../../src/lib/rara-weather-footer.js";
import { sendMenuCard } from "../../src/lib/rara-menu-card.js";
import { sendMenuAudio } from "../../src/lib/send-menu.js";
import { getPluginCount, getCategories } from "../../src/lib/rara-plugins.js";
import { getCaseCount } from "../../case/rara.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, toSC } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "info",
  alias: ["info"],
  category: "main",
  description: "Tampilkan info lengkap tentang bot",
  usage: ".info",
  example: ".info",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function formatBytes(b) {
  if (b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.max(Math.floor(Math.log(b) / Math.log(k)), 0), sizes.length - 1);
  return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

// 🔹 DISK (request owner 1 Okt 2026: section Server di .info tambah
// "used disk" & "total disk") — Node os module GAK punya API disk, jadi:
// (1) fs.statfsSync (Node >= 18.15, Linux/VPS utama), (2) fallback df -B1,
// (3) fallback null → baris disk disembunyikan senyap, jangan bunuh .info.
// Path yang diukur = root filesystem bot berjalan (cwd), bukan partisi lain.
function getDiskUsage() {
  const target = process.cwd();
  try {
    const st = fs.statfsSync(target);
    const total = Number(st.blocks) * Number(st.bsize);
    const avail = Number(st.bavail) * Number(st.bsize);
    if (total > 0) return { total, used: total - avail, ok: true };
  } catch {}
  try {
    const out = execSync("df -B1 .", { timeout: 3000 }).toString();
    const lines = out.trim().split("\n");
    if (lines.length >= 2) {
      const cols = lines[1].trim().split(/\s+/);
      const total = parseInt(cols[1], 10);
      const used = parseInt(cols[2], 10);
      if (total > 0 && used >= 0) return { total, used, ok: true };
    }
  } catch {}
  return { ok: false };
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const botName = botConfig.bot?.name || "Rara AI - Multi Device";

    const dbInstance = getDatabase();
    const users = dbInstance?.db?.data?.users || {};
    const groups = dbInstance?.db?.data?.groups || {};
    const premium = dbInstance?.db?.data?.premium || [];

    const totalUsers = Object.keys(users).length;
    // live count (request owner 13 Sep): jumlah grup beneran yang bot ikuti,
    // gak cuma grup yang fiturnya pernah diset manual — cache 5 mnt + fallback db
    let totalGroups = Object.keys(groups).length;
    try {
      const { countGroupsLive } = await import("../../src/lib/rara-group-registry.js");
      const live = await countGroupsLive(sock, dbInstance);
      if (live > 0) totalGroups = live;
    } catch {}
    const totalPremium = Array.isArray(premium) ? premium.length : 0;
    const totalRegistered = Object.values(users).filter((u) => u?.name || u?.registered).length;

    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const usedMem = totalMem - os.freemem();
    const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
    const disk = getDiskUsage();
    const diskPercent = disk.ok ? ((disk.used / disk.total) * 100).toFixed(1) : "-";
    
    const cpuCores = os.cpus().length;
    let cpuSpeed = os.cpus()[0]?.speed || 0;
    let cpuModel = os.cpus()[0]?.model || "Unknown";
    if ((!cpuSpeed || cpuSpeed === 0) || cpuModel === "Unknown") {
      try {
        // fs already imported at top
        const cpuinfo = fs.readFileSync("/proc/cpuinfo", "utf8");
        const mhzMatch = cpuinfo.match(/cpu MHz\s*:\s*([\d.]+)/i);
        if (mhzMatch) cpuSpeed = Math.round(parseFloat(mhzMatch[1]));
        const modelMatch = cpuinfo.match(/model name\s*:\s*(.+)/i);
        if (modelMatch) cpuModel = modelMatch[1].trim();
      } catch {}
    }
    if (!cpuSpeed || cpuSpeed === 0) cpuSpeed = "-";
    const loadAvg = os.loadavg()[0].toFixed(2);
    const serverUptime = formatUptime(os.uptime() * 1000);
    const botUptime = uptime ? formatUptime(uptime) : formatUptime(process.uptime() * 1000);

    const pluginCount = getPluginCount();
    const caseCount = getCaseCount();
    const totalCategories = getCategories().length;
    const totalFeatures = pluginCount + caseCount;

    let weatherBlock = "";
    try {
      const wf = await getWeatherFooter();
      if (wf) weatherBlock = `${wf}\n\n`;
    } catch {}

    const text = `${weatherBlock}「 ${toSC("Identitas")} 」
*${toSC("Nama")}:* ${toSC(botName)}
*${toSC("Nomor")}:* ${sock?.user?.jid ? sock.user.jid.split("@")[0] : toSC("Unknown")}
*${toSC("Versi")}:* ${botConfig.bot?.version || "1.0.0"}
*${toSC("Developer")}:* ${toSC(botConfig.bot?.developer || "-")}
*${toSC("Platform")}:* ${toSC("Node.js + Baileys")}
*${toSC("Mode")}:* ${toSC((botConfig.mode || "public").toUpperCase())}
*${toSC("Prefix")}:* [ *${prefix}* ]
「 ${toSC("Info Database")} 」
*${toSC("Total User")}:* ${totalUsers}
*${toSC("Total Grup")}:* ${totalGroups}
*${toSC("User Terdaftar")}:* ${totalRegistered}
*${toSC("Premium User")}:* ${totalPremium}
*${toSC("Total Fitur")}:* ${totalFeatures}
*${toSC("Total Kategori")}:* ${totalCategories}
「 ${toSC("Server")} 」
*${toSC("OS")}:* ${os.platform()} ${os.arch()}
*${toSC("Hostname")}:* ${toSC(os.hostname())}
*${toSC("Node.js")}:* ${process.version}
*${toSC("CPU")}:* ${cpuModel}
*${toSC("Cores")}:* ${cpuCores} ${toSC("threads")} @ ${cpuSpeed} MHz
*${toSC("Load Avg")}:* ${loadAvg}
*${toSC("RAM")}:* ${formatBytes(usedMem)} / ${formatBytes(totalMem)} (${memPercent}%)
*${toSC("RAM Bot")}:* ${formatBytes(memUsage.rss)}
${disk.ok ? `*${toSC("Disk")}:* ${formatBytes(disk.used)} / ${formatBytes(disk.total)} (${diskPercent}%)\n` : ""}
*${toSC("Uptime Server")}:* ${serverUptime}
*${toSC("Uptime Bot")}:* ${botUptime}

${toSC("Rara AI - Multi Device")}`;

    // FIX OWNER 2026-09-07: card info = plain text + thumbnail externalAdReply
    // (payload interactive gak dirender di client penerima — "versi WA lama")
    await sendMenuCard(sock, m, {
      text,
      footer: "",
      thumbnailPath: path.join(process.cwd(), "assets", "image", "menu", "menuthumbnail.jpg"),
      plain: true,
      title: `${toSC(botName)} — ${toSC("Info")}`,
    });

    try { await sendMenuAudio(sock, m, db, false); } catch {}
  } catch (e) {
    console.error("[info] handler error:", e.message);
    try { await m.reply(raraError("Info", "Ada error nih, coba lagi ya")); } catch {}
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
