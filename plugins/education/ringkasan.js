// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ringkasan",
  alias: ["ringkasan"],
  category: "education",
  description: "Ringkas teks panjang jadi poin-poin utama (extractive summarization)",
  usage: ".ringkasan <teks>",
  example: ".ringkasan <paste teks panjang>",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 3,
  isEnabled: true,
};

// Stopwords Indonesian + English
const STOPWORDS = new Set([
  "yang","di","ke","dari","dan","atau"," tapi","pada","untuk","dengan","adalah","ini","itu",
  "akan","tidak","juga","dalam","bisa","oleh","karena","seperti","saya","kamu","dia","mereka",
  "kita","ada","lebih","sangat","sudah","belum","masih","harus","bisa","dapat","agar","supaya",
  "the","a","an","is","are","was","were","be","been","being","have","has","had","do","does",
  "did","will","would","could","should","may","might","can","of","in","on","at","to","for",
  "with","by","from","about","as","into","like","through","after","over","between","out",
  "and","but","or","nor","not","so","yet","both","each","few","more","most","other","some",
  "such","no","only","own","same","than","too","very","just","because","if","when","where",
  "how","what","which","who","whom","this","that","these","those","i","you","he","she","we",
  "they","it","its","their","his","her","my","your","our","me","him","us","them",
]);

function splitSentences(text) {
  // Handle Indonesian + English sentence boundaries
  return text
    .replace(/\n+/g, " ")
    .match(/[^.!?]+[.!?]+(?:\s|$)/g)
    ?.map(s => s.trim())
    .filter(s => s.length > 10) || [];
}

function tokenize(text) {
  return text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || [];
}

function wordFrequency(text) {
  const freq = new Map();
  const words = tokenize(text);
  for (const w of words) {
    if (STOPWORDS.has(w) || w.length < 2) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return freq;
}

function scoreSentence(sentence, freqMap) {
  const words = tokenize(sentence);
  if (words.length === 0) return 0;
  let score = 0;
  let count = 0;
  for (const w of words) {
    if (STOPWORDS.has(w) || w.length < 2) continue;
    score += freqMap.get(w) || 0;
    count++;
  }
  return count > 0 ? score / count : 0;
}

function summarize(text, numSentences = 5) {
  const sentences = splitSentences(text);
  if (sentences.length <= 3) return sentences;
  
  const freqMap = wordFrequency(text);
  
  // Score each sentence
  const scored = sentences.map((s, idx) => ({
    text: s,
    score: scoreSentence(s, freqMap),
    index: idx,
  }));
  
  // Sort by score, take top N
  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(numSentences, sentences.length));
  
  // Re-sort by original position for readability
  top.sort((a, b) => a.index - b.index);
  
  return top.map(t => t.text);
}

function extractKeywords(text, count = 5) {
  const freq = wordFrequency(text);
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, count).map(([word]) => word);
}

function estimateReadingTime(text) {
  const words = (text.match(/\S+/g) || []).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} menit`;
}

async function handler(m, { sock, args }) {
  const text = args.join(" ");

  if (!text || text.length < 50) {
    let txt = `Ringkasan Teks\n\n`;
    txt += `Ringkas teks panjang jadi poin-poin utama.\n\n`;
    txt += `Cara pakai:\n`;
    txt += `1. \`${m.prefix}ringkasan <paste teks>\` - Ringkas teks (5 poin)\n`;
    txt += `2. \`${m.prefix}ringkasan <jumlah> <paste teks>\` - Ringkas dengan jumlah poin custom\n\n`;
    txt += `Contoh:\n`;
    txt += `\`${m.prefix}ringkasan Lorem ipsum dolor sit amet...\`\n`;
    txt += `\`${m.prefix}ringkasan 3 Lorem ipsum dolor sit amet...\`\n\n`;
    txt += `Min 50 karakter. Maks 5000 karakter.\n`;
    txt += `_Extractive summarization - pilih kalimat terpenting berdasarkan frekuensi kata_`;
    return await m.reply( txt, { commandName: "ringkasan" });
  }

  await m.react("🕒");

  try {
    // Check for custom number of points
    let numPoints = 5;
    let inputText = text;
    const firstWord = parseInt(args[0]);
    if (!isNaN(firstWord) && firstWord >= 1 && firstWord <= 20) {
      numPoints = firstWord;
      inputText = args.slice(1).join(" ");
    }

    if (inputText.length < 50) {
      return m.reply(claraWrap("Ringkasan", "Teks terlalu pendek! Minimal 50 karakter."));
    }

    if (inputText.length > 5000) {
      return m.reply(claraWrap("Ringkasan", "Teks terlalu panjang! Maksimal 5000 karakter."));
    }

    // Summarize
    const summary = summarize(inputText, numPoints);
    const keywords = extractKeywords(inputText, 5);
    const readingTime = estimateReadingTime(inputText);
    const originalSentences = splitSentences(inputText);

    let txt = `Ringkasan Teks\n\n`;
    txt += `${originalSentences.length} kalimat asli -> ${summary.length} poin\n`;
    txt += `Estimasi baca asli: ${readingTime}\n\n`;
    txt += `Poin Utama:\n`;
    for (let i = 0; i < summary.length; i++) {
      txt += `${i + 1}. ${summary[i]}\n`;
    }
    txt += `\nKata Kunci: ${keywords.join(", ")}\n\n`;
    txt += `_Ringkas dengan ${numPoints} poin_`;

    await m.reply(txt);
    await m.react("🐣");
  } catch (e) {
    console.error("[RINGKASAN] Error:", e.message);
    await m.reply(novaError("Ringkasan", `Gagal rangkum nih: ${e.message}`));
  }
}

export { pluginConfig as config, handler };
