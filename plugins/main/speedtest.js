// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .speedtest — tes kecepatan internet (ping/jitter/download/upload).
// Request owner 11 Sep 2026: "tmbah speedtes".
// Sumber: Cloudflare speed endpoint (https://speed.cloudflare.com) — gratis,
// tanpa key, HTTPS-only: /cdn-cgi/trace (info IP/colo), /__down (download),
// /__up (upload). Progress live via edit-in-place (pola rpgScene).
import { novaError, novaInfoSections, toSC } from "../../src/lib/nova-menu-style.js";
import { performance } from "perf_hooks";

const pluginConfig = {
  name: "speedtest",
  alias: ["speedtest", "speedtes", "speed"],
  category: "main",
  description: "Tes kecepatan internet: ping, jitter, download, upload",
  usage: ".speedtest",
  example: ".speedtest",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 60,
  energi: 0,
  isEnabled: true,
};

const CF = {
  trace: "https://speed.cloudflare.com/cdn-cgi/trace",
  down: (bytes) => `https://speed.cloudflare.com/__down?bytes=${bytes}`,
  up: "https://speed.cloudflare.com/__up",
};

// ─── info koneksi: IP publik + lokasi colo Cloudflare ───
async function fetchTrace() {
  try {
    const res = await fetch(CF.trace, { cache: "no-store" });
    const txt = await res.text();
    const map = {};
    for (const line of txt.split("\n")) {
      const i = line.indexOf("=");
      if (i > 0) map[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    return { ip: map.ip || "-", colo: map.colo || "-", loc: map.loc || "-" };
  } catch {
    return { ip: "-", colo: "-", loc: "-" };
  }
}

// ─── ping & jitter: 4x probe kecil, ambil terbaik ───
async function measureLatency() {
  const samples = [];
  for (let i = 0; i < 4; i++) {
    const t0 = performance.now();
    try {
      const res = await fetch(CF.down(0), { cache: "no-store" });
      await res.arrayBuffer();
      samples.push(performance.now() - t0);
    } catch {}
  }
  if (!samples.length) throw new Error("gak bisa nyambung ke server tes");
  samples.sort((a, b) => a - b);
  const best = samples[0];
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  let jitter = 0;
  if (samples.length > 1) {
    let sum = 0;
    for (let i = 1; i < samples.length; i++) sum += Math.abs(samples[i] - samples[i - 1]);
    jitter = sum / (samples.length - 1);
  }
  return { best, jitter };
}

// ─── download: stream 25MB (cap 12 dtk), progress callback ───
async function measureDownload(onProgress) {
  const TARGET = 25_000_000;
  const LIMIT_MS = 12_000;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), LIMIT_MS);
  let received = 0;
  const t0 = performance.now();
  try {
    const res = await fetch(CF.down(TARGET), { cache: "no-store", signal: abort.signal });
    const reader = res.body.getReader();
    let lastEdit = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      const now = performance.now();
      if (onProgress && now - lastEdit > 900) {
        lastEdit = now;
        try { await onProgress(received / TARGET, (received * 8) / ((now - t0) / 1000) / 1e6); } catch {}
      }
    }
  } catch {} // abort di tengah jalan = hasil parsial tetap valid
  finally { clearTimeout(timer); }
  const secs = (performance.now() - t0) / 1000;
  if (!received) throw new Error("download gagal — server tes gak merespon");
  return { mbps: (received * 8) / secs / 1e6, bytes: received };
}

// ─── upload: probe 1MB dulu, kalau cepat lanjut 4MB biar akurat ───
async function measureUploadOnce(size) {
  const body = new Uint8Array(size);
  const t0 = performance.now();
  const res = await fetch(CF.up, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body,
    cache: "no-store",
  });
  await res.arrayBuffer();
  const secs = (performance.now() - t0) / 1000;
  return { mbps: (size * 8) / secs / 1e6, bytes: size, secs };
}

async function measureUpload() {
  const warm = await measureUploadOnce(1_000_000);
  if (warm.secs > 4) return warm; // koneksi lambat — jangan bikin nunggu lama
  try {
    const main = await measureUploadOnce(4_000_000);
    if (main.mbps > 0) return main;
  } catch {}
  return warm;
}

const fmtMB = (bytes) => `${(bytes / 1e6).toFixed(1)} MB`;

async function handler(m, { sock }) {
  await m.react("🕒");
  // ─── morphing progress: edit pesan yang sama, fallback reply ───
  let key = null;
  const stage = async (text) => {
    try {
      if (sock?.sendMessage) {
        if (!key) {
          const sent = await sock.sendMessage(m.chat, { text });
          key = sent?.key || null;
          return;
        }
        await sock.sendMessage(m.chat, { text, edit: key });
        return;
      }
    } catch { key = null; }
    await m.reply(text);
  };
  const head = (line) => `「 ✦ ${toSC("Speedtest")} ✦ 」\n\n${line}`;

  const tAll = performance.now();
  try {
    await stage(head(`📡 ${toSC("Menghubungkan ke server tes...")}`));
    const trace = await fetchTrace();

    await stage(head(`🏓 ${toSC("Mengukur ping...")}`));
    const { best, jitter } = await measureLatency();

    await stage(head(`🏓 ${toSC("Ping")}: ${best.toFixed(1)} ms\n⬇️ ${toSC("Mengukur download")}...`));
    const down = await measureDownload(async (frac, mbps) => {
      await stage(head(`🏓 ${toSC("Ping")}: ${best.toFixed(1)} ms\n⬇️ ${toSC("Download")}: ${(frac * 100).toFixed(0)}% (${mbps.toFixed(1)} Mbps)`));
    });

    await stage(head(`⬇️ ${toSC("Download")}: ${down.mbps.toFixed(1)} Mbps\n⬆️ ${toSC("Mengukur upload")}...`));
    const up = await measureUpload();

    const totalS = ((performance.now() - tAll) / 1000).toFixed(1);
    const totalBytes = down.bytes + up.bytes;
    const rating = down.mbps >= 50 ? "kencang banget 🚀" : down.mbps >= 15 ? "lumayan kencang 👍" : down.mbps >= 5 ? "standar" : "lambat, sinyal/ISP perlu dicek";

    const info = [
      "Hasil Tes",
      { label: "Ping", value: `${best.toFixed(1)} ms` },
      { label: "Jitter", value: `${jitter.toFixed(1)} ms` },
      { label: "Download", value: `${down.mbps.toFixed(1)} Mbps` },
      { label: "Upload", value: `${up.mbps.toFixed(1)} Mbps` },
      "Koneksi",
      { label: "IP Publik", value: trace.ip },
      { label: "Lokasi Server", value: `${trace.colo}${trace.loc && trace.loc !== "-" ? ` (${trace.loc})` : ""}` },
      { label: "Sumber", value: "Cloudflare" },
      "Info",
      { label: "Status", value: rating },
      { label: "Kuota Terpakai", value: `~${fmtMB(totalBytes)}` },
      { label: "Waktu Tes", value: `${totalS} detik` },
    ];

    await m.react("🐣");
    await stage(`「 ✦ ${toSC("Speedtest")} ✦ 」\n\n` + novaInfoSections(info));
  } catch (error) {
    await m.reply(novaError("speedtest", error.message));
  }
  return { handled: true };
}

export { pluginConfig as config, handler };
