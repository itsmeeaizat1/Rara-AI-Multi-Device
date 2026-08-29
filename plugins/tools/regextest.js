// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "regextest",
  alias: ["regextest", "regex"],
  category: "tools",
  description: "Test regex pattern terhadap teks, highlight match & capture groups",
  usage: ".regex <pattern> | <teks>  atau  .regex flags <flags> <pattern> | <teks>",
  example: ".regex \\d+ | Halo 123 dunia 456",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const text = (m.text || "").trim();

    if (!text) {
      return m.reply(
        prefix + "regex <pattern> | <teks>\n" +
        prefix + "regex flags <flags> <pattern> | <teks>\n\n" +
        "Pemisah: tanda |\n" +
        "Flags: g (global), i (case-insensitive), m (multiline), s (dotall), u (unicode)\n" +
        "Default flags: g (global)\n\n" +
        "Contoh:\n" +
        prefix + "regex \\d+ | Halo 123 dunia 456\n" +
        prefix + "regex flags gi \\b[a-z]+\\b | Hello World 42\n" +
        prefix + "regex (\\w+)@(\\w+\\.\\w+) | email ke test@gmail.com",
        { title: "Regex Tester" }
      );
    }

    let input = text;
    let flags = "g";

    // Check for explicit flags
    if (text.toLowerCase().startsWith("flags ")) {
      const afterFlags = text.substring(6).trim();
      const spaceIdx = afterFlags.indexOf(" ");
      if (spaceIdx === -1) {
        return m.reply(claraWrap("Regex", "Format flags salah!\n💡 *Contoh:* " + prefix + "regex flags gi \\d+ | teks123"));
      }
      flags = afterFlags.substring(0, spaceIdx).trim();
      // Validate flags
      if (!/^[gimsuy]*$/.test(flags)) {
        return m.reply(claraWrap("Regex", "Flags tidak valid!\nValid: g, i, m, s, u, y"));
      }
      input = afterFlags.substring(spaceIdx + 1).trim();
    }

    // Split by pipe — first part is pattern, rest is text
    const pipeIdx = input.indexOf("|");
    if (pipeIdx === -1) {
      return m.reply(claraWrap("Regex", "Gunakan | untuk pisahkan pattern dan teks\n💡 *Contoh:* " + prefix + "regex \\d+ | Halo 123"));
    }

    const patternStr = input.substring(0, pipeIdx).trim();
    const testText = input.substring(pipeIdx + 1).trim();

    if (!patternStr) {
      return m.reply(claraWrap("Regex", "Pattern tidak boleh kosong!"));
    }
    if (!testText) {
      return m.reply(claraWrap("Regex", "Teks tidak boleh kosong!"));
    }
    // Compile regex
    let regex;
    try {
      regex = new RegExp(patternStr, flags);
    } catch (e) {
      return m.reply(claraWrap("Regex Error", "Pattern invalid: " + e.message));
    }

    // Find all matches
    let matches = [];
    let match;

    if (flags.includes("g")) {
      while ((match = regex.exec(testText)) !== null) {
        matches.push(match);
        // Prevent infinite loop on zero-length matches
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }
    } else {
      match = regex.exec(testText);
      if (match) matches.push(match);
    }

    if (matches.length === 0) {
      return m.reply(claraWrap("Regex Result", [
        "Pattern: /" + patternStr + "/" + flags,
        "Teks: " + (testText.length > 60 ? testText.substring(0, 60) + "..." : testText),
        "",
        "Hasil: Tidak ada match",
      ].join("\n")));
    }

    // Build output
    let lines = [
      "Pattern: /" + patternStr + "/" + flags,
      "Teks: " + (testText.length > 80 ? testText.substring(0, 80) + "..." : testText),
      "",
      "Match ditemukan: " + matches.length,
      "",
    ];

    matches.forEach((mt, i) => {
      const matchNum = i + 1;
      const matchedText = mt[0];
      const pos = mt.index;

      lines.push("Match " + matchNum + ": \"" + (matchedText.length > 50 ? matchedText.substring(0, 50) + "..." : matchedText) + "\"");

      if (pos !== undefined) {
        lines.push("  Posisi: " + pos + "-" + (pos + matchedText.length));
      }

      // Capture groups
      if (mt.length > 1) {
        for (let g = 1; g < mt.length; g++) {
          const groupVal = mt[g] || "(kosong)";
          lines.push("  Group " + g + ": " + (groupVal.length > 50 ? groupVal.substring(0, 50) + "..." : groupVal));
        }
      }

      // Named groups
      if (mt.groups) {
        const groupKeys = Object.keys(mt.groups);
        for (const key of groupKeys) {
          const val = mt.groups[key] || "(kosong)";
          lines.push("  Group <" + key + ">: " + (val.length > 50 ? val.substring(0, 50) + "..." : val));
        }
      }
    });

    // Visual highlight
    lines.push("");
    lines.push("Visualisasi:");

    if (flags.includes("g")) {
      let highlighted = testText;
      let offset = 0;
      const sortedMatches = matches.map((mt) => ({
        start: mt.index,
        end: mt.index + mt[0].length,
        text: mt[0],
      }));

      // Build from left to right
      let result = "";
      let lastEnd = 0;
      for (const sm of sortedMatches) {
        result += testText.substring(lastEnd, sm.start);
        result += "[" + sm.text + "]";
        lastEnd = sm.end;
      }
      result += testText.substring(lastEnd);

      // Truncate if too long
      if (result.length > 200) {
        result = result.substring(0, 200) + "...";
      }
      lines.push(result);
    } else {
      // Single match highlight
      const mt = matches[0];
      let result = testText.substring(0, mt.index) + "[" + mt[0] + "]" + testText.substring(mt.index + mt[0].length);
      if (result.length > 200) {
        result = result.substring(0, 200) + "...";
      }
      lines.push(result);
    }

    // Stats
    lines.push("");
    const totalMatchedChars = matches.reduce((s, mt) => s + mt[0].length, 0);
    lines.push("Total karakter match: " + totalMatchedChars + "/" + testText.length);

    // Truncate output if too long
    if (lines.length > 45) {
      lines = lines.slice(0, 40);
      lines.push("... (output dipotong)");
    }
    return m.reply(claraWrap("Regex Result", lines.join("\n")));
  } catch (e) {
    console.error("regextest error:", e);
    return m.reply(claraWrap("Regex", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
