// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .ftooltimestamp — konversi Unix timestamp ↔ tanggal WIB (port altftool.com/tools/all/unix-timestamp-converter)
// Tanpa arg = waktu sekarang. Angka = timestamp → tanggal. Tanggal (yyyy-mm-dd / dd-mm-yyyy [+HH:mm]) → timestamp.
import { raraGuideV2, raraSalahV2, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "ftooltimestamp", alias: ["timestamp", "unixtime", "epoch"], category: "tools",
  description: "Konversi Unix timestamp ↔ tanggal WIB", usage: ".ftooltimestamp [angka|tanggal]",
  example: ".ftooltimestamp 1727300000", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

const fmtWib = (sec) => new Date(sec * 1000).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "full", timeStyle: "medium" });
const rel = (sec) => {
  const d = sec - Math.floor(Date.now() / 1000);
  const a = Math.abs(d), unit = a < 60 ? a + " detik" : a < 3600 ? Math.floor(a / 60) + " menit" : a < 86400 ? Math.floor(a / 3600) + " jam" : Math.floor(a / 86400) + " hari";
  return d >= 0 ? `dalam ${unit} ke depan` : `${unit} yang lalu`;
};
const parseDateToSec = (raw) => {
  // format: yyyy-mm-dd | dd-mm-yyyy | dd/mm/yyyy, opsional " HH:mm[:ss]" — semua WIB (UTC+7)
  // GRUP OPSIONAL yang gak ikut match = undefined → map(Number) jadi NaN (falsy trap!) → pakai num() helper
  const num = (v) => (v === undefined || v === null ? 0 : Number(v));
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

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const raw = (m.text || "").trim();
    if (!raw) {
      const now = Math.floor(Date.now() / 1000);
      await m.react("🐣");
      return m.reply(raraWrap("Timestamp", ["WAKTU SEKARANG (WIB)",
        "",
        "```" + now + "```",
        "",
        fmtWib(now)].join("\n")));
    }
    let lines, title;
    if (/^\d{10,13}$/.test(raw)) {
      let sec = parseInt(raw, 10);
      if (raw.length === 13) sec = Math.floor(sec / 1000); // milidetik
      lines = ["TIMESTAMP → TANGGAL", "", "```" + sec + "```", "", fmtWib(sec), "", rel(sec)];
    } else {
      const sec = parseDateToSec(raw);
      if (sec === null) {
        await m.react("❌");
        return m.reply(raraSalahV2("ftooltimestamp", {
          kaomoji: "(・_・;)",
          pesan: "formatnya gak dikenali — angka timestamp atau tanggal 2026-09-26 / 26-09-2026 14:30",
          contoh: `${prefix}ftooltimestamp 1727300000`,
        }), "ftooltimestamp");
      }
      lines = ["TANGGAL → TIMESTAMP", "", "```" + sec + "```", "", fmtWib(sec), "", rel(sec)];
    }
    await m.react("🐣");
    await m.reply(raraWrap("Timestamp", lines.join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(raraWrap("Timestamp", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
