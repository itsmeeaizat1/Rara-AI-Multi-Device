// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "lorem",
  alias: ["lorem"],
  category: "tools",
  description: "Lorem ipsum generator (paragraf, kata, kalimat, list)",
  usage: ".lorem <jumlah> <unit>",
  example: ".lorem 3 paragraf  atau  .lorem 50 kata  atau  .lorem 5 kalimat",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
  "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
  "velit", "esse", "cillum", "fugiat", "nulla", "pariatur", "excepteur", "sint",
  "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
  "deserunt", "mollit", "anim", "id", "est", "laborum", "at", "vero", "eos",
  "accusamus", "iusto", "odio", "dignissimos", "ducimus", "praesentium",
  "voluptatum", "deleniti", "atque", "corrupti", "quos", "quas", "molestias",
  "quod", "maxime", "placeat", "facere", "possimus", "omnis", "voluptas",
  "assumenda", "repudiandae", "recusandae", "nam", "libero", "tempore", "cum",
  "soluta", "nobis", "eligendi", "optio", "cumque", "nihil", "impedit", "quo",
  "minus", "quod", "maxime", "placeat", "facere", "possimus",
];

const SENTENCES = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse.",
  "Excepteur sint occaecat cupidatat non proident sunt in culpa.",
  "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit.",
  "Neque porro quisquam est qui dolorem ipsum quia dolor sit amet.",
  "Consectetur adipiscing elit sed do eiusmod tempor incididunt.",
  "Labore et dolore magna aliqua ut enim ad minim veniam quis.",
  "Nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.",
  "Tempor incididunt ut labore et dolore magna aliqua enim ad minim.",
  "Voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  "Reprehenderit in voluptate velit esse cillum dolore eu fugiat.",
  "Accusamus et iusto odio dignissimos ducimus qui blanditiis.",
  "Praesentium voluptatum deleniti atque corrupti quos dolores.",
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateWords(count) {
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(pick(WORDS));
  }
  // Capitalize first word
  if (result.length > 0) {
    result[0] = result[0].charAt(0).toUpperCase() + result[0].slice(1);
  }
  return result.join(" ") + ".";
}

function generateSentence() {
  const wordCount = randInt(8, 16);
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(pick(WORDS));
  }
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.join(" ") + ".";
}

function generateSentences(count) {
  const result = [];
  for (let i = 0; i < count; i++) {
    // Mix pre-made and generated
    if (Math.random() > 0.5 && i < SENTENCES.length) {
      result.push(pick(SENTENCES));
    } else {
      result.push(generateSentence());
    }
  }
  return result.join(" ");
}

function generateParagraph() {
  const sentenceCount = randInt(3, 6);
  return generateSentences(sentenceCount);
}

function generateParagraphs(count) {
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(generateParagraph());
  }
  return result.join("\n\n");
}

function generateList(count) {
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push((i + 1) + ". " + generateSentence());
  }
  return result.join("\n");
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const text = (m.text || "").trim();

    if (!text) {
      return m.reply(
        prefix + "lorem <jumlah> <unit>\n\n" +
        "Unit:\n" +
        "paragraf = blok paragraf\n" +
        "kata = jumlah kata\n" +
        "kalimat = jumlah kalimat\n" +
        "list = numbered list\n\n" +
        "Contoh:\n" +
        prefix + "lorem 3 paragraf\n" +
        prefix + "lorem 50 kata\n" +
        prefix + "lorem 5 kalimat\n" +
        prefix + "lorem 4 list",
        { title: "Lorem Ipsum Generator" }
      );
    }

    const parts = text.toLowerCase().split(/\s+/);

    let count = 1;
    let unit = "paragraf";

    if (parts.length >= 2) {
      const num = parseInt(parts[0]);
      if (isNaN(num) || num < 1) {
        return m.reply(claraWrap("Lorem", "Jumlah harus angka positif!"));
      }
      if (num > 100) {
        return m.reply(claraWrap("Lorem", "Maksimal 100! Terlalu banyak akan dipotong."));
      }
      count = num;

      const unitRaw = parts[1];
      if (unitRaw.startsWith("para")) unit = "paragraf";
      else if (unitRaw.startsWith("kata") || unitRaw === "word" || unitRaw === "words") unit = "kata";
      else if (unitRaw.startsWith("kali") || unitRaw === "sentence" || unitRaw === "sentences") unit = "kalimat";
      else if (unitRaw === "list" || unitRaw === "lists") unit = "list";
      else unit = "paragraf";
    } else {
      // Single number = paragraphs
      const num = parseInt(parts[0]);
      if (!isNaN(num) && num > 0) count = num;
    }

    await m.react("🕒");

    let result;
    let label;

    switch (unit) {
      case "paragraf":
        result = generateParagraphs(count);
        label = count + " paragraf";
        break;
      case "kata":
        result = generateWords(count);
        label = count + " kata";
        break;
      case "kalimat":
        result = generateSentences(count);
        label = count + " kalimat";
        break;
      case "list":
        result = generateList(count);
        label = count + " item list";
        break;
      default:
        result = generateParagraphs(count);
        label = count + " paragraf";
    }

    // Truncate if too long for WhatsApp
    if (result.length > 2000) {
      result = result.substring(0, 2000) + "\n... (dipotong)";
    }

    await m.react("🐣");
    return m.reply(claraWrap("Lorem Ipsum (" + label + ")", result));
  } catch (e) {
    console.error("lorem error:", e);
    await m.react("❌");
    return m.reply(claraWrap("Lorem", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
