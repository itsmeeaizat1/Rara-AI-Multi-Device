// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "biner",
  alias: ["biner", "binary", "baseconvert", "baseconv", "radix"],
  category: "tools",
  description: "Base converter (binary, octal, decimal, hex)",
  usage: ".biner <nilai> <dari> <ke>  atau  .biner <nilai> <dari>",
  example: ".biner 255 dec hex  atau  .biner 1010 bin",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const BASES = {
  bin: { name: "Binary", radix: 2, prefix: "0b", chars: "01" },
  oct: { name: "Octal", radix: 8, prefix: "0o", chars: "01234567" },
  dec: { name: "Decimal", radix: 10, prefix: "", chars: "0123456789" },
  hex: { name: "Hexadecimal", radix: 16, prefix: "0x", chars: "0123456789ABCDEFabcdef" },
};

function validateValue(value, radix) {
  const validChars = "0123456789ABCDEFabcdef".substring(0, radix);
  const clean = value.replace(/^0b|^0o|^0x/i, "");
  for (const ch of clean.toUpperCase()) {
    if (!validChars.includes(ch)) {
      return { valid: false, error: "Karakter '" + ch + "' tidak valid untuk base " + radix };
    }
  }
  return { valid: true, clean };
}

function convertBase(value, fromRadix, toRadix) {
  const clean = value.replace(/^0b|^0o|^0x/i, "");
  const decimal = parseInt(clean, fromRadix);
  if (isNaN(decimal)) {
    return { error: "Nilai tidak valid untuk base " + fromRadix };
  }
  let result;
  if (toRadix === 2) {
    result = decimal.toString(2);
  } else if (toRadix === 8) {
    result = decimal.toString(8);
  } else if (toRadix === 10) {
    result = decimal.toString(10);
  } else if (toRadix === 16) {
    result = decimal.toString(16).toUpperCase();
  } else {
    result = decimal.toString(toRadix);
  }
  return { result, decimal };
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const text = (m.text || "").trim();

    if (!text) {
      return m.reply(
        prefix + "biner <nilai> <dari> <ke>\n" +
        prefix + "biner <nilai> <dari> (tampilkan semua base)\n\n" +
        "Base tersedia:\n" +
        "bin = Binary (2)\n" +
        "oct = Octal (8)\n" +
        "dec = Decimal (10)\n" +
        "hex = Hexadecimal (16)\n\n" +
        "Contoh:\n" +
        prefix + "biner 255 dec hex\n" +
        prefix + "biner FF hex dec\n" +
        prefix + "biner 1010 bin (tampil semua)",
        { title: "Base Converter" }
      );
    }

    const parts = text.split(/\s+/);
    if (parts.length < 2) {
      return m.reply(claraWrap("Biner", "Format: " + prefix + "biner <nilai> <dari> [ke]"));
    }

    const value = parts[0];
    let fromKey = parts[1].toLowerCase();
    let toKey = parts[2] ? parts[2].toLowerCase() : null;

    // Resolve base keys (accept short forms)
    const fromBase = BASES[fromKey] || (fromKey === "binary" ? BASES.bin : null) ||
      (fromKey === "decimal" ? BASES.dec : null) || (fromKey === "hexadecimal" ? BASES.hex : null) ||
      (fromKey === "octal" ? BASES.oct : null);
    if (!fromBase) {
      return m.reply(claraWrap("Biner", "Base sumber tidak dikenal!\nValid: bin, oct, dec, hex"));
    }

    // Validate value for source base
    const validation = validateValue(value, fromBase.radix);
    if (!validation.valid) {
      return m.reply(claraWrap("Biner", validation.error));
    }

    await m.react("🕒");

    // If target specified, convert only to that
    if (toKey) {
      const toBase = BASES[toKey] || (toKey === "binary" ? BASES.bin : null) ||
        (toKey === "decimal" ? BASES.dec : null) || (toKey === "hexadecimal" ? BASES.hex : null) ||
        (toKey === "octal" ? BASES.oct : null);
      if (!toBase) {
        await m.react("❌");
        return m.reply(claraWrap("Biner", "Base target tidak dikenal!\nValid: bin, oct, dec, hex"));
      }

      const conv = convertBase(value, fromBase.radix, toBase.radix);
      if (conv.error) {
        await m.react("❌");
        return m.reply(claraWrap("Biner", conv.error));
      }

      await m.react("🐣");
      return m.reply(claraWrap("Base Convert", [
        "Input: " + value + " (" + fromBase.name + ")",
        "Hasil: " + conv.result + " (" + toBase.name + ")",
        "Decimal: " + conv.decimal,
      ].join("\n")));
    }

    // No target specified — show all bases
    const cleanVal = validation.clean;
    const lines = ["Input: " + value + " (" + fromBase.name + ")", ""];

    for (const [key, base] of Object.entries(BASES)) {
      if (key === fromKey) {
        lines.push(base.name + ": " + cleanVal + " (input)");
      } else {
        const conv = convertBase(value, fromBase.radix, base.radix);
        if (conv.error) {
          lines.push(base.name + ": Error");
        } else {
          lines.push(base.name + ": " + conv.result);
        }
      }
    }

    await m.react("🐣");
    return m.reply(claraWrap("Base Convert (All)", lines.join("\n")));
  } catch (e) {
    console.error("biner error:", e);
    await m.react("❌");
    return m.reply(claraWrap("Biner", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
