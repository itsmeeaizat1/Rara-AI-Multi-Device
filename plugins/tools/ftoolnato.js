// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .ftoolnato — eja NATO/ICAO alphabet (port altftool.com/tools/all/nato-phonetic-alphabet)
import { raraGuideV2, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "ftoolnato", alias: ["nato", "natoalphabet", "ejaannato"], category: "tools",
  description: "Eja teks dengan NATO phonetic alphabet", usage: ".ftoolnato <teks>",
  example: ".ftoolnato budi", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

const NATO = { a: "Alfa", b: "Bravo", c: "Charlie", d: "Delta", e: "Echo", f: "Foxtrot", g: "Golf", h: "Hotel", i: "India", j: "Juliett", k: "Kilo", l: "Lima", m: "Mike", n: "November", o: "Oscar", p: "Papa", q: "Quebec", r: "Romeo", s: "Sierra", t: "Tango", u: "Uniform", v: "Victor", w: "Whiskey", x: "X-ray", y: "Yankee", z: "Zulu", "0": "Zero", "1": "One", "2": "Two", "3": "Three", "4": "Four", "5": "Five", "6": "Six", "7": "Seven", "8": "Eight", "9": "Nine" };

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const text = (m.text || "").trim();
    if (!text) {
      return m.reply(raraGuideV2("ftoolnato", {
        kaomoji: "(๑>ᗜ<)و",
        sapaan: "teks mau dieja kayak penerbang? gih~",
        cara: "ketik teksnya, tiap huruf dijadiin kata ejaan standar internasional",
        contoh: `${prefix}ftoolnato budi → Bravo Uniform Delta India`,
        note: "standar ICAO: dipakai radio penerbangan dan militer biar huruf gak salah dengar",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }), "ftoolnato");
    }
    const words = [...text.toLowerCase()].map((ch) => NATO[ch] || null).filter(Boolean);
    if (!words.length) {
      await m.react("❌");
      return m.reply(raraWrap("NATO Alphabet", ["ERROR: gak ada huruf/angka yang bisa dieja"].join("\n")));
    }
    await m.react("🐣");
    await m.reply(raraWrap("NATO Alphabet", [`Teks: ${text.substring(0, 80)}`,
      "",
      "```" + words.join(" ").substring(0, 800) + "```"].join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(raraWrap("NATO Alphabet", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
