// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// typingrace.js — Ketik cepat / Typing speed test via Quotable API (no API key)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "typingrace",
  alias: ["typingrace"],
  category: "game",
  description: "Tes kecepatan mengetik (WPM) — ketik quote secepat mungkin",
  usage: ".typingrace [start/easy/medium/hard/end]",
  example: ".typingrace\n.typingrace start\n.typingrace hard",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

// Sessions: chatId -> { quote, startTime, text, difficulty }
const sessions = new Map();

const DIFFICULTY = {
  easy: { minLength: 30, maxLength: 80, label: "Mudah" },
  medium: { minLength: 80, maxLength: 150, label: "Sedang" },
  hard: { minLength: 150, maxLength: 300, label: "Sulit" },
};

async function fetchQuote(difficulty) {
  const d = DIFFICULTY[difficulty] || DIFFICULTY.medium;
  let url = "https://api.quotable.io/random";
  // Quotable doesn't have length filter in random endpoint, so we just fetch
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Quotable ${res.status}`);
  const json = await res.json();
  return {
    text: json.content,
    author: json.author,
  };
}

// Local fallback quotes
const FALLBACK_QUOTES = [
  { text: "Kesuksesan bukanlah kunci kebahagiaan. Kebahagiaan adalah kunci kesuksesan.", author: "Albert Schweitzer" },
  { text: "Jangan menunggu kesempatan. Ciptakanlah.", author: "George Bernard Shaw" },
  { text: "Pendidikan adalah senjata paling ampuh untuk mengubah dunia.", author: "Nelson Mandela" },
  { text: "Hidup adalah apa yang terjadi saat kamu sibuk membuat rencana lain.", author: "John Lennon" },
  { text: "Cara terbaik untuk memulai adalah berhenti bicara dan mulai melakukan.", author: "Walt Disney" },
  { text: "Belajar dari kemarin, hidup untuk hari ini, harapan untuk besok.", author: "Albert Einstein" },
  { text: "Satu-satunya cara untuk melakukan pekerjaan hebat adalah mencintai apa yang kamu lakukan.", author: "Steve Jobs" },
  { text: "Kreatifitas adalah kecerdasan yang bersenang-senang.", author: "Albert Einstein" },
  { text: "Jangan takut gagal, takutilah untuk tidak mencoba.", author: "Unknown" },
  { text: "Mimpi tidak menjadi kenyataan karena sihir, butuh keringat, tekad, dan kerja keras.", author: "Colin Powell" },
];

async function handler(m, { sock, config, db }) {
  try {
    const input = (m.args?.[0] || "").toLowerCase();

    if (!input || input === "help") {
      return m.reply(claraWrap("Typing Race", [
        "Tes kecepatan mengetik (WPM)",
        "",
        "📌 *Cara Pakai:*",
        `${m.prefix}typingrace start — mulai (level sedang)`,
        `${m.prefix}typingrace easy — quote pendek`,
        `${m.prefix}typingrace medium — quote sedang`,
        `${m.prefix}typingrace hard — quote panjang`,
        `${m.prefix}typingrace end — akhiri sesi`,
        "",
        "Setelah quote muncul, ketik ulang persis sama. Bot hitung WPM.",
      ]));
    }

    if (input === "end" || input === "stop") {
      if (sessions.has(m.chat)) {
        sessions.delete(m.chat);
        return m.reply(claraWrap("Typing Race", "Sesi diakhiri."));
      }
      return m.reply(claraWrap("Typing Race", "Tidak ada sesi aktif."));
    }

    if (input === "start" || input === "easy" || input === "medium" || input === "hard" || input === "new") {
      const difficulty = DIFFICULTY[input] ? input : "medium";

      let quote = null;
      try {
        quote = await fetchQuote(difficulty);
      } catch (e) {
        console.log("[typingrace] API failed, using local:", e.message);
        quote = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
      }

      sessions.set(m.chat, {
        text: quote.text,
        author: quote.author,
        startTime: Date.now(),
        difficulty,
        active: true,
      });

      // Auto-end after 2 minutes
      setTimeout(() => {
        if (sessions.has(m.chat) && sessions.get(m.chat).text === quote.text) {
          sessions.delete(m.chat);
        }
      }, 120000);
      return m.reply(claraWrap("Typing Race", [
        `Level: ${DIFFICULTY[difficulty].label}`,
        `Penulis: ${quote.author}`,
        "",
        `Ketik ulang quote ini persis sama:`,
        "",
        `"${quote.text}"`,
        "",
        "Waktu mulai sekarang. Ketik ulang untuk lihat WPM-mu!",
      ]));
    }

    // Check if there's an active session and user typed something
    const session = sessions.get(m.chat);
    if (!session || !session.active) {
      return m.reply(claraWrap("Typing Race", `Belum ada sesi aktif. Ketik "${m.prefix}typingrace start" untuk mulai.`));
    }

    // User is trying to type the quote — compare
    const userText = m.text?.replace(new RegExp(`^${m.prefix}typingrace\\s*`, "i"), "").trim() || m.text?.trim() || "";

    if (userText === session.text) {
      const elapsed = (Date.now() - session.startTime) / 1000;
      const words = session.text.split(" ").length;
      const wpm = Math.round((words / elapsed) * 60);
      const accuracy = "100%";
      const chars = session.text.length;

      sessions.delete(m.chat);
      return m.reply(claraWrap("Typing Race", [
        "🎉 Sempurna!",
        `WPM: ${wpm}`,
        `Waktu: ${elapsed.toFixed(1)}s`,
        `Kata: ${words} | Karakter: ${chars}`,
        `Akurasi: ${accuracy}`,
        `Quote: ${session.author}`,
      ]));
    } else {
      // Calculate accuracy based on correct chars
      let correct = 0;
      const minLen = Math.min(userText.length, session.text.length);
      for (let i = 0; i < minLen; i++) {
        if (userText[i] === session.text[i]) correct++;
      }
      const accuracy = Math.round((correct / session.text.length) * 100);
      const elapsed = (Date.now() - session.startTime) / 1000;
      const words = session.text.split(" ").length;
      const wpm = Math.round((words / elapsed) * 60);

      sessions.delete(m.chat);
      return m.reply(claraWrap("Typing Race", [
        "Hasil typing:",
        `WPM: ${wpm}`,
        `Akurasi: ${accuracy}%`,
        `Waktu: ${elapsed.toFixed(1)}s`,
        "",
        `Quote asli: "${session.text}"`,
      ]));
    }
  } catch (e) {
    console.error("[typingrace] error:", e.message);
    return m.reply(te(m.prefix, m.command, m.pushName), "typingrace");
  }
}

export { pluginConfig as config, handler };
