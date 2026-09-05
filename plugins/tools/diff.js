// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "diff",
  alias: ["diff"],
  category: "tools",
  description: "Bandingin 2 teks dan highlight perbedaannya (line & word level)",
  usage: ".diff <teks1> | <teks2>  atau  .diff word <teks1> | <teks2>",
  example: ".diff Halo dunia | Hai dunia",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// ─── LCS-based diff (Longest Common Subsequence) ───
function lcsMatrix(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  return dp;
}

function diffLines(a, b) {
  const dp = lcsMatrix(a, b);
  const result = [];
  let i = 0, j = 0;
  const m = a.length, n = b.length;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      result.push({ type: "same", text: a[i] });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: "removed", text: a[i] });
      i++;
    } else {
      result.push({ type: "added", text: b[j] });
      j++;
    }
  }
  while (i < m) { result.push({ type: "removed", text: a[i] }); i++; }
  while (j < n) { result.push({ type: "added", text: b[j] }); j++; }
  return result;
}

function diffWords(a, b) {
  const wa = a.split(/\s+/);
  const wb = b.split(/\s+/);
  const dp = lcsMatrix(wa, wb);
  const result = [];
  let i = 0, j = 0;
  const m = wa.length, n = wb.length;
  while (i < m && j < n) {
    if (wa[i] === wb[j]) {
      result.push({ type: "same", text: wa[i] });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: "removed", text: wa[i] });
      i++;
    } else {
      result.push({ type: "added", text: wb[j] });
      j++;
    }
  }
  while (i < m) { result.push({ type: "removed", text: wa[i] }); i++; }
  while (j < n) { result.push({ type: "added", text: wb[j] }); j++; }
  return result;
}

// ─── Detect consecutive removed+added as "changed" ───
function markChanged(diffs) {
  const result = [];
  for (let k = 0; k < diffs.length; k++) {
    if (diffs[k].type === "removed") {
      const removedGroup = [];
      let idx = k;
      while (idx < diffs.length && diffs[idx].type === "removed") {
        removedGroup.push(diffs[idx]);
        idx++;
      }
      const addedGroup = [];
      while (idx < diffs.length && diffs[idx].type === "added") {
        addedGroup.push(diffs[idx]);
        idx++;
      }
      if (addedGroup.length > 0) {
        result.push({
          type: "changed",
          old: removedGroup.map((d) => d.text).join(" "),
          new: addedGroup.map((d) => d.text).join(" "),
        });
      } else {
        removedGroup.forEach((d) => result.push(d));
      }
      k = idx - 1;
    } else {
      result.push(diffs[k]);
    }
  }
  return result;
}

// ─── Format output ───
function formatDiff(diffs, mode) {
  let lines = [];
  let added = 0, removed = 0, changed = 0, same = 0;

  for (const d of diffs) {
    if (d.type === "same") {
      same++;
      if (mode === "line") {
        lines.push("  " + (d.text.length > 80 ? d.text.substring(0, 80) + "..." : d.text));
      }
    } else if (d.type === "added") {
      added++;
      lines.push("+ " + (d.text.length > 80 ? d.text.substring(0, 80) + "..." : d.text));
    } else if (d.type === "removed") {
      removed++;
      lines.push("- " + (d.text.length > 80 ? d.text.substring(0, 80) + "..." : d.text));
    } else if (d.type === "changed") {
      changed++;
      const oldT = d.old.length > 60 ? d.old.substring(0, 60) + "..." : d.old;
      const newT = d.new.length > 60 ? d.new.substring(0, 60) + "..." : d.new;
      lines.push("~ " + oldT);
      lines.push("  -> " + newT);
    }
  }

  // Trim long output
  if (lines.length > 40) {
    lines = lines.slice(0, 35);
    lines.push("... (" + (diffs.length - 35) + " baris lagi)");
  }

  lines.push("");
  lines.push("Statistik:");
  lines.push("Ditambah: +" + added + " | Dihapus: -" + removed + " | Diganti: ~" + changed + " | Sama: =" + same);

  return lines.join("\n");
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const text = (m.text || "").trim();

    if (!text) {
      return m.reply(
        prefix + "diff <teks1> | <teks2>\n" +
        prefix + "diff word <teks1> | <teks2>\n\n" +
        "Pemisah: tanda | di antara 2 teks\n" +
        "Mode default: line-by-line\n" +
        "Mode word: per kata\n\n" +
        "Contoh:\n" +
        prefix + "diff Halo dunia | Hai dunia\n" +
        prefix + "diff word Saya suka makan | Aku suka minum",
        { title: "Diff - Text Compare" }
      );
    }

    // Determine mode
    let mode = "line";
    let input = text;
    if (text.toLowerCase().startsWith("word ")) {
      mode = "word";
      input = text.substring(5).trim();
    }

    // Split by pipe
    const parts = input.split("|").map((s) => s.trim());
    if (parts.length < 2) {
      return m.reply(claraWrap("Diff", "Gunakan tanda | untuk pisahkan teks\n💡 *Contoh:* " + prefix + "diff Halo | Hai"));
    }

    const textA = parts[0];
    const textB = parts.slice(1).join("|").trim();

    if (!textA || !textB) {
      return m.reply(claraWrap("Diff", "Kedua teks tidak boleh kosong!"));
    }
    let diffs;

    if (mode === "word") {
      // Word-level: compare as single line
      const rawDiffs = diffWords(textA, textB);
      diffs = markChanged(rawDiffs);
    } else {
      // Line-level: split by newline
      const linesA = textA.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
      const linesB = textB.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

      // If both are single line, do word-level automatically
      if (linesA.length === 1 && linesB.length === 1) {
        const rawDiffs = diffWords(textA, textB);
        diffs = markChanged(rawDiffs);
      } else {
        diffs = markChanged(diffLines(linesA, linesB));
      }
    }

    const output = formatDiff(diffs, mode);
    const modeLabel = mode === "word" ? "Word Level" : "Line Level";
    await m.react("🐣");
    return m.reply(claraWrap("Diff Result (" + modeLabel + ")", output));
  } catch (e) {
    await m.react("❌");
    console.error("diff error:", e);
    return m.reply(claraWrap("Diff", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
