// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .connlog — Jurnal koneksi WhatsApp (OWNER ONLY)
// Fix 18 Sep 2026 (report owner: "bot bntar reconnect stiap 10 menit atau
// brapa menit, apakah ada fitur yg membuat bot reconnect apa dr baileysnya
// sendiri?").
//
// Setiap disconnect otomatis dicatat ke storage/connlog.json oleh
// src/lib/nova-conn-journal.js (dipasang di connection.js):
// - kode disconnect (401/440/515/timedOut/dll) + alasan
// - lama koneksi nyambung sebelum putus
// - sumber internal: watchdog (30 menit tanpa pesan = disengaja),
//   WhatsApp/Baileys drop, 440 konflik perangkat
// Command ini nunjukin riwayat + ANALISIS POLA — langsung jawab
// "reconnect tiap berapa menit dan kenapa":
//   - interval rata-rata antar-putus
//   - penyebab terbanyak
//   - uptime tiap sesi
//
// Commands:
//   .connlog          — Status + 10 putus terakhir + analisis pola
//   .connlog clear    — Hapus jurnal (owner)
import {
  getJournal,
  clearJournal,
  analyzeJournal,
} from "../../src/lib/nova-conn-journal.js";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "connlog",
  alias: ["connlog", "cekconn", "jurnalkoneksi"],
  category: "owner",
  description: "Jurnal koneksi bot — kenapa bot reconnect, tiap berapa menit",
  usage: ".connlog — Riwayat + analisis reconnect\n.connlog clear — Hapus jurnal",
  example: ".connlog",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function fmtAgo(ts) {
  const ms = Date.now() - ts;
  const m = Math.round(ms / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return m + " mnt lalu";
  const h = Math.round(m / 60);
  if (h < 24) return h + " jam lalu";
  return Math.round(h / 24) + " hari lalu";
}

function fmtDur(ms) {
  if (ms == null) return "?";
  const m = Math.round(ms / 60000);
  if (m < 60) return m + " mnt";
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return h + " jam " + (rest ? rest + " mnt" : "");
}

// panduan penyebab umum per kode — biar owner gak perlu tanya lagi
const HINTS = [
  ["440", "Konflik sesi — nomor bot dipakai/pairing di perangkat lain, atau ada 2 instance bot jalan bareng"],
  ["515", "WhatsApp server yang minta restart koneksi (stream error) — normal kalau sesekali, sering = cek versi baileys"],
  ["timedOut", "Koneksi idle kepotong — cek jaringan VPS / IP datacenter ke-block WhatsApp"],
  ["401", "Sesi kedaluwarsa — perlu pairing ulang"],
  ["watchdog", "Bukan error — fitur watchdog internal nyabut koneksi setelah 30 menit tanpa pesan masuk (normal pas sepi)"],
];

async function handler(m, { config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    const args = (m.text || "").trim().split(/\s+/);
    const sub = (args[0] || "").toLowerCase();

    if (sub === "clear" || sub === "hapus") {
      clearJournal();
      return m.reply(claraWrap("Conn Log", [
        "Jurnal koneksi dihapus.",
        "",
        tipText("Riwayat baru mulai tercatat dari sekarang"),
      ]));
    }

    const entries = getJournal();
    const a = analyzeJournal();

    if (!entries.length) {
      return m.reply(claraWrap("Conn Log", [
        "Jurnal masih kosong — belum ada catatan disconnect/connect.",
        "",
        tipText("Jurnal otomatis tercatat tiap bot putus/nyambung. Coba lagi setelah reconnect berikutnya"),
      ]));
    }

    // NOTE: claraWrap guard .trim() elemen pertama — subHeader object gak
    // boleh di posisi 0, jadi baris pertama wajib string.
    const lines = ["Riwayat koneksi — tercatat otomatis tiap bot putus/nyambung."];

    // ── STATUS ──
    lines.push({ subHeader: "Status Koneksi" });
    lines.push("Nyambung terakhir : " + (a.lastConnectAt ? fmtAgo(a.lastConnectAt) : "?"));
    lines.push("Total tercatat    : " + a.disconnectCount + " kali putus / " + a.total + " entri");
    lines.push("");

    // ── ANALISIS POLA ──
    lines.push({ subHeader: "Analisis Pola Putus" });
    if (a.disconnectCount > 1 && a.intervals.avgMs) {
      lines.push("Interval antar-putus : rata² " + fmtDur(a.intervals.avgMs) +
        " (tercepat " + fmtDur(a.intervals.minMs) + ", terlama " + fmtDur(a.intervals.maxMs) + ")");
    } else {
      lines.push("Interval antar-putus : butuh minimal 2 kali putus buat hitung pola");
    }
    const reasons = Object.entries(a.byReason).sort((x, y) => y[1] - x[1]);
    lines.push("Penyebab terbanyak   : " + (reasons[0] ? reasons[0][0] + " × " + reasons[0][1] : "-"));
    lines.push("");

    // ── RIWAYAT 10 TERAKHIR ──
    lines.push({ subHeader: "Riwayat Putus (10 Terakhir)" });
    if (!a.recent.length) {
      lines.push("Belum ada disconnect tercatat — koneksi sehat.");
    }
    for (const d of a.recent) {
      const kode = d.code ? "kode " + d.code : "watchdog";
      lines.push("• " + fmtAgo(d.ts) + " — " + kode);
      lines.push("  " + d.msg);
      if (d.uptimeMs != null) lines.push("  Nyambung " + fmtDur(d.uptimeMs) + " sebelum putus");
    }
    lines.push("");

    // ── PANDUAN PENYEBAB ──
    lines.push({ subHeader: "Arti Penyebab Umum" });
    for (const [kode, arti] of HINTS) {
      lines.push("• " + kode + " — " + arti);
    }
    lines.push("");
    lines.push(tipText("Hapus jurnal: `" + prefix + "connlog clear`"));

    return m.reply(claraWrap("Conn Log", lines));
  } catch (err) {
    return m.reply(claraWrap("Conn Log", [
      "Gagal baca jurnal koneksi: " + (err?.message || String(err)),
    ], "error"));
  }
}

export { pluginConfig as config, handler };
export default { pluginConfig, handler };
