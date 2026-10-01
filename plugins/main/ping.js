// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .ping — cek performa & status sistem.
// REWORK 2026-09-11 (owner: "fitur .ping itu rusak, hps ping2"):
// - .ping2 DIHAPUS total (duplikat, plugins/main/ping2.js di-git rm)
// - .ping lama RUSAK: tiap run upload gambar ke pixhost.to (node-upload-
//   images) + bikin product card AIRich + baca config.assets.rara2 via
//   node-webpmux — upload/aset gagal = error. AI Rich juga cuma boleh
//   buat .web. Sekarang: pure stats + raraInfoSections, TANPA upload.
import { raraError, raraInfoSections } from "../../src/lib/rara-menu-style.js";
import os from "os";
import fs from "fs";
import { performance } from "perf_hooks";
import { execSync } from "child_process";
import { fetchTrace } from "../../src/lib/rara-speedtest.js";

// IP lokal pertama (non-internal IPv4) — fail-safe
function getLocalIp() {
  try {
    const nets = os.networkInterfaces();
    for (const list of Object.values(nets)) {
      const found = (list || []).find((n) => n.family === "IPv4" && !n.internal);
      if (found) return found.address;
    }
  } catch {}
  return "-";
}

// DNS resolver server (dari /etc/resolv.conf) — fail-safe
function getDnsServers() {
  try {
    const txt = fs.readFileSync("/etc/resolv.conf", "utf-8");
    const ns = txt.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("nameserver")).map((l) => l.split(/\s+/)[1]);
    return ns.length ? ns.join(", ") : "-";
  } catch {
    return "-";
  }
}

const pluginConfig = {
  name: "ping",
  alias: ["ping"], // .speed dipindah ke .speedtest (request owner "tmbah speedtes")
  category: "main",
  description: "Cek performa dan status sistem bot secara real-time",
  usage: ".ping",
  example: ".ping",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const fmtUp = (s) => {
  s = Number(s);
  const d = Math.floor(s / 86400),
    h = Math.floor((s % 86400) / 3600),
    m = Math.floor((s % 3600) / 60),
    sc = Math.floor(s % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sc}s`;
  return `${m}m ${sc}s`;
};

// 🔹 DISK (request owner 1 Okt 2026: .ping juga tambah used/total disk —
// konsisten sama .info): statfs dulu, fallback df -B1, gagal → skip senyap.
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

const fmtSize = (b) => {
  if (!b || b === 0) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(b) / Math.log(1024)), u.length - 1);
  return `${(b / Math.pow(1024, i)).toFixed(2)} ${u[i]}`;
};

async function handler(m, { sock }) {
  const tStart = performance.now();
  try {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPct = ((usedMem / totalMem) * 100).toFixed(1);
    const memoryUsage = process.memoryUsage();
    const disk = getDiskUsage();
    const diskPct = disk.ok ? ((disk.used / disk.total) * 100).toFixed(1) : null;
    const loadAvg = os.loadavg();

    // panel — label smallcaps otomatis via raraInfoSections, value verbatim
    const info = [
      "Sistem",
      { label: "OS", value: `${os.type()} (${os.release()})` },
      { label: "Platform", value: `${os.platform()} (${os.arch()})` },
      { label: "Hostname", value: os.hostname() },
      { label: "Node.js", value: process.version },
      { label: "Uptime Bot", value: fmtUp(process.uptime()) },
      { label: "Uptime Server", value: fmtUp(os.uptime()) },
      "CPU",
      { label: "Model", value: String(cpus[0]?.model || "Unknown").trim() },
      { label: "Cores", value: `${cpus.length} Core(s)` },
      { label: "Speed", value: `${cpus[0]?.speed || 0} MHz` },
      { label: "Load Avg", value: `${loadAvg[0].toFixed(2)} (1m), ${loadAvg[1].toFixed(2)} (5m), ${loadAvg[2].toFixed(2)} (15m)` },
      "Memori",
      { label: "Total RAM", value: fmtSize(totalMem) },
      { label: "Dipakai", value: `${fmtSize(usedMem)} (${memPct}%)` },
      { label: "Sisa Bebas", value: fmtSize(freeMem) },
      { label: "RSS Node.js", value: fmtSize(memoryUsage.rss) },
    ];
    if (disk.ok) {
      info.push(
        "Penyimpanan",
        { label: "Total Disk", value: fmtSize(disk.total) },
        { label: "Dipakai", value: `${fmtSize(disk.used)} (${diskPct}%)` }
      );
    }

    const execTime = (performance.now() - tStart).toFixed(2);

    // panel Jaringan — IP publik + lokasi (Cloudflare trace) + IP lokal + DNS resolver
    const trace = await Promise.race([
      fetchTrace(),
      new Promise((r) => setTimeout(() => r({ ip: "-", colo: "-", loc: "-" }), 4000)),
    ]);
    info.push(
      "Jaringan",
      { label: "IP Publik", value: trace.ip },
      { label: "IP Lokal", value: getLocalIp() },
      { label: "Lokasi", value: `${trace.colo}${trace.loc && trace.loc !== "-" ? ` (${trace.loc})` : ""}` },
      { label: "DNS", value: getDnsServers() }
    );

    await m.reply(`🏓 pong! (${execTime}ms)\n\n` + raraInfoSections(info));
  } catch (error) {
    await m.reply(raraError("ping", error.message));
  }
  return { handled: true };
}

export { pluginConfig as config, handler };
