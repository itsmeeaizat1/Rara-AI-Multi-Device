// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .ftoolroman — konversi angka Arab ↔ angka Romawi (port altftool.com/tools/all/roman-numeral-converter)
// Auto-detect: angka → Romawi, huruf romawi → angka. Range standar 1-3999.
import { raraGuide, raraSalah, raraWrap } from "../../src/lib/rara-menu-style.js";
import { sendUsageCard } from "../../src/lib/rara-menu-card.js";

const pluginConfig = {
  name: "ftoolroman", alias: ["roman", "romannumeral", "romawi"], category: "tools",
  description: "Konversi angka Arab ↔ Romawi (auto)", usage: ".ftoolroman <angka|romawi>",
  example: ".ftoolroman 2026", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

const PAIRS = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
const toRoman = (n) => { let out = ""; for (const [v, s] of PAIRS) while (n >= v) { out += s; n -= v; } return out; };
const ROMAN_RE = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i;
const VAL = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
const fromRoman = (s) => {
  const up = s.toUpperCase();
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = VAL[up[i]], next = VAL[up[i + 1]] || 0;
    total += cur < next ? -cur : cur;
  }
  // validasi dua arah: hasil balik harus identik (antisipasi format nyeleneh)
  return toRoman(total).toLowerCase() === up.toLowerCase() ? total : null;
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const raw = (m.text || "").trim().toUpperCase();
    if (!raw) {
      return m.reply(raraGuide("ftoolroman", {
        kaomoji: "(๑•̀ㅂ•́)و",
        sapaan: "angka mau diubah ke romawi atau sebaliknya? tinggal ketik~",
        cara: "masukkan angka biasa ATAU angka romawi, bot otomatis mendeteksi arahnya",
        contoh: `${prefix}ftoolroman 2026 → MMXXVI · ${prefix}ftoolroman MMXXVI → 2026`,
        note: "rentang yang valid 1 sampai 3999 (MMMCMXCIX)",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }), "ftoolroman");
    }
    let result, label;
    if (/^\d+$/.test(raw)) {
      const n = parseInt(raw, 10);
      if (n < 1 || n > 3999) {
        await m.react("❌");
        return await sendUsageCard(sock, m, raraSalah("ftoolroman", {
          kaomoji: "(・_・;)",
          pesan: "angkanya di luar rentang 1-3999",
          contoh: `${prefix}ftoolroman 2026`,
        }), { name: "ftoolroman" });
      }
      result = toRoman(n); label = `${n} (Arab) → ${result} (Romawi)`;
    } else if (ROMAN_RE.test(raw)) {
      const n = fromRoman(raw);
      if (n === null || n < 1 || n > 3999) {
        await m.react("❌");
        return await sendUsageCard(sock, m, raraSalah("ftoolroman", {
          kaomoji: "(・_・;)",
          pesan: "kombinasi huruf romawinya gak valid",
          contoh: `${prefix}ftoolroman MMXXVI`,
        }), { name: "ftoolroman" });
      }
      result = String(n); label = `${raw} (Romawi) → ${n} (Arab)`;
    } else {
      await m.react("❌");
      return await sendUsageCard(sock, m, raraSalah("ftoolroman", {
        kaomoji: "(・_・;)",
        pesan: "input harus angka biasa atau huruf romawi (I V X L C D M)",
        contoh: `${prefix}ftoolroman 2026`,
      }), { name: "ftoolroman" });
    }
    await m.react("🐣");
    await m.reply(raraWrap("Roman Numeral", ["KONVERSI BERHASIL",
      "",
      "```" + label + "```"].join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(raraWrap("Roman Numeral", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
