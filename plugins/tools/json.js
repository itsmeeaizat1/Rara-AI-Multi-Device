// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "json",
  alias: ["json"],
  category: "tools",
  description: "JSON formatter & validator (beautify, minify, validate, extract keys)",
  usage: ".json <mode> <json>  atau  .json <json> (auto beautify)",
  example: ".json beautify {\"a\":1}  atau  .json check {\"a\":1}",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const MODES = ["beautify", "minify", "check", "keys", "values", "type"];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const text = (m.text || "").trim();

    if (!text) {
      return m.reply(
        prefix + "json <mode> <json>\n" +
        prefix + "json <json> (auto beautify)\n\n" +
        "Mode:\n" +
        "beautify = format rapi (indent 2)\n" +
        "minify = compress 1 line\n" +
        "check = validate + error info\n" +
        "keys = extract semua keys\n" +
        "values = extract semua values\n" +
        "type = detect type per key\n\n" +
        "Contoh:\n" +
        prefix + 'json beautify {"name":"Nova","age":20}\n' +
        prefix + 'json check {"a":1}\n' +
        prefix + 'json keys {"a":1,"b":2}',
        { title: "JSON Formatter & Validator" }
      );
    }

    let mode = "beautify";
    let jsonStr = text;

    // Check if first word is a mode
    const firstWord = text.split(/\s+/)[0].toLowerCase();
    if (MODES.includes(firstWord)) {
      mode = firstWord;
      jsonStr = text.substring(firstWord.length).trim();
    }

    if (!jsonStr) {
      return m.reply(claraWrap("JSON", "Input JSON tidak boleh kosong!"));
    }

    await m.react("🕒");

    // Parse JSON
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      await m.react("❌");

      // For check mode, show detailed error
      if (mode === "check") {
        return m.reply(claraWrap("JSON Validation", [
          "Status: INVALID",
          "Error: " + e.message,
          "",
          "Tips:",
          "- Pastikan kurung kurawal {} utuh",
          '- Key harus dalam tanda kutip "key"',
          "- Tidak ada trailing comma",
          "- String pakai double quote",
        ].join("\n")));
      }

      return m.reply(claraWrap("JSON", "JSON invalid: " + e.message));
    }

    let result;

    switch (mode) {
      case "beautify": {
        result = JSON.stringify(parsed, null, 2);
        if (result.length > 1500) {
          result = result.substring(0, 1500) + "\n... (dipotong)";
        }
        await m.react("🐣");
        return m.reply(claraWrap("JSON Beautify", "```\n" + result + "\n```"));
      }

      case "minify": {
        result = JSON.stringify(parsed);
        if (result.length > 1500) {
          result = result.substring(0, 1500) + "...";
        }
        await m.react("🐣");
        return m.reply(claraWrap("JSON Minify", "```\n" + result + "\n```"));
      }

      case "check": {
        const lines = ["Status: VALID", ""];
        const type = Array.isArray(parsed) ? "Array" : typeof parsed;
        lines.push("Type: " + type);

        if (type === "object" && parsed !== null) {
          const keys = Object.keys(parsed);
          lines.push("Keys: " + keys.length);
          lines.push("Size: " + JSON.stringify(parsed).length + " bytes");
        } else if (type === "Array") {
          lines.push("Items: " + parsed.length);
          lines.push("Size: " + JSON.stringify(parsed).length + " bytes");
        } else {
          lines.push("Value: " + String(parsed));
          lines.push("Size: " + JSON.stringify(parsed).length + " bytes");
        }

        await m.react("🐣");
        return m.reply(claraWrap("JSON Validation", lines.join("\n")));
      }

      case "keys": {
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          return m.reply(claraWrap("JSON Keys", "Input bukan object!"));
        }
        const keys = Object.keys(parsed);
        const lines = ["Total keys: " + keys.length, ""];
        keys.forEach((k, i) => {
          const val = parsed[k];
          const valType = Array.isArray(val) ? "array" : typeof val;
          lines.push((i + 1) + ". " + k + " (" + valType + ")");
        });
        await m.react("🐣");
        return m.reply(claraWrap("JSON Keys", lines.join("\n")));
      }

      case "values": {
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          return m.reply(claraWrap("JSON Values", "Input bukan object!"));
        }
        const keys = Object.keys(parsed);
        const lines = ["Total values: " + keys.length, ""];
        keys.forEach((k, i) => {
          const val = parsed[k];
          const valStr = typeof val === "object" ? JSON.stringify(val) : String(val);
          lines.push((i + 1) + ". " + k + " = " + (valStr.length > 50 ? valStr.substring(0, 50) + "..." : valStr));
        });
        await m.react("🐣");
        return m.reply(claraWrap("JSON Values", lines.join("\n")));
      }

      case "type": {
        if (typeof parsed !== "object" || parsed === null) {
          return m.reply(claraWrap("JSON Type", "Type: " + typeof parsed));
        }
        if (Array.isArray(parsed)) {
          const types = parsed.map((item, i) => (i + 1) + ": " + (Array.isArray(item) ? "array" : typeof item));
          return m.reply(claraWrap("JSON Type (Array)", "Items: " + parsed.length + "\n" + types.join("\n")));
        }
        const keys = Object.keys(parsed);
        const lines = ["Total: " + keys.length + " keys", ""];
        keys.forEach((k) => {
          const val = parsed[k];
          const valType = Array.isArray(val) ? "array" : typeof val;
          lines.push(k + ": " + valType);
        });
        await m.react("🐣");
        return m.reply(claraWrap("JSON Type Analysis", lines.join("\n")));
      }

      default:
        return m.reply(claraWrap("JSON", "Mode tidak dikenal!"));
    }
  } catch (e) {
    console.error("json error:", e);
    await m.react("❌");
    return m.reply(claraWrap("JSON", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
