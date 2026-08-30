// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "styletext",
  alias: ["styletext", "style", "fancy"],
  category: "tools",
  description: "Mengubah teks biasa menjadi berbagai variasi font unik / fancy",
  usage: ".styletext <teks>",
  example: ".styletext Hello World",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

function convertUnicode(str, upperStart, lowerStart, numStart) {
  return str.split("").map((c) => {
    const code = c.charCodeAt(0);
    if (upperStart && code >= 65 && code <= 90) {
      return String.fromCodePoint(upperStart + (code - 65));
    }
    if (lowerStart && code >= 97 && code <= 122) {
      return String.fromCodePoint(lowerStart + (code - 97));
    }
    if (numStart && code >= 48 && code <= 57) {
      return String.fromCodePoint(numStart + (code - 48));
    }
    return c;
  }).join("");
}

function toSmallCaps(str) {
  const smallCapsMap = {
    a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ',
    k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ',
    u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
  };
  return str.split("").map((c) => smallCapsMap[c.toLowerCase()] || c).join("");
}

const styles = [
  {
    name: "Serif Bold",
    map: (str) => convertUnicode(str, 0x1d400, 0x1d41a, 0x1d7ce)
  },
  {
    name: "Serif Italic",
    map: (str) => convertUnicode(str, 0x1d434, 0x1d44e, null)
  },
  {
    name: "Script / Cursive",
    map: (str) => convertUnicode(str, 0x1d4d0, 0x1d4ea, null)
  },
  {
    name: "Double Struck",
    map: (str) => convertUnicode(str, 0x1d538, 0x1d552, 0x1d7d8)
  },
  {
    name: "Gothic / Fraktur",
    map: (str) => convertUnicode(str, 0x1d504, 0x1d51e, null)
  },
  {
    name: "Circled",
    map: (str) => convertUnicode(str, 0x24b6, 0x24d0, 0x2460)
  },
  {
    name: "Squared / Boxed",
    map: (str) => convertUnicode(str, 0x1f130, 0x1f130, null)
  },
  {
    name: "Monospace",
    map: (str) => convertUnicode(str, 0x1d670, 0x1d68a, 0x1d7f6)
  },
  {
    name: "Small Caps",
    map: (str) => toSmallCaps(str)
  }
];

async function handler(m, { sock }) {
  try {
    const text = m.args?.join(" ").trim() || (m.quoted && (m.quoted.text || m.quoted.caption));
    if (!text) {
      return m.reply(claraWrap("styletext", `Masukkan teks yang ingin diubah gaya fontnya!\n\nContoh: ${m.prefix}styletext Hello World`, "guide"));
    }

    await m.react("🕒");

    let result = `╭──「 *STYLE TEXT* 」\n`;
    result += `│ Teks: ${text}\n`;
    result += `╰──────────\n\n`;

    styles.forEach((st, idx) => {
      result += `*${idx + 1}. ${st.name}*\n${st.map(text)}\n\n`;
    });

    await m.react("🐣");
    return m.reply(result.trim());
  } catch (err) {
    console.error("styletext error:", err);
    await m.react("❌");
    return m.reply(claraWrap("styletext", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
