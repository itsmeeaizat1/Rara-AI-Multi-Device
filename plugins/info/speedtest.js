// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { execSync } from "child_process";
import os from "os";
import config from "../../config.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

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

async function runSpeedtest() {
  // Cek apakah speedtest-cli tersedia
  let hasSpeedtestCli = false;
  try {
    execSync("which speedtest-cli || which speedtest", { stdio: "ignore", timeout: 5000 });
    hasSpeedtestCli = true;
  } catch {
    // Coba npx
    try {
      execSync("npx --yes speedtest-net --version", { stdio: "ignore", timeout: 15000 });
      hasSpeedtestCli = true;
    } catch {
      hasSpeedtestCli = false;
    }
  }

  if (hasSpeedtestCli) {
    // Pakai speedtest-cli
    let output;
    try {
      output = execSync("speedtest-cli --simple 2>/dev/null || npx --yes speedtest-cli --simple 2>/dev/null", {
        encoding: "utf8",
        timeout: 60000,
        maxBuffer: 1024 * 1024 * 10,
      });
    } catch {
      output = "";
    }

    if (output) {
      const lines = output.trim().split("\n");
      const ping = lines.find((l) => l.toLowerCase().startsWith("ping:"))?.split(":")[1]?.trim() || "N/A";
      const download = lines.find((l) => l.toLowerCase().startsWith("download:"))?.split(":")[1]?.trim() || "N/A";
      const upload = lines.find((l) => l.toLowerCase().startsWith("upload:"))?.split(":")[1]?.trim() || "N/A";
      return { ping, download, upload, method: "speedtest-cli" };
    }
  }

  // Fallback: tes manual dengan curl download + upload
  // 1. Ping test (HTTP latency ke multiple servers)
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

  // 2. Download speed test (download 10MB dari Cloudflare)
  let downloadSpeed = "N/A";
  try {
    const dlStart = Date.now();
    const res = await fetch("https://speed.cloudflare.com/__down?bytes=10000000", {
      signal: AbortSignal.timeout(30000),
    });
    const buf = await res.arrayBuffer();
    const elapsed = (Date.now() - dlStart) / 1000;
    if (elapsed > 0) {
      const bytesPerSec = buf.byteLength / elapsed;
      downloadSpeed = formatSpeed(bytesPerSec);
    }
  } catch {
    downloadSpeed = "Failed";
  }

  // 3. Upload speed test (upload 2MB ke Cloudflare)
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
      const bytesPerSec = 2000000 / elapsed;
      uploadSpeed = formatSpeed(bytesPerSec);
    }
  } catch {
    uploadSpeed = "Failed";
  }

  return { ping: pingMs, download: downloadSpeed, upload: uploadSpeed, method: "cloudflare-fallback" };
}

async function handler(m, { sock }) {
  try {
    // Info sistem dasar
    const hostname = os.hostname();
    const platform = os.platform();
    const arch = os.arch();
    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model : "Unknown";
    const cpuCores = cpus.length;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = ((usedMem / totalMem) * 100).toFixed(1);
    const uptime = formatUptime(os.uptime());

    // Jalankan speedtest
    const result = await runSpeedtest();

    let text = `╭─「 Speedtest 」\n│ *ʜᴏꜱᴛ:* ${hostname}
│ *ᴘʟᴀᴛꜰᴏʀᴍ:* ${platform} (${arch})
│ *ᴜᴘᴛɪᴍᴇ:* ${uptime}
╰──────────

╭─「 CPU & RAM 」\n│ *ᴄᴘᴜ:* ${cpuModel}
│ *ᴄᴏʀᴇꜱ:* ${cpuCores}
│ *ʀᴀᴍ:* ${(usedMem / 1000000).toFixed(0)} / ${(totalMem / 1000000).toFixed(0)} MB (${memUsage}%)
╰──────────

╭─「 Network 」\n│ *ᴘɪɴɢ:* ${result.ping}
│ *ᴅᴏᴡɴʟᴏᴀᴅ:* ${result.download}
│ *ᴜᴘʟᴏᴀᴅ:* ${result.upload}
╰──────────

│ Metode: ${result.method}`;
    await m.reply(claraWrap("speedtest", text));
  } catch (err) {
    await m.reply(`╭─「 Speedtest Error 」\n│ ${err.message || "Unknown error"}
╰──────────`);
  }
}

export { pluginConfig as config, handler };
