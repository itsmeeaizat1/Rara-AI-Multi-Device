// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .ftoolrot13 — sandi ROT13 (port altftool.com/tools/all/rot13) — geser huruf 13 posisi.
// ROT13 symmetric: encode = decode. Huruf saja, angka/emoji/aksara lain gak disentuh.
import { novaGuideV2, novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ftoolrot13", alias: ["rot13", "sandirot13"], category: "tools",
  description: "Enkripsi/dekripsi teks dengan sandi ROT13", usage: ".ftoolrot13 <teks>",
  example: ".ftoolrot13 halo dunia", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

const rot13 = (text) => [...String(text)].map((ch) => {
  const c = ch.codePointAt(0);
  if (c >= 97 && c <= 122) return String.fromCharCode(((c - 97 + 13) % 26) + 97);
  if (c >= 65 && c <= 90) return String.fromCharCode(((c - 65 + 13) % 26) + 65);
  return ch;
}).join("");

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const text = (m.text || "").trim();
    if (!text) {
      return m.reply(novaGuideV2("ftoolrot13", {
        kaomoji: "(¬‿¬)✧",
        sapaan: "teks mau disandikan ROT13? ketik aja, ulangi perintahnya buat ngembaliin~",
        cara: "setiap huruf digeser 13 posisi, ketik dua kali hasilnya balik ke teks asli",
        contoh: `${prefix}ftoolrot13 halo dunia → unyb qhavn`,
        note: "huruf besar/kecil tetap dipertahankan, angka dan emoji gak disentuh",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }), "ftoolrot13");
    }
    const out = rot13(text);
    await m.react("🐣");
    await m.reply(novaWrap("ROT13", ["SANDI ROT13 BERHASIL",
      "",
      "```" + out + "```",
      "",
      `Balikin: ${prefix}ftoolrot13 ${out}`].join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(novaWrap("ROT13", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
