// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .textreverse — balik urutan teks (port altftool.com/tools/all/text-reverser)
// Pakai spread [...str] biar emoji/surrogate pair gak rusak.
import { novaGuideV2, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "textreverse", alias: ["textreverse", "reversetext", "balikteks"], category: "tools",
  description: "Balik urutan karakter teks", usage: ".textreverse <teks>",
  example: ".textreverse halo dunia", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const text = (m.text || "").trim();
    if (!text) {
      return m.reply(novaGuideV2("textreverse", {
        kaomoji: "(¬‿¬)",
        sapaan: "teks mau dibalik urutannya? ketik aja~",
        cara: "ketik teksnya, hasilnya dibaca dari belakang",
        contoh: `${prefix}textreverse halo dunia → ainud olah`,
        note: "emoji ikut dibalik posisinya tapi tetap utuh, gak rusak",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }), "textreverse");
    }
    const out = [...text].reverse().join("");
    await m.react("🐣");
    await m.reply(claraWrap("Text Reverse", ["TEKS DIBALIK",
      "",
      "```" + out + "```"].join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(claraWrap("Text Reverse", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
