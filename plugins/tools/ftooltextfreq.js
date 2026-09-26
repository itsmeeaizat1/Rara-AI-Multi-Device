// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .ftooltextfreq — kata paling sering muncul (port altftool.com/tools/all/word-frequency-counter)
import { novaGuideV2, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ftooltextfreq", alias: ["textfreq", "wordfreq", "frekuensikata"], category: "tools",
  description: "Hitung frekuensi kata terbanyak dalam teks", usage: ".ftooltextfreq <teks>",
  example: ".ftooltextfreq teks apa pun di sini", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const text = (m.text || "").trim();
    if (!text) {
      return m.reply(novaGuideV2("ftooltextfreq", {
        kaomoji: "(๑´ㅂ`๑)",
        sapaan: "mau tau kata apa yang paling sering muncul? tempel teksnya~",
        cara: "ketik teks apa pun, nanti dihitung top 10 kata terbanyak",
        contoh: `${prefix}ftooltextfreq aku belajar ai karena ai membantu aku`,
        note: "huruf besar/kecil dianggap sama, hasil top 10 kata terbanyak",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }), "ftooltextfreq");
    }
    const words = (text.toLowerCase().match(/[\p{L}\p{N}']+/gu) || []);
    if (!words.length) {
      await m.react("❌");
      return m.reply(claraWrap("Text Freq", ["ERROR: gak ada kata yang bisa dihitung"].join("\n")));
    }
    const freq = new Map();
    for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
    const top = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10);
    const total = words.length, unik = freq.size;
    const medal = ["🥇", "🥈", "🥉"];
    const lines = ["FREKUENSI KATA",
      "",
      `Total kata: ${total} · Kata unik: ${unik}`,
      ""];
    top.forEach(([w, c], i) => {
      const m = medal[i] || `${i + 1}.`;
      lines.push(`${m} ${w} ×${c}`);
    });
    await m.react("🐣");
    await m.reply(claraWrap("Text Freq", lines.join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(claraWrap("Text Freq", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
