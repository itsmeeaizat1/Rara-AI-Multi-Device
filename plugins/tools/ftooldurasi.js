// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .ftooldurasi — selisih dua tanggal (port altftool.com/tools/all/date-duration-calculator)
// Format: .ftooldurasi <tanggal1>|<tanggal2> — yyyy-mm-dd atau dd-mm-yyyy, opsional HH:mm (WIB).
import { raraGuideV2, raraSalahV2, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "ftooldurasi", alias: ["durasi", "selisihtanggal", "datediff"], category: "tools",
  description: "Hitung selisih dua tanggal", usage: ".ftooldurasi <tgl1>|<tgl2>",
  example: ".ftooldurasi 2026-09-26|2026-12-31", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

// grup opsional yang gak match = undefined → NaN trap; pakai num() helper
const num = (v) => (v === undefined || v === null ? 0 : Number(v));
const parseDateToSec = (raw) => {
  const mm = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  let y, mo, d, h, mi, s;
  if (mm) [, y, mo, d, h, mi, s] = mm.map(num);
  else {
    const dmm = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (!dmm) return null;
    [, d, mo, y, h, mi, s] = dmm.map(num);
  }
  if (![y, mo, d, h, mi, s].every(Number.isFinite) || mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) return null;
  const sec = Date.UTC(y, mo - 1, d, h - 7, mi, s) / 1000;
  return Number.isFinite(sec) ? Math.floor(sec) : null;
};
const humanDur = (sec) => {
  const a = Math.abs(sec);
  if (a < 3600) return Math.floor(a / 60) + " menit";
  if (a < 86400) return Math.floor(a / 3600) + " jam " + (Math.floor(a / 60) % 60) + " menit";
  return Math.floor(a / 86400) + " hari " + (Math.floor(a / 3600) % 24) + " jam";
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const raw = (m.text || "").trim();
    if (!raw.includes("|")) {
      return m.reply(raraGuideV2("ftooldurasi", {
        kaomoji: "(๑˃ᴗ˂)ﻭ",
        sapaan: "selisih dua tanggal mau dihitung? pisahin dengan tanda |",
        cara: "ketik tanggal pertama, tanda |, lalu tanggal kedua",
        contoh: `${prefix}ftooldurasi 2026-09-26|2026-12-31`,
        note: "tanggal bisa yyyy-mm-dd atau dd-mm-yyyy, boleh tambah jam 14:30 — semua WIB",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }), "ftooldurasi");
    }
    const [raw1, raw2] = raw.split("|").map((x) => x.trim());
    const s1 = parseDateToSec(raw1), s2 = parseDateToSec(raw2);
    if (s1 === null || s2 === null) {
      await m.react("❌");
      return m.reply(raraSalahV2("ftooldurasi", {
        kaomoji: "(・_・;)",
        pesan: "format tanggalnya gak dikenali — pakai 2026-09-26 atau 26-09-2026 14:30",
        contoh: `${prefix}ftooldurasi 2026-09-26|2026-12-31`,
      }), "ftooldurasi");
    }
    let from = s1, to = s2;
    if (to < from) [from, to] = [to, from];
    const diff = to - from;
    const days = Math.floor(diff / 86400);
    const lines = ["SELISIH TANGGAL", "",
      `Dari: ${raw1}`, `Sampai: ${raw2}`, "",
      `Total: ${days.toLocaleString("id-ID")} hari`];
    lines.push(`≈ ${Math.floor(days / 7)} minggu ${days % 7} hari`);
    if (diff % 86400) lines.push(`Detail: ${humanDur(diff)}`);
    lines.push(`Kalender: ±${Math.round(days / 30.44)} bulan`);
    await m.react("🐣");
    await m.reply(raraWrap("Durasi Tanggal", lines.join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(raraWrap("Durasi Tanggal", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
