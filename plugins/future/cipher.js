// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "cipher",
  alias: ["cipher", "enkripsi", "decipher"],
  category: "future",
  description: "Enkripsi & dekripsi pesan rahasia (Caesar, Vigenere, Base64)",
  usage: ".cipher <method> <encode/decode> <text> [key]",
  example: ".cipher caesar encode halo 3",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function caesarShift(text, shift) {
  return text.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode((c.charCodeAt(0) - base + shift + 26) % 26 + base);
  });
}

function vigenere(text, key, decode = false) {
  const result = [];
  let ki = 0;
  for (const ch of text) {
    if (/[a-zA-Z]/.test(ch)) {
      const base = ch <= "Z" ? 65 : 97;
      const k = key[ki % key.length].toLowerCase().charCodeAt(0) - 97;
      const shift = decode ? -k : k;
      result.push(String.fromCharCode((ch.charCodeAt(0) - base + shift + 26) % 26 + base));
      ki++;
    } else {
      result.push(ch);
    }
  }
  return result.join("");
}

function base64Encode(text) {
  return Buffer.from(text, "utf-8").toString("base64");
}

function base64Decode(text) {
  try {
    return Buffer.from(text, "base64").toString("utf-8");
  } catch {
    return "Error: invalid base64";
  }
}

function reverseText(text) {
  return text.split("").reverse().join("");
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const method = (args[1] || "").toLowerCase();
  const action = (args[2] || "").toLowerCase();
  const key = args[args.length - 1];
  const textStart = 3;
  const textEnd = (method === "caesar" || method === "vigenere") ? -1 : undefined;
  const text = args.slice(textStart, textEnd).join(" ").trim();

  if (!method || method === "help" || !action) {
    await m.reply(claraWrap("Cipher", [
      "ENKRIPSI PESAN RAHASIA",
      "",
      "Cara pakai:",
      prefix + "cipher caesar <encode/decode> <text> <shift>",
      prefix + "cipher vigenere <encode/decode> <text> <key>",
      prefix + "cipher base64 <encode/decode> <text>",
      prefix + "cipher reverse <encode/decode> <text>",
      "",
      "Contoh:",
      prefix + "cipher caesar encode halo 3",
      prefix + "cipher vigenere encode halo kunci",
      prefix + "cipher base64 encode halo",
    ].join("\n")));
    return { handled: true };
  }

  if (!text) {
    await m.reply(claraWrap("Cipher", "Teks tidak boleh kosong."));
    return { handled: true };
  }

  let result = "";
  const isEncode = action === "encode" || action === "enc" || action === "e";

  if (method === "caesar") {
    const shift = parseInt(key || "0", 10);
    if (isNaN(shift)) {
      await m.reply(claraWrap("Cipher", "Shift harus angka. Contoh: " + prefix + "cipher caesar encode halo 3"));
      return { handled: true };
    }
    result = caesarShift(text, isEncode ? shift : -shift);
  } else if (method === "vigenere") {
    if (!key || !/^[a-zA-Z]+$/.test(key)) {
      await m.reply(claraWrap("Cipher", "Key harus huruf. Contoh: " + prefix + "cipher vigenere encode halo kunci"));
      return { handled: true };
    }
    result = vigenere(text, key, !isEncode);
  } else if (method === "base64") {
    result = isEncode ? base64Encode(text) : base64Decode(text);
  } else if (method === "reverse") {
    result = reverseText(text);
  } else {
    await m.reply(claraWrap("Cipher", "Method: caesar, vigenere, base64, reverse"));
    return { handled: true };
  }

  await m.reply(claraWrap("Cipher Result", [
    "Method: " + method.toUpperCase(),
    "Mode: " + (isEncode ? "ENCODE" : "DECODE"),
    "Result:",
    result,
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
