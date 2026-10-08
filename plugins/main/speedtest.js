// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .speedtest — tes kecepatan internet (ping/jitter/download/upload).
// Request owner 11 Sep 2026: "tmbah speedtes".
// Sumber: Cloudflare speed endpoint (https://speed.cloudflare.com) — gratis,
// tanpa key, HTTPS-only: /cdn-cgi/trace (info IP/colo), /__down (download),
// /__up (upload). Progress live via edit-in-place (pola rpgScene).
import { raraError, raraInfoSections, toSC } from "../../src/lib/rara-menu-style.js";
import { performance } from "perf_hooks";
import { fetchTrace, measureLatency, measureDownload, measureUpload, saveSpeedtest } from "../../src/lib/rara-speedtest.js";

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

const fmtMB = (bytes) => `${(bytes / 1e6).toFixed(1)} MB`;

async function handler(m, { sock, db }) {
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
    const lat = await measureLatency();

    await stage(head(`🏓 ${toSC("Ping")}: ${lat.best.toFixed(1)} ms\n⬇️ ${toSC("Mengukur download")}...`));
    const down = await measureDownload(async (frac, mbps) => {
      await stage(head(`🏓 ${toSC("Ping")}: ${lat.best.toFixed(1)} ms\n⬇️ ${toSC("Download")}: ${(frac * 100).toFixed(0)}% (${mbps.toFixed(1)} Mbps)`));
    });

    await stage(head(`⬇️ ${toSC("Download")}: ${down.mbps.toFixed(1)} Mbps\n⬆️ ${toSC("Mengukur upload")}...`));
    const up = await measureUpload();

    // hasil juga DISIMPAN sebagai tanda kecepatan server (request owner
    // 11 Sep) — tampil di Info Server allmenu
    const result = {
      ping: Number(lat.best.toFixed(1)),
      jitter: Number(lat.jitter.toFixed(1)),
      down: Number(down.mbps.toFixed(1)),
      up: Number(up.mbps.toFixed(1)),
      bytes: down.bytes + up.bytes,
      ip: trace.ip, colo: trace.colo, loc: trace.loc,
      date: new Date().toISOString(),
    };
    if (db) saveSpeedtest(db, result);

    const totalS = ((performance.now() - tAll) / 1000).toFixed(1);
    const totalBytes = result.bytes;
    const rating = down.mbps >= 50 ? "kencang banget 🚀" : down.mbps >= 15 ? "lumayan kencang 👍" : down.mbps >= 5 ? "standar" : "lambat, sinyal/ISP perlu dicek";

    const info = [
      "Hasil Tes",
      { label: "Ping", value: `${lat.best.toFixed(1)} ms` },
      { label: "Jitter", value: `${lat.jitter.toFixed(1)} ms` },
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
    await stage(`『 *${toSC("Speedtest")}* 』\n\n` + raraInfoSections(info)); // OWNER 8 Okt: gaya baru
  } catch (error) {
    await m.reply(raraError("speedtest", error.message));
  }
  return { handled: true };
}

export { pluginConfig as config, handler };
