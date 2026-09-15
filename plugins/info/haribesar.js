// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// haribesar.js — kontrol NOTIFIER HARI BESAR & TANGGAL MERAH INDONESIA
// (request owner 16 Sep 2026): jam 08:00 WIB bot kirim pesan SEKALI per hari
// "Selamat Hari X" + tanggal + badge tanggal merah + pesan inspirasi AI.
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import {
  getHariBesar, addCustomDay, removeCustomDay, listCustomDays,
  upcomingHariBesar, setSubscribed, isSubscribed, setAllGroups, getAllGroups,
  getSubs, buildHariBesarText, listLiburMendatang,
} from "../../src/lib/nova-haribesar.js";

const pluginConfig = {
  name: "haribesar",
  alias: ["tanggalmerah", "haribesarindonesia", "haripenting", "harinasional"],
  category: "info",
  description: "Notif otomatis hari besar & tanggal merah Indonesia — kirim jam 08:00 WIB + pesan inspirasi AI",
  usage: ".haribesar <on/off/all on/all off/status/test/libur>\n.haribesar tambah <DD-MM[-YYYY]> | <Nama> [| merah]\n.haribesar hapus <DD-MM[-YYYY]>\n.haribesar list",
  example: ".haribesar on\n.haribesar all on\n.haribesar libur\n.haribesar tambah 20-03-2026 | Idulfitri | merah",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, args, prefix }) {
  const sub = String(args?.[0] || "").toLowerCase();
  const pf = prefix || ".";
  const chat = m.chat;

  // ─── langganan on/off per chat ───
  if (sub === "on" || sub === "off") {
    const on = sub === "on";
    const total = setSubscribed(chat, on);
    return m.reply(claraWrap("hari besar", [
      `Fitur : notif hari besar`,
      `Status : ${on ? "AKTIF" : "NONAKTIF"} di ${m.isGroup ? "grup ini" : "chat ini"}`,
      ``,
      on ? `Bot akan kirim pesan hari besar jam 08:00 WIB` : `Notif dimatikan di chat ini`,
      `Total chat langganan : ${total}`,
    ].join("\n")));
  }

  // ─── mode semua grup (owner — setting global) ───
  if (sub === "all") {
    if (!m.isOwner) return m.reply(claraWrap("hari besar", [
      `Khusus owner — mengubah mode semua grup.`,
    ].join("\n")));
    const on = String(args?.[1] || "").toLowerCase() !== "off";
    setAllGroups(on);
    return m.reply(claraWrap("hari besar", [
      `Fitur : notif hari besar`,
      `Mode : ${on ? "SEMUA GRUP ON — kirim ke semua grup yang bot masuk" : "kembali ke mode langganan per chat"}`,
      ``,
      `Langganan manual : ${getSubs().length} chat`,
      `Kontrol : ${pf}haribesar all on | ${pf}haribesar all off`,
    ].join("\n")));
  }

  // ─── tambah hari custom (libur bergerak dsb) ───
  if (sub === "tambah" || sub === "add") {
    if (!m.isOwner) return m.reply(claraWrap("hari besar", [
      `Khusus owner — tambah hari custom mengubah kalender global.`,
    ].join("\n")));
    const raw = m.text || "";
    const pipe = raw.split("|").map((s) => s.trim()).filter(Boolean);
    // pipe[0] = ".haribesar tambah 15-06-2027" → buang command + sub → tanggal
    const dateStr = (pipe[0] || "").split(/\s+/).slice(2).join(" ");
    const nama = pipe[1] || "";
    const merah = (pipe[2] || "").toLowerCase().includes("merah");
    if (!dateStr || !nama) {
      return m.reply(claraWrap("hari besar", [
        `Format : ${pf}haribesar tambah <DD-MM atau DD-MM-YYYY> | <Nama Hari> [| merah]`,
        ``,
        `DD-MM = tahunan (tiap tahun sama)`,
        `DD-MM-YYYY = hanya tahun itu (cocok buat libur bergerak: Idulfitri, Nyepi, dll)`,
        ``,
        `Contoh : ${pf}haribesar tambah 20-03-2026 | Idulfitri | merah`,
      ].join("\n")));
    }
    const r = addCustomDay(dateStr, nama, merah);
    if (!r.ok) {
      return m.reply(claraWrap("hari besar", [
        `Tanggal "${dateStr}" tidak valid.`,
        `Gunakan DD-MM atau DD-MM-YYYY, contoh: 22-12 atau 20-03-2026`,
      ].join("\n")));
    }
    return m.reply(claraWrap("hari besar", [
      `Hari custom ditambahkan`,
      `Tanggal : ${r.key} (${r.yearly ? "tahunan" : "sekali di tahun itu"})`,
      `Nama : ${nama}${merah ? " (tanggal merah)" : ""}`,
      ``,
      `Notif akan terkirim jam 08:00 WIB di tanggal tersebut.`,
      `Hapus : ${pf}haribesar hapus ${dateStr}`,
    ].join("\n")));
  }

  // ─── hapus hari custom ───
  if (sub === "hapus" || sub === "del" || sub === "delete") {
    if (!m.isOwner) return m.reply(claraWrap("hari besar", [
      `Khusus owner — hapus hari custom mengubah kalender global.`,
    ].join("\n")));
    const dateStr = String(args?.[1] || "");
    if (!dateStr) return m.reply(`Format : ${pf}haribesar hapus <DD-MM[-YYYY]>`);
    const r = removeCustomDay(dateStr);
    return m.reply(claraWrap("hari besar", [
      r.removed > 0 ? `Hari custom "${dateStr}" dihapus (${r.removed})` : `Hari custom "${dateStr}" tidak ditemukan`,
    ].join("\n")));
  }

  // ─── daftar LIBUR NASIONAL 90 hari ke depan + label H-X ───
  if (sub === "libur" || sub === "jadwal") {
    const items = listLiburMendatang(null, 90);
    if (!items.length) {
      return m.reply(claraWrap("hari besar", [
        `Tidak ada hari libur nasional dalam 90 hari ke depan.`,
        `Tambah manual: ${pf}haribesar tambah DD-MM-YYYY | Nama | merah`,
      ].join("\n")));
    }
    const lines = [`Hari Libur Nasional — 90 hari ke depan`, ``];
    items.slice(0, 12).forEach((it, i) => {
      const d = it.ymd.split("-");
      const label = it.h === 0 ? `⭐ HARI INI` : `🕒 H-${it.h}`;
      lines.push(`${i + 1}. ${it.emoji} ${it.nama}`, `   ${d[2]}-${d[1]}-${d[0]} _(${label})_`);
    });
    return m.reply(claraWrap("hari besar", lines.join("\n")));
  }

  // ─── daftar custom + yang akan datang ───
  if (sub === "list" || sub === "daftar") {
    const custom = listCustomDays();
    const up = upcomingHariBesar(30);
    const lines = [
      `Fitur : notif hari besar`,
      ``,
      `Hari custom tersimpan : ${custom.length}`,
    ];
    for (const c of custom.slice(0, 15)) lines.push(`• ${c.key} — ${c.nama}${c.merah ? " 🔴" : ""}`);
    lines.push("", `Hari besar 30 hari ke depan : ${up.length}`);
    for (const u of up.slice(0, 10)) {
      lines.push(`• ${u.ymd} — ${u.nama}${u.merah ? " 🔴 tanggal merah" : ""}`);
    }
    return m.reply(claraWrap("hari besar", lines.join("\n")));
  }

  // ─── tes kirim sekarang (hari ini; kalau bukan hari besar, pakai contoh) ───
  if (sub === "test" || sub === "tes") {
    const today = new Date(Date.now() + 7 * 3600 * 1000);
    const pad = (n) => String(n).padStart(2, "0");
    const ymd = `${today.getUTCFullYear()}-${pad(today.getUTCMonth() + 1)}-${pad(today.getUTCDate())}`;
    let entry = getHariBesar(ymd);
    if (!entry) entry = { nama: "Contoh Hari Ibu", emoji: "🌷", merah: false, custom: false };
    const text = await buildHariBesarText(entry, ymd);
    return m.reply(text + `\n\n_(tes — contoh tampilan notif)_`);
  }

  // ─── status / panduan ───
  const today = new Date(Date.now() + 7 * 3600 * 1000);
  const pad2 = (n) => String(n).padStart(2, "0");
  const ymd = `${today.getUTCFullYear()}-${pad2(today.getUTCMonth() + 1)}-${pad2(today.getUTCDate())}`;
  const hariIni = getHariBesar(ymd);
  const up = upcomingHariBesar(30);
  const lines = [
    `Fitur : notif hari besar & tanggal merah`,
    `Jam kirim : 08:00 WIB (sekali per hari)`,
    ``,
    `Chat ini : ${isSubscribed(chat) ? "LANGGANAN ON" : "belum langganan"}`,
    `Mode semua grup : ${getAllGroups() ? "ON" : "off"}`,
    `Langganan manual : ${getSubs().length} chat`,
    `Hari custom : ${listCustomDays().length}`,
    ``,
    `Hari ini : ${hariIni ? hariIni.emoji + " " + hariIni.nama + (hariIni.merah ? " (tanggal merah)" : "") : "bukan hari besar"}`,
    `Terdekat : ${up.length ? up[0].ymd + " — " + up[0].nama : "-"}`,
    ``,
    `Kontrol : ${pf}haribesar on | off | all on | test`,
    `Jadwal libur : ${pf}haribesar libur`,
    `Custom : ${pf}haribesar tambah 20-03-2026 | Idulfitri | merah`,
  ];
  return m.reply(claraWrap("hari besar", lines.join("\n")));
}

export default { config: pluginConfig, handler };
export { pluginConfig, handler };
