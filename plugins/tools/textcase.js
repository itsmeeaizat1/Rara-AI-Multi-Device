// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "textcase",
  alias: ["textcase"],
  category: "tools",
  description: "Text case converter (UPPER, lower, Title, camelCase, snake_case, kebab-case)",
  usage: ".textcase <mode> <teks>",
  example: ".textcase upper halo dunia  atau  .textcase camel halo dunia",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const MODES = {
  upper: { desc: "UPPERCASE", fn: (t) => t.toUpperCase() },
  lower: { desc: "lowercase", fn: (t) => t.toLowerCase() },
  title: { desc: "Title Case", fn: (t) => t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) },
  sentence: { desc: "Sentence case", fn: (t) => t.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase()) },
  camel: { desc: "camelCase", fn: (t) => t.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()) },
  pascal: { desc: "PascalCase", fn: (t) => {
    const camel = t.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase());
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  }},
  snake: { desc: "snake_case", fn: (t) => t.trim().toLowerCase().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "") },
  kebab: { desc: "kebab-case", fn: (t) => t.trim().toLowerCase().replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") },
  constant: { desc: "CONSTANT_CASE", fn: (t) => t.trim().toUpperCase().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "") },
  reverse: { desc: "esrever (reversed)", fn: (t) => t.split("").reverse().join("") },
  alternate: { desc: "aLtErNaTe", fn: (t) => t.split("").map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join("") },
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const text = (m.text || "").trim();

    if (!text) {
      const modeList = Object.entries(MODES).map(([k, v]) => k + " = " + v.desc).join("\n");
      return m.reply(
        prefix + "textcase <mode> <teks>\n\n" +
        "Mode tersedia:\n" + modeList + "\n\n" +
        "Contoh:\n" +
        prefix + "textcase upper halo dunia\n" +
        prefix + "textcase camel hello world\n" +
        prefix + "textcase snake Halo Dunia Baru\n" +
        prefix + "textcase all halo dunia (tampilkan semua mode)",
        { title: "Text Case Converter" }
      );
    }

    const parts = text.split(/\s+/);
    const mode = parts[0].toLowerCase();
    const inputText = text.substring(parts[0].length).trim();

    if (!inputText) {
      return m.reply(claraWrap("TextCase", "Teks tidak boleh kosong!"));
    }

    // "all" mode: show all conversions
    if (mode === "all") {
      const lines = ["Input: " + (inputText.length > 60 ? inputText.substring(0, 60) + "..." : inputText), ""];
      for (const [k, v] of Object.entries(MODES)) {
        const result = v.fn(inputText);
        lines.push(v.desc + ": " + (result.length > 60 ? result.substring(0, 60) + "..." : result));
      }
      return m.reply(claraWrap("Text Case (All Modes)", lines.join("\n")));
    }

    if (!MODES[mode]) {
      return m.reply(claraWrap("TextCase", "Mode tidak dikenal!\nKetik " + prefix + "textcase untuk lihat daftar mode"));
    }

    const result = MODES[mode].fn(inputText);
    return m.reply(claraWrap("Text Case Convert", [
      "Mode: " + MODES[mode].desc,
      "Input: " + (inputText.length > 60 ? inputText.substring(0, 60) + "..." : inputText),
      "Hasil: " + (result.length > 80 ? result.substring(0, 80) + "..." : result),
    ].join("\n")));
  } catch (e) {
    console.error("textcase error:", e);
    return m.reply(claraWrap("TextCase", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
