// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { exec } from "child_process";
import os from "os";
import { novaWrap, tipText } from "../../src/lib/nova-menu-style.js";
import { startStatusRotation } from "../../src/lib/nova-status-rotate.js";

const pluginConfig = {
  name: "speedtest",
  alias: ["speedtest"],
  category: "info",
  description: "Tes kecepatan internet panel/VPS (download, upload, ping)",
  usage: ".speedtest",
  example: ".speedtest",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

// knob: kecepatan rotasi status (ms) — default 4 dtk
const ROTATE_MS = parseInt(process.env.NOVA_SPEEDTEST_ROTATE_MS) || 4000;

function execAsync(cmd, opts = {}) {
  return new Promise((resolve) => {
    exec(cmd, opts, (err, stdout) => resolve({ err, stdout: stdout || "" }));
  });
}

function formatSpeed(bytesPerSec) {
  if (bytesPerSec >= 1000000000) return (bytesPerSec / 1000000000).toFixed(2) + " Gbps";
  if (bytesPerSec >= 1000000) return (bytesPerSec / 1000000).toFixed(2) + " Mbps";
  if (bytesPerSec >= 1000) return (bytesPerSec / 1000).toFixed(2) + " Kbps";
  return bytesPerSec.toFixed(0) + " bps";
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ═════════════════════════════════════════════════════════════════
// KARTU STATUS BERPUTAR (13 Sep 2026) — sebelumnya tes 5-60 dtk
// cuma react 🕒 terus diam; sekarang 1 pesan di-edit berputar
// 🔍 ping → ⬇️ unduh → ⬆️ unggah → ✅ susun hasil.
// ═════════════════════════════════════════════════════════════════
const STATUS_PHASES = [
  () => novaWrap("Speedtest Berjalan", [
    "⚡ *TES KECEPATAN DIMULAI*",
    "",
    "🔍 Mengukur ping ke server...",
    "",
    "_biasanya 5-30 detik, sabar ya_ ✨",
  ].join("\n")),
  () => novaWrap("Speedtest Berjalan", [
    "⚡ *TES KECEPATAN JALAN*",
    "",
    "⬇️ Mengunduh file tes...",
    "",
    "_ngukur kecepatan download_ ✨",
  ].join("\n")),
  () => novaWrap("Speedtest Berjalan", [
    "⚡ *TES KECEPATAN JALAN*",
    "",
    "⬆️ Mengunggah file tes...",
    "",
    "_ngukur kecepatan upload_ ✨",
  ].join("\n")),
  () => novaWrap("Speedtest Berjalan", [
    "⚡ *TES KECEPATAN JALAN*",
    "",
    "✅ Menyusun hasil...",
    "",
    "_bentar lagi keluar_ ✨",
  ].join("\n")),
];

async function runSpeedtest() {
  // Cek apakah speedtest-cli tersedia (ASYNC — event loop tetap hidup
  // biar rotasi status bisa jalan; execSync dulu blokin semuanya)
  let hasSpeedtestCli = false;
  try {
    let r = await execAsync("which speedtest-cli || which speedtest", { stdio: "ignore", timeout: 5000 });
    if (!r.err) hasSpeedtestCli = true;
    if (!hasSpeedtestCli) {
      r = await execAsync("npx --yes speedtest-net --version", { stdio: "ignore", timeout: 15000 });
      hasSpeedtestCli = !r.err;
    }
  } catch {
    hasSpeedtestCli = false;
  }

  if (hasSpeedtestCli) {
    const { stdout } = await execAsync(
      "speedtest-cli --simple 2>/dev/null || npx --yes speedtest-cli --simple 2>/dev/null",
      { encoding: "utf8", timeout: 60000, maxBuffer: 1024 * 1024 * 10 },
    );
    if (stdout) {
      const lines = stdout.trim().split("\n");
      const ping = lines.find((l) => l.toLowerCase().startsWith("ping:"))?.split(":")[1]?.trim() || "N/A";
      const download = lines.find((l) => l.toLowerCase().startsWith("download:"))?.split(":")[1]?.trim() || "N/A";
      const upload = lines.find((l) => l.toLowerCase().startsWith("upload:"))?.split(":")[1]?.trim() || "N/A";
      return { ping, download, upload, method: "speedtest-cli" };
    }
  }

  // Fallback: tes manual dengan curl download + upload
  // 1. Ping test (HTTP latency)
  let pingMs = "N/A";
  try {
    const pingStart = Date.now();
    await fetch("https://www.google.com", { method: "HEAD", signal: AbortSignal.timeout(10000) });
    pingMs = (Date.now() - pingStart) + " ms";
  } catch {
    try {
      const pingStart = Date.now();
      await fetch("https://cloudflare.com/cdn-cgi/trace", { signal: AbortSignal.timeout(10000) });
      pingMs = (Date.now() - pingStart) + " ms";
    } catch {
      pingMs = "Timeout";
    }
  }

  // 2. Download speed test (10MB dari Cloudflare)
  let downloadSpeed = "N/A";
  try {
    const dlStart = Date.now();
    const res = await fetch("https://speed.cloudflare.com/__down?bytes=10000000", {
      signal: AbortSignal.timeout(30000),
    });
    const buf = await res.arrayBuffer();
    const elapsed = (Date.now() - dlStart) / 1000;
    if (elapsed > 0) {
      downloadSpeed = formatSpeed(buf.byteLength / elapsed);
    }
  } catch {
    downloadSpeed = "Failed";
  }

  // 3. Upload speed test (2MB ke Cloudflare)
  let uploadSpeed = "N/A";
  try {
    const payload = new Uint8Array(2000000);
    const ulStart = Date.now();
    await fetch("https://speed.cloudflare.com/__up", {
      method: "POST",
      body: payload,
      signal: AbortSignal.timeout(30000),
    });
    const elapsed = (Date.now() - ulStart) / 1000;
    if (elapsed > 0) {
      uploadSpeed = formatSpeed(2000000 / elapsed);
    }
  } catch {
    uploadSpeed = "Failed";
  }

  return { ping: pingMs, download: downloadSpeed, upload: uploadSpeed, method: "cloudflare-fallback" };
}

// seam test: inject pengganti runSpeedtest biar e2e gak perlu jaringan beneran
let _speedtestFn = runSpeedtest;
export function _setSpeedtestFnForTest(fn) { _speedtestFn = fn; }
export function _resetSpeedtestFnForTest() { _speedtestFn = runSpeedtest; }

function buildResultCard(sys, result) {
  return novaWrap("Hasil Speedtest", [
    "⚡ *HASIL TES KECEPATAN*",
    "",
    `🖥 Host: ${sys.hostname}`,
    `📦 Platform: ${sys.platform} (${sys.arch})`,
    `⏱ Uptime: ${sys.uptime}`,
    `🧠 CPU: ${sys.cpuModel}`,
    `🔩 Cores: ${sys.cpuCores}`,
    `💾 RAM: ${sys.ram}`,
    "",
    `📶 Ping: *${result.ping}*`,
    `⬇️ Download: *${result.download}*`,
    `⬆️ Upload: *${result.upload}*`,
    `📡 Metode: ${result.method}`,
  ].join("\n")) + "\n" + tipText("Tes lagi kapan aja: .speedtest");
}

async function handler(m, { sock }) {
  let stopper = null;
  try {
    await m.react("⚡");

    // kartu status berputar — 1 pesan di-edit selama tes jalan
    const statusMsg = await sock.sendMessage(m.chat, { text: STATUS_PHASES[0]() });
    // fase 1-3 di-cycle 5x (±60 dtk) — tes panjang tetap ada animasi,
    // tes kilat berhenti di stopper() duluan
    const rotPhases = [STATUS_PHASES[1], STATUS_PHASES[2], STATUS_PHASES[3], STATUS_PHASES[1], STATUS_PHASES[2], STATUS_PHASES[3], STATUS_PHASES[1], STATUS_PHASES[2], STATUS_PHASES[3], STATUS_PHASES[1], STATUS_PHASES[2], STATUS_PHASES[3], STATUS_PHASES[1], STATUS_PHASES[2], STATUS_PHASES[3]];
    stopper = startStatusRotation(async (txt) => {
      try { await sock.sendMessage(m.chat, { text: txt, edit: statusMsg?.key }); } catch {}
    }, rotPhases.map((f) => f()), ROTATE_MS);

    // Info sistem dasar
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const sys = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      uptime: formatUptime(os.uptime()),
      cpuModel: cpus.length > 0 ? cpus[0].model : "Unknown",
      cpuCores: cpus.length,
      ram: `${((totalMem - freeMem) / 1000000).toFixed(0)} / ${(totalMem / 1000000).toFixed(0)} MB (${(((totalMem - freeMem) / totalMem) * 100).toFixed(1)}%)`,
    };

    // Jalankan speedtest (async — rotasi tetap jalan di belakang)
    const result = await _speedtestFn();

    stopper(); stopper = null;
    // status card → hasil card (edit pesan yang sama)
    try {
      await sock.sendMessage(m.chat, { text: buildResultCard(sys, result), edit: statusMsg?.key });
    } catch {}
    await m.react("🐣");
  } catch (err) {
    if (stopper) stopper();
    await m.react("❌");
    await m.reply(`❌ Speedtest error: ${err.message || "Unknown error"}`);
  }
}

export { pluginConfig as config, handler };
