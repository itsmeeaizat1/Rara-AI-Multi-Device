// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

/**
 * plugins/islami/aiislam.js
 * Command .aiislam — AI Islamic Scholar + Quran reader (eQuran.id)
 *
 * API: eQuran.id (buatan Indonesia, sumber: Kemenag RI)
 * AI: Puter.com (cuma harus login, gratis, unlimited)
 *
 * Cara pakai:
 * .aiislam <pertanyaan> — Tanya AI soal Islam
 * .aiislam surah <nomor> — Baca surah (Arab + Latin + Indonesia)
 * .aiislam ayah <surah>:<ayah> — Baca ayat tertentu
 * .aiislam tafsir <surah>:<ayah> — Tafsir Kemenag (real, bukan AI)
 * .aiislam asktafsir <surah>:<ayah> — AI jelaskan tafsir
 * .aiislam list — Daftar 114 surah
 * .aiislam audio <surah> <qari> — Link audio murottal
 * .aiislam reset — Reset sesi chat
 */

const pluginConfig = {
  name: "aiislam",
  alias: ["aiislam", "islamai2", "aiislam2"],
  category: "islami",
  description: "AI Islamic Scholar + Quran reader (eQuran.id API Kemenag)",
  usage: ".aiislam <pertanyaan>\n.aiislam surah <nomor>\n.aiislam ayah <surah>:<ayah>\n.aiislam tafsir <surah>:<ayah>\n.aiislam asktafsir <surah>:<ayah>\n.aiislam list\n.aiislam reset",
  example: ".aiislam jelaskan rukun iman",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const QURAN_API = "https://equran.id/api/v2";
const PUTER_API = "https://api.puter.com/puterai/openai/v1/chat/completions";
const AI_MODEL = "gpt-5.4-nano";

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

const QARI_LIST = {
  "01": "Abdullah Al-Juhany",
  "02": "Abdul Muhsin Al-Qasim",
  "03": "Abdurrahman As-Sudais",
  "04": "Ibrahim Al-Dossari",
  "05": "Misyari Rasyid Al-Afasy",
  "06": "Yasser Al-Dosari",
};

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

// === eQuran.id API ===

async function fetchSurahList() {
  const res = await fetch(`${QURAN_API}/surat`, {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error("Gagal mengambil daftar surat");
  return data.data;
}

async function fetchSurahDetail(nomor) {
  const res = await fetch(`${QURAN_API}/surat/${nomor}`, {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error("Gagal mengambil detail surat");
  return data.data;
}

async function fetchTafsir(nomor) {
  const res = await fetch(`${QURAN_API}/tafsir/${nomor}`, {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error("Gagal mengambil tafsir");
  return data.data;
}

// === Puter AI ===

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

function stripHtml(text) {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function formatSurahList(surahs) {
  let text = "";
  for (const s of surahs) {
    text += `${s.nomor}. ${s.namaLatin} — ${s.arti} (${s.jumlahAyat} ayat)\n`;
  }
  return text;
}

function formatSurahContent(surah) {
  const tempatTurun = surah.tempatTurun === "Mekah" ? "Makkiyah" : "Madaniyah";
  let text = `${surah.namaLatin} (${surah.arti})\n`;
  text += `${surah.jumlahAyat} ayat — ${tempatTurun}\n`;
  text += `${surah.nama}\n\n`;

  const maxAyat = Math.min(surah.ayat.length, 10);
  for (let i = 0; i < maxAyat; i++) {
    const a = surah.ayat[i];
    text += `${a.nomorAyat}. ${a.teksArab}\n`;
    text += `${a.teksLatin}\n`;
    text += `${a.teksIndonesia}\n\n`;
  }

  if (surah.ayat.length > 10) {
    text += `Menampilkan 10 dari ${surah.jumlahAyat} ayat.\n`;
    text += `Ayat tertentu: .aiislam ayah ${surah.nomor}:<nomor>`;
  }

  return text;
}

function formatAyahContent(surah, ayahNum) {
  const ayah = surah.ayat.find(a => a.nomorAyat === ayahNum);
  if (!ayah) return null;

  let text = `${surah.namaLatin}, Ayat ${ayahNum}\n`;
  text += `${surah.nama}\n\n`;
  text += `${ayah.teksArab}\n\n`;
  text += `${ayah.teksLatin}\n\n`;
  text += `Artinya:\n${ayah.teksIndonesia}`;

  return text;
}

function formatTafsirContent(tafsirData, ayahNum) {
  const tafsir = tafsirData.tafsir.find(t => t.ayat === ayahNum);
  if (!tafsir) return null;

  const surahName = tafsirData.namaLatin;
  let text = `Tafsir ${surahName}, Ayat ${ayahNum}\n`;
  text += `Sumber: Kemenag RI\n\n`;
  text += stripHtml(tafsir.teks);

  // Limit to ~3000 chars for WhatsApp
  if (text.length > 3000) {
    text = text.slice(0, 3000) + "\n\n...(dipotong, tafsir lengkap terlalu panjang)";
  }

  return text;
}

// === Handler ===

async function handler(m, { sock, config: botConfig }) {
  const text = m.args.join(" ").trim();
  const key = sessionKey(m);
  const session = getSession(key);

  const token = tokenStore
    || botConfig?.APIkey?.puter
    || process.env.PUTER_AUTH_TOKEN
    || "";

  // Sub-command: list
  if (text.toLowerCase() === "list" || text.toLowerCase() === "surahlist") {
    await m.react("🐣");
    try {
      const surahs = await fetchSurahList();
      await m.react("✅");
      return m.reply( claraWrap("Daftar Surat", formatSurahList(surahs)));
    } catch (e) {
      await m.react("✅");
      return m.reply(claraWrap("Error", e.message));
    }
  }

  // Sub-command: surah <nomor>
  if (text.toLowerCase().startsWith("surah ") || text.toLowerCase().startsWith("surat ")) {
    const raw = text.split(/\s+/)[1] || "";
    const num = parseInt(raw);
    if (!num || num < 1 || num > 114) {
      return m.reply(claraWrap("AI Islam", "Nomor surat tidak valid.\nKetik .aiislam list untuk daftar surat."));
    }
    await m.react("🐣");
    try {
      const surah = await fetchSurahDetail(num);
      await m.react("✅");
      return m.reply( claraWrap(`${surah.namaLatin}`, formatSurahContent(surah)));
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
    const [surahNum, ayahNum] = ref.split(":").map(n => parseInt(n.trim()));
    if (!surahNum || surahNum < 1 || surahNum > 114 || !ayahNum) {
      return m.reply(claraWrap("AI Islam", "Format tidak valid. Contoh: .aiislam ayah 2:255"));
    }
    await m.react("🐣");
    try {
      const surah = await fetchSurahDetail(surahNum);
      const formatted = formatAyahContent(surah, ayahNum);
      if (!formatted) {
        await m.react("✅");
        return m.reply(claraWrap("AI Islam", `Ayat ${ayahNum} tidak ditemukan di ${surah.namaLatin}. Surat ini punya ${surah.jumlahAyat} ayat.`));
      }
      await m.react("✅");
      return m.reply( claraWrap(`${surah.namaLatin}:${ayahNum}`, formatted));
    } catch (e) {
      await m.react("✅");
      return m.reply(claraWrap("Error", e.message));
    }
  }

  // Sub-command: tafsir <surah>:<ayah> — Tafsir Kemenag (real, bukan AI)
  if (text.toLowerCase().startsWith("tafsir ")) {
    const ref = text.slice(7).trim();
    if (!ref.includes(":")) {
      return m.reply(claraWrap("AI Islam", "Format: .aiislam tafsir <surah>:<ayah>\nContoh: .aiislam tafsir 1:1"));
    }
    const [surahNum, ayahNum] = ref.split(":").map(n => parseInt(n.trim()));
    if (!surahNum || !ayahNum) {
      return m.reply(claraWrap("AI Islam", "Format tidak valid. Contoh: .aiislam tafsir 1:1"));
    }
    await m.react("🐣");
    try {
      const tafsirData = await fetchTafsir(surahNum);
      const formatted = formatTafsirContent(tafsirData, ayahNum);
      if (!formatted) {
        await m.react("✅");
        return m.reply(claraWrap("AI Islam", `Tafsir ayat ${ayahNum} tidak ditemukan di ${tafsirData.namaLatin}.`));
      }
      await m.react("✅");
      return m.reply( claraWrap(`Tafsir ${tafsirData.namaLatin}:${ayahNum}`, formatted));
    } catch (e) {
      await m.react("✅");
      return m.reply(claraWrap("Error", e.message));
    }
  }

  // Sub-command: asktafsir <surah>:<ayah> — AI jelaskan tafsir
  if (text.toLowerCase().startsWith("asktafsir ")) {
    const ref = text.slice(10).trim();
    if (!ref.includes(":")) {
      return m.reply(claraWrap("AI Islam", "Format: .aiislam asktafsir <surah>:<ayah>\nContoh: .aiislam asktafsir 1:1"));
    }
    const [surahNum, ayahNum] = ref.split(":").map(n => parseInt(n.trim()));
    if (!surahNum || !ayahNum) {
      return m.reply(claraWrap("AI Islam", "Format tidak valid."));
    }
    if (!token) {
      return m.reply(claraWrap("AI Islam", "AI butuh token Puter. Set: .puter setkey <token>"));
    }
    await m.react("🐣");
    try {
      // Ambil ayat + tafsir Kemenag
      const [surah, tafsirData] = await Promise.all([
        fetchSurahDetail(surahNum),
        fetchTafsir(surahNum),
      ]);
      const ayah = surah.ayat.find(a => a.nomorAyat === ayahNum);
      const tafsir = tafsirData.tafsir.find(t => t.ayat === ayahNum);
      if (!ayah) {
        await m.react("✅");
        return m.reply(claraWrap("AI Islam", `Ayat ${ayahNum} tidak ditemukan di ${surah.namaLatin}.`));
      }

      // Buat prompt dengan data Quran + tafsir Kemenag
      const tafsirText = tafsir ? stripHtml(tafsir.teks).slice(0, 2000) : "(tafsir tidak tersedia)";
      const prompt = `Jelaskan tafsir ayat berikut dengan bahasa sederhana dan mudah dipahami:\n\nSurah ${surah.namaLatin} (QS ${surah.nomor}:${ayahNum})\nTeks Arab: ${ayah.teksArab}\nTransliterasi: ${ayah.teksLatin}\nTerjemahan: ${ayah.teksIndonesia}\n\nTafsir Kemenag: ${tafsirText}\n\nTolong jelaskan dengan bahasa yang lebih sederhana, berikan contoh penerapan dalam kehidupan sehari-hari jika relevan.`;

      const reply = await callPuterAI(token, [{ role: "user", content: prompt }]);
      await m.react("✅");
      return m.reply(claraWrap(`AI Tafsir ${surah.namaLatin}:${ayahNum}`, reply));
    } catch (e) {
      await m.react("✅");
      return m.reply(claraWrap("Error", e.message));
    }
  }

  // Sub-command: audio <surah> <qari>
  if (text.toLowerCase().startsWith("audio ")) {
    const parts = text.slice(6).trim().split(/\s+/);
    const surahNum = parseInt(parts[0]);
    const qariId = parts[1] || "05"; // Default: Mishary Rashid Alafasy
    if (!surahNum || surahNum < 1 || surahNum > 114) {
      return m.reply(claraWrap("AI Islam", "Format: .aiislam audio <surah> <qari>\nQari: 01-06\nContoh: .aiislam audio 1 05"));
    }
    await m.react("🐣");
    try {
      const surah = await fetchSurahDetail(surahNum);
      const qariName = QARI_LIST[qariId] || QARI_LIST["05"];
      const audioFull = surah.audioFull?.[qariId] || surah.audioFull?.["05"];
      if (!audioFull) {
        await m.react("✅");
        return m.reply(claraWrap("AI Islam", "Audio tidak ditemukan."));
      }
      await m.react("✅");

      // Kirim audio
      const audioRes = await fetch(audioFull, { signal: AbortSignal.timeout(30000) });
      if (audioRes.ok) {
        const buffer = Buffer.from(await audioRes.arrayBuffer());
        await sock.sendMessage(m.chat, {
          audio: buffer,
          mimetype: "audio/mpeg",
          ptt: false,
        }, { quoted: m });
        return m.reply(claraWrap(`${surah.namaLatin}`, `Qari: ${qariName}`));
      }
      return m.reply(claraWrap("AI Islam", `Audio: ${audioFull}\nQari: ${qariName}`));
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
    return m.reply( claraWrap("AI Islam Setup", help));
  }

  // Validasi pesan
  if (!text) {
    const help = `AI Islamic Scholar — eQuran.id\n\nCara pakai:\n.aiislam <pertanyaan> — Tanya soal Islam\n.aiislam surah <nomor> — Baca surat\n.aiislam ayah <surah>:<ayah> — Baca ayat\n.aiislam tafsir <surah>:<ayah> — Tafsir Kemenag\n.aiislam asktafsir <surah>:<ayah> — AI jelaskan tafsir\n.aiislam audio <surah> <qari> — Audio murottal\n.aiislam list — Daftar 114 surat\n.aiislam reset — Reset sesi\n\nContoh:\n.aiislam jelaskan rukun iman\n.aiislam surah 1\n.aiislam ayah 2:255\n.aiislam tafsir 1:1\n.aiislam asktafsir 1:1\n.aiislam audio 112 05`;
    return m.reply( claraWrap("AI Islam", help));
  }

  // Chat AI
  await m.react("🐣");

  try {
    session.messages.push({ role: "user", content: text });

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
