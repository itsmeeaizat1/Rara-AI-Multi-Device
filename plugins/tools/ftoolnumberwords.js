// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .ftoolnumberwords — angka → terbilang Bahasa Indonesia (port altftool.com/tools/all/number-to-words)
import { raraGuide, raraSalahV2, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "ftoolnumberwords", alias: ["numberwords", "terbilang", "kataangka"], category: "tools",
  description: "Angka jadi terbilang Bahasa Indonesia", usage: ".ftoolnumberwords <angka>",
  example: ".ftoolnumberwords 1500000", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
const angkaRibuan = (n) => { // n < 1000
  if (n < 12) return SATUAN[n];
  if (n < 20) return SATUAN[n - 10] + " belas";
  if (n < 100) return SATUAN[Math.floor(n / 10)] + " puluh" + (n % 10 ? " " + SATUAN[n % 10] : "");
  if (n < 200) return "seratus" + (n % 100 ? " " + angkaRibuan(n % 100) : "");
  return SATUAN[Math.floor(n / 100)] + " ratus" + (n % 100 ? " " + angkaRibuan(n % 100) : "");
};
const terbilang = (n) => {
  if (n === 0) return "nol";
  const divs = [1e12, 1e9, 1e6, 1e3, 1];
  const units = ["triliun", "miliar", "juta", "ribu", ""];
  const parts = [];
  for (let i = 0; i < divs.length; i++) {
    const chunk = Math.floor(n / divs[i]) % 1000;
    if (!chunk) continue;
    const w = angkaRibuan(chunk);
    if (units[i] === "") parts.push(w);
    else if (divs[i] === 1e3 && chunk === 1) parts.push("seribu");
    else parts.push(w + " " + units[i]);
  }
  return parts.join(" ");
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const raw = (m.text || "").trim().replace(/\./g, "");
    if (!raw) {
      return m.reply(raraGuide("ftoolnumberwords", {
        kaomoji: "(◍•ᴗ•◍)",
        sapaan: "angka mau dijadiin terbilang? tinggal ketik angkanya~",
        cara: "masukkan angka bulat sampai 999 triliun, titik pemisah ribuan boleh ikut",
        contoh: `${prefix}ftoolnumberwords 2026 → dua ribu dua puluh enam`,
        note: "hasil otomatis diawali huruf kapital dan berakhiran titik",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }), "ftoolnumberwords");
    }
    if (!/^\d{1,15}$/.test(raw)) {
      await m.react("❌");
      return m.reply(raraSalahV2("ftoolnumberwords", {
        kaomoji: "(・_・;)",
        pesan: "input harus angka bulat positif maksimal 15 digit",
        contoh: `${prefix}ftoolnumberwords 1500000`,
      }), "ftoolnumberwords");
    }
    const n = Number(raw);
    if (n > 999999999999999) {
      await m.react("❌");
      return m.reply(raraSalahV2("ftoolnumberwords", {
        kaomoji: "(・_・;)",
        pesan: "angkanya kegedean, maksimal 999 triliun",
        contoh: `${prefix}ftoolnumberwords 1500000`,
      }), "ftoolnumberwords");
    }
    const words = terbilang(n);
    await m.react("🐣");
    await m.reply(raraWrap("Terbilang", [`Angka: ${raw}`,
      "",
      "```" + words.charAt(0).toUpperCase() + words.slice(1) + ".```"].join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(raraWrap("Terbilang", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
