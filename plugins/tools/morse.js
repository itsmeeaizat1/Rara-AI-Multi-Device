// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "morse",
  alias: ["morsecode", "morsetranslate", "sandimorse"],
  category: "tools",
  description: "Translate morse code (text ke morse & sebaliknya)",
  usage: ".morse <teks>  atau  .morse decode <morse>",
  example: ".morse SOS  atau  .morse decode ... --- ...",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const MORSE_MAP = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.",
  G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..",
  M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.",
  S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
  Y: "-.--", Z: "--..",
  0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-",
  5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.",
  "!": "-.-.--", "/": "-..-.", "(": "-.--.", ")": "-.--.-",
  "&": ".-...", ":": "---...", ";": "-.-.-.", "=": "-...-",
  "+": ".-.-.", "-": "-....-", "_": "..--.-", '"': ".-..-.",
  "$": "...-..-", "@": ".--.-.",
};

// Reverse map for decoding
const REVERSE_MORSE = {};
for (const [k, v] of Object.entries(MORSE_MAP)) {
  REVERSE_MORSE[v] = k;
}

function textToMorse(text) {
  const upper = text.toUpperCase();
  const result = [];
  for (const ch of upper) {
    if (ch === " ") {
      result.push("/");
    } else if (MORSE_MAP[ch]) {
      result.push(MORSE_MAP[ch]);
    }
    // Skip unsupported chars silently
  }
  return result.join(" ");
}

function morseToText(morse) {
  const words = morse.trim().split(/\s*\/\s*/);
  const result = [];
  for (const word of words) {
    const letters = word.trim().split(/\s+/);
    for (const letter of letters) {
      const decoded = REVERSE_MORSE[letter];
      if (decoded) {
        result.push(decoded);
      }
    }
    result.push(" ");
  }
  return result.join("").trim();
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const text = (m.text || "").trim();

    if (!text) {
      return sendReplyWithNav(sock, m,
        prefix + "morse <teks>\n" +
        prefix + "morse decode <morse>\n\n" +
        "Encode: teks ke morse code\n" +
        "Decode: morse code ke teks\n\n" +
        "Contoh:\n" +
        prefix + "morse SOS Help\n" +
        prefix + "morse decode ... --- ... / .... . .-.. .--.",
        { title: "Morse Code Translator" }
      );
    }

    let result;
    let mode = "encode";

    if (text.toLowerCase().startsWith("decode ")) {
      mode = "decode";
      const morse = text.substring(7).trim();
      if (!morse) {
        return m.reply(claraWrap("Morse", "Input morse kosong!"));
      }
      result = morseToText(morse);
      if (!result) {
        return m.reply(claraWrap("Morse", "Tidak bisa decode. Pastikan format morse valid."));
      }

      await m.react("✅");
      return m.reply(claraWrap("Morse Decode", [
        "Input: " + (morse.length > 60 ? morse.substring(0, 60) + "..." : morse),
        "Hasil: " + result,
      ].join("\n")));
    } else {
      result = textToMorse(text);
      if (!result) {
        return m.reply(claraWrap("Morse", "Tidak ada karakter yg bisa di-encode!"));
      }

      await m.react("✅");
      return m.reply(claraWrap("Morse Encode", [
        "Input: " + (text.length > 60 ? text.substring(0, 60) + "..." : text),
        "Hasil: " + result,
      ].join("\n")));
    }
  } catch (e) {
    console.error("morse error:", e);
    return m.reply(claraWrap("Morse", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
