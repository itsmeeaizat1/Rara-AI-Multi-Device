import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

/**
 * plugins/islami/aiislam.js
 * Command .aiislam — AI Islamic Scholar via Puter + Quran API alquran.cloud
 *
 * Cara pakai:
 * .aiislam <pertanyaan> — Tanya AI soal Islam
 * .aiislam surah <nomor> — Baca surah pilihan
 * .aiislam ayah <surah>:<ayah> — Baca ayat tertentu
 * .aiislam tafsir <surah>:<ayah> — Tafsir ayat (AI)
 * .aiislam list — Daftar 114 surah
 * .aiislam reset — Reset sesi chat
 *
 * AI: Puter.com (cuma harus login, gratis, unlimited)
 * Quran data: alquran.cloud (gratis, no key)
 */

const pluginConfig = {
  name: "aiislam",
  alias: ["aiquran", "aislam", "tanyaislam"],
  category: "islami",
  description: "AI Islamic Scholar — tanya soal Islam, baca Quran & tafsir",
  usage: ".aiislam <pertanyaan>\n.aiislam surah <nomor>\n.aiislam ayah <surah>:<ayah>\n.aiislam tafsir <surah>:<ayah>\n.aiislam list\n.aiislam reset",
  example: ".aiislam jelaskan rukun iman",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const PUTER_API = "https://api.puter.com/puterai/openai/v1/chat/completions";
const QURAN_API = "https://api.alquran.cloud/v1";
const AI_MODEL = "gpt-5.4-nano";

// System prompt untuk AI Islamic Scholar
const SYSTEM_PROMPT = `Kamu adalah seorang ulama Islam dan ahli Al-Quran yang berpengetahuan luas.
Tugasmu menjawab pertanyaan seputar Islam dengan akurat, berdasarkan Al-Quran dan Hadits shahih.

Aturan:
1. Jawab dalam bahasa Indonesia yang mudah dipahami
2. Selalu sertakan dalil dari Al-Quran (surah:ayat) atau Hadits jika relevan
3. Jika ada perbedaan pendapat ulama, jelaskan dengan adil
4. Jangan memvonis atau mengkafirkan siapapun
5. Jika tidak yakin, katakan dengan jujur
6. Hindari fatwa personal, arahkan ke ulama terpercaya untuk hal sensitif
7. Gunakan format yang rapi dan mudah dibaca
8. Jika ditanya tentang ayat Quran, sertakan teks Arab, transliterasi, dan terjemahan jika memungkinkan`;

// Session storage
const sessions = new Map();
let tokenStore = "";

function sessionKey(m) {
  return m.sender || m.key?.remoteJid || "unknown";
}

function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, { messages: [] });
  }
  return sessions.get(userId);
}

// === Quran API functions ===

async function fetchSurahList() {
  const res = await fetch(`${QURAN_API}/surah`, {
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();
  if (!data.code === 200) throw new Error("Gagal mengambil daftar surah");
  return data.data;
}

async function fetchSurah(number, edition = "id.indonesian") {
  // Get Arabic + Indonesian translation
  const [arabRes, transRes] = await Promise.all([
    fetch(`${QURAN_API}/surah/${number}/quran-uthmani`, { signal: AbortSignal.timeout(15000) }),
    fetch(`${QURAN_API}/surah/${number}/${edition}`, { signal: AbortSignal.timeout(15000) }),
  ]);
  const arab = await arabRes.json();
  const trans = await transRes.json();
  if (arab.code !== 200) throw new Error("Gagal mengambil surah Arab");
  if (trans.code !== 200) throw new Error("Gagal mengambil terjemahan");
  return { arab: arab.data, trans: trans.data };
}

async function fetchAyah(ref, edition = "id.indonesian") {
  // ref format: "2:255" (surah:ayah)
  const [arabRes, transRes] = await Promise.all([
    fetch(`${QURAN_API}/ayah/${ref}/quran-uthmani`, { signal: AbortSignal.timeout(15000) }),
    fetch(`${QURAN_API}/ayah/${ref}/${edition}`, { signal: AbortSignal.timeout(15000) }),
  ]);
  const arab = await arabRes.json();
  const trans = await transRes.json();
  if (arab.code !== 200) throw new Error("Gagal mengambil ayat Arab");
  if (trans.code !== 200) throw new Error("Gagal mengambil terjemahan");
  return { arab: arab.data, trans: trans.data };
}

// === AI functions ===

async function callPuterAI(token, messages) {
  const res = await fetch(PUTER_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.5,
      max_tokens: 4000,
    }),
    signal: AbortSignal.timeout(60000),
  });

  let data;
  try { data = await res.json(); } catch {
    throw new Error("Response AI tidak dapat dibaca.");
  }

  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const reply = data?.choices?.[0]?.message?.content || "";
  if (!reply) throw new Error("Response AI kosong.");
  return reply;
}

// === Formatters ===

function formatSurahList(surahs) {
  let text = "";
  for (const s of surahs) {
    text += `${s.number}. ${s.englishName} (${s.englishNameTranslation}) — ${s.numberOfAyahs} ayat\n`;
  }
  return text;
}

function formatSurahContent(arab, trans) {
  let text = `Surah ${arab.englishName} (${arab.englishNameTranslation})\n`;
  text += `${arab.numberOfAyahs} ayat — ${arab.revelationType === "Meccan" ? "Makkiyah" : "Madaniyah"}\n\n`;

  const maxAyat = Math.min(arab.ayahs.length, 10); // Limit to first 10 for WhatsApp
  for (let i = 0; i < maxAyat; i++) {
    const a = arab.ayahs[i];
    const t = trans.ayahs[i];
    text += `${a.numberInSurah}. ${a.text}\n`;
    text += `   Artinya: ${t.text}\n\n`;
  }

  if (arab.ayahs.length > 10) {
    text += `Menampilkan 10 dari ${arab.numberOfAyahs} ayat.\n`;
    text += `Ayat tertentu: .aiislam ayah ${arab.number}:<nomor ayat>`;
  }

  return text;
}

function formatAyahContent(arab, trans) {
  let text = `Surah ${arab.surah.englishName}, Ayat ${arab.numberInSurah}\n\n`;
  text += `${arab.text}\n\n`;
  text += `Artinya:\n${trans.text}`;
  return text;
}

// === Handler ===

async function handler(m, { sock, config: botConfig }) {
  const text = m.args.join(" ").trim();
  const key = sessionKey(m);
  const session = getSession(key);

  // Token dari store, config, atau env
  const token = tokenStore
    || botConfig?.APIkey?.puter
    || process.env.PUTER_AUTH_TOKEN
    || "";

  // Sub-command: list
  if (text.toLowerCase() === "list" || text.toLowerCase() === "surahlist") {
    await m.react("🕐");
    try {
      const surahs = await fetchSurahList();
      await m.react("✅");
      return sendReplyWithNav(m, sock, claraWrap("Daftar Surah", formatSurahList(surahs)));
    } catch (e) {
      await m.react("✅");
      return m.reply(claraWrap("Error", e.message));
    }
  }

  // Sub-command: surah <nomor>
  if (text.toLowerCase().startsWith("surah ")) {
    const num = parseInt(text.slice(6).trim());
    if (!num || num < 1 || num > 114) {
      return m.reply(claraWrap("AI Islam", "Nomor surah tidak valid.\nKetik .aiislam list untuk daftar surah."));
    }
    await m.react("🕐");
    try {
      const { arab, trans } = await fetchSurah(num);
      await m.react("✅");
      return sendReplyWithNav(m, sock, claraWrap(`Surah ${arab.englishName}`, formatSurahContent(arab, trans)));
    } catch (e) {
      await m.react("✅");
      return m.reply(claraWrap("Error", e.message));
    }
  }

  // Sub-command: ayah <surah>:<ayah>
  if (text.toLowerCase().startsWith("ayah ")) {
    const ref = text.slice(5).trim();
    if (!ref.includes(":")) {
      return m.reply(claraWrap("AI Islam", "Format: .aiislam ayah <surah>:<ayah>\nContoh: .aiislam ayah 2:255"));
    }
    await m.react("🕐");
    try {
      const { arab, trans } = await fetchAyah(ref);
      await m.react("✅");
      return sendReplyWithNav(m, sock, claraWrap("Ayat", formatAyahContent(arab, trans)));
    } catch (e) {
      await m.react("✅");
      return m.reply(claraWrap("Error", e.message));
    }
  }

  // Sub-command: tafsir <surah>:<ayah>
  if (text.toLowerCase().startsWith("tafsir ")) {
    const ref = text.slice(7).trim();
    if (!ref.includes(":")) {
      return m.reply(claraWrap("AI Islam", "Format: .aiislam tafsir <surah>:<ayah>\nContoh: .aiislam tafsir 1:1"));
    }

    // Tafsir butuh token Puter
    if (!token) {
      const help = `Tafsir menggunakan AI Puter, butuh token.\n\nDaftar gratis di https://puter.com/dashboard → Create token\nSet: .puter setkey <token>`;
      return sendReplyWithNav(m, sock, claraWrap("AI Islam Setup", help));
    }

    await m.react("🕐");
    try {
      // Ambil ayat dulu
      const { arab, trans } = await fetchAyah(ref);

      // Buat prompt tafsir
      const prompt = `Berikan tafsir untuk ayat berikut:\n\nSurah ${arab.surah.englishName} (QS ${arab.surah.number}:${arab.numberInSurah})\n\nTeks Arab: ${arab.text}\nTerjemahan: ${trans.text}\n\nJelaskan tafsirnya dengan lengkap, sertakan konteks asbabun nuzul jika ada.`;

      const reply = await callPuterAI(token, [{ role: "user", content: prompt }]);
      await m.react("✅");
      return m.reply(claraWrap(`Tafsir ${arab.surah.englishName}:${arab.numberInSurah}`, reply));
    } catch (e) {
      await m.react("✅");
      return m.reply(claraWrap("Error", e.message));
    }
  }

  // Sub-command: reset
  if (text.toLowerCase() === "reset") {
    session.messages = [];
    return m.reply(claraWrap("AI Islam", "Sesi percakapan direset."));
  }

  // Validasi token untuk chat AI
  if (!token) {
    const help = `AI Islam menggunakan Puter, cuma harus login.\n\n1. Daftar gratis di https://puter.com/dashboard\n2. Klik Create token\n3. Set token: .puter setkey <token>\n\nSetelah itu bisa langsung tanya: .aiislam <pertanyaan>`;
    return sendReplyWithNav(m, sock, claraWrap("AI Islam Setup", help));
  }

  // Validasi pesan
  if (!text) {
    const help = `AI Islamic Scholar\n\nCara pakai:\n.aiislam <pertanyaan> — Tanya soal Islam\n.aiislam surah <nomor> — Baca surah\n.aiislam ayah <surah>:<ayah> — Baca ayat\n.aiislam tafsir <surah>:<ayah> — Tafsir AI\n.aiislam list — Daftar 114 surah\n.aiislam reset — Reset sesi\n\nContoh:\n.aiislam jelaskan rukun iman\n.aiislam surah 1\n.aiislam ayah 2:255\n.aiislam tafsir 1:1`;
    return sendReplyWithNav(m, sock, claraWrap("AI Islam", help));
  }

  // Chat AI
  await m.react("🕐");

  try {
    session.messages.push({ role: "user", content: text });

    // Limit context ke 10 pesan
    if (session.messages.length > 10) {
      session.messages = session.messages.slice(-10);
    }

    const reply = await callPuterAI(token, session.messages);

    session.messages.push({ role: "assistant", content: reply });

    await m.react("✅");
    return m.reply(claraWrap("AI Islam", reply));
  } catch (error) {
    await m.react("✅");
    session.messages.pop();

    let errMsg = error.message || "Gagal menghubungi AI.";
    if (errMsg.includes("401") || errMsg.includes("token") || errMsg.includes("auth")) {
      errMsg += "\n\nToken tidak valid. Set ulang: .puter setkey <token>";
    }
    return m.reply(claraWrap("AI Islam Error", errMsg));
  }
}

export { pluginConfig as config, handler };
