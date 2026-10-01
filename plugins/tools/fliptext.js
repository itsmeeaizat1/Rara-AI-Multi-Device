// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/nova-error.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "fliptext",
  alias: ["fliptext", "flip"],
  category: "tools",
  description: "Membalikkan teks secara terbalik (upside down)",
  usage: ".fliptext <teks>",
  example: ".fliptext hello world",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

const flipMap = {
  a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ı', j: 'ɾ',
  k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ',
  u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z',
  A: '∀', B: 'q', C: 'Ɔ', D: 'p', E: 'Ǝ', F: 'Ⅎ', G: '⅁', H: 'H', I: 'I', J: 'ſ',
  K: 'ʞ', L: 'Ꞁ', M: 'W', N: 'N', O: 'O', P: 'Ԁ', Q: 'Ό', R: 'ᴚ', S: 'S', T: '┴',
  U: '∩', V: 'Λ', W: 'M', X: 'X', Y: '⅄', Z: 'Z',
  '0': '0', '1': 'Ɩ', '2': 'ᄅ', '3': 'Ɛ', '4': 'ㄣ', '5': 'ϛ', '6': '9', '7': 'ㄥ', '8': '8', '9': '6',
  '.': '˙', ',': '\'', '\'': ',', '"': ',,', '!': '¡', '?': '¿', '(': ')', ')': '(',
  '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<', '_': '‾', '&': '⅋'
};

function flipString(str) {
  return str.split('').map(c => flipMap[c] || c).reverse().join('');
}

async function handler(m, { sock }) {
  try {
    const text = m.args?.join(" ").trim() || (m.quoted && (m.quoted.text || m.quoted.caption));
    if (!text) {
      return m.reply(novaWrap("fliptext", `Masukkan teks yang ingin dibalik!\n\nContoh: ${m.prefix}fliptext hello world`, "guide"));
    }

    await m.react("🕒");

    const flipped = flipString(text);

    await m.react("🐣");

    let result = "";
    result += `${flipped}\n`;
        return m.reply(result);
  } catch (err) {
    console.error("fliptext error:", err);
    await m.react("❌");
    return m.reply(novaWrap("fliptext", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
