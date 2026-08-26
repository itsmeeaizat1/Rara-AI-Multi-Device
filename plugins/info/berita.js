// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { GoogleSearch } from "../../src/scraper/google.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import config from "../../config.js";

const pluginConfig = {
  name: "berita",
  alias: ["berita"],
  category: "info",
  desc: "Cari & rangkum berita terkini real-time dari internet tanpa clickbait",
  usage: ".berita <topik>",
  example: ".berita teknologi terbaru",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

// ─── Gemini dengan Google Search Grounding (real-time) ───
async function searchAndSummarize(query) {
  const googleKey = config.APIkey?.google || "";
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleKey}`;

  const prompt = `Kamu adalah jurnalis profesional Indonesia. Cari berita terkini dan terbaru tentang "${query}" menggunakan pencarian Google.

Tugasmu: Rangkum berita yang kamu temukan ke format BERIKUT INI persis:

📰 RANGKUMAN BERITA: ${query}

[3-5 poin berita terpenting dan TERBARU yang kamu temukan dari pencarian. Tiap poin maksimal 2-3 kalimat. Sajikan FAKTA saja, tanpa clickbait. Gunakan bahasa Indonesia yang jelas dan padat. Gunakan nomor (1. 2. 3.) untuk setiap poin.]

📎 SUMBER
[Sebutkan nama sumber berita yang relevan yang kamu temukan dari pencarian, maksimal 3 sumber]

🕐 WAKTU PENCARIAN
[Tulis tanggal dan perkiraan waktu pencarian saat ini]

⚠️ CATATAN
[1 kalimat: "Berita dirangkum dari hasil pencarian real-time Google. Akurasi dapat berbeda dengan perkembangan terbaru."]

Aturan:
1. WAJIB berdasarkan hasil pencarian real-time, JANGAN gunakan pengetahuan lama
2. Jika tidak menemukan berita terkini, tulis "Tidak ada berita terbaru ditemukan untuk topik ini saat ini"
3. Jangan gunakan markdown formatting (tidak bold, tidak heading)
4. Gunakan nomor (1. 2. 3.) untuk poin berita
5. Fokus pada berita HARI INI atau minggu ini, bukan berita lama`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1500,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();

  // Extract text from candidates
  const candidate = data?.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  let text = "";
  for (const part of parts) {
    if (part.text) text += part.text;
  }

  if (!text) throw new Error("AI mengembalikan respon kosong");

  // Extract grounding sources if available
  const groundingMetadata = candidate?.groundingMetadata;
  let sources = [];
  if (groundingMetadata?.groundingChunks) {
    sources = groundingMetadata.groundingChunks
      .map((chunk) => chunk?.web)
      .filter(Boolean)
      .map((web) => web.title || web.uri || "")
      .filter(Boolean)
      .slice(0, 5);
  }

  return { text: text.trim(), sources };
}

// ─── Scrape Google News RSS (supplementary headlines) ───
async function scrapeGoogleNews(query) {
  try {
    const result = await GoogleSearch(query);
    if (result.status && result.results && result.results.length > 0) {
      return result.results.slice(0, 5).map((r) => ({
        title: r.resource_title || r.title || "",
        source: r.origin_node || "",
        link: r.resolved_endpoint || r.link || "",
        time: r.temporal_stamp || "",
      }));
    }
  } catch (_) { console.error('[berita.js]:', _?.message || _); }
  return [];
}

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const query = m.text?.trim();

  if (!query) {
    const text = claraWrap("Berita AI", [
      `Mencari dan merangkum berita terkini real-time dari internet.`,
      ``,
      `Penggunaan: *${prefix}berita <topik>*`,
      ``,
      `Contoh:`,
      `*${prefix}berita teknologi terbaru*`,
      `*${prefix}berita gempa hari ini*`,
      `*${prefix}berita piala dunia*`,
      `*${prefix}berita politik Indonesia*`,
    ].join("\n"));
    await m.reply( text, "berita");
    return;
  }

  await m.react("🕒");

  let headlines = [];
  let aiResult = null;

  try {
    // Step 1: Scrape Google News RSS untuk headline cepat (parallel)
    // Step 2: Gemini dengan google_search grounding untuk rangkuman real-time
    const [newsHeadlines, geminiResult] = await Promise.allSettled([
      scrapeGoogleNews(query),
      searchAndSummarize(query),
    ]);

    if (newsHeadlines.status === "fulfilled") {
      headlines = newsHeadlines.value;
    }
    if (geminiResult.status === "fulfilled") {
      aiResult = geminiResult.value;
    }

    // Step 3: Build output
    if (aiResult && aiResult.text) {
      let output = aiResult.text;

      // Tambahkan sumber grounding dari Gemini kalau ada
      if (aiResult.sources && aiResult.sources.length > 0) {
        output += "\n\n📎 Sumber Pencarian:\n";
        aiResult.sources.forEach((src, i) => {
          output += `${i + 1}. ${src}\n`;
        });
      }

      // Tambahkan headline dari Google News RSS kalau ada
      if (headlines.length > 0) {
        output += "\n📰 Headline Terkini:\n";
        headlines.forEach((h, i) => {
          const src = h.source ? ` (${h.source})` : "";
          output += `${i + 1}. ${h.title}${src}\n`;
        });
      }

      await m.reply(claraWrap("Berita AI", output));
      await m.react("🐣");
      return;
    }

    // Fallback: kalau Gemini search grounding gagal, tampilkan headline mentah
    if (headlines.length > 0) {
      let output = `Berita terkini untuk "${query}":\n\n`;
      headlines.forEach((h, i) => {
        const src = h.source ? ` (${h.source})` : "";
        const time = h.time ? ` - ${h.time}` : "";
        output += `${i + 1}. ${h.title}${src}${time}\n`;
        if (h.link) output += `   ${h.link}\n`;
        output += "\n";
      });
      output += "\n(AI summarizer sedang tidak tersedia, menampilkan headline mentah)";
      await m.reply(claraWrap("Berita AI", output));
      await m.react("🐣");
      return;
    }

    // Total gagal
    await m.reply(claraWrap("Berita AI", `Tidak ada berita ditemukan untuk "${query}". Coba topik lain.`));
  } catch (err) {
    console.log("[Berita] Error:", err.message);
    await m.reply(claraWrap("Berita AI", `Terjadi error: ${err.message?.slice(0, 100) || "Unknown error"}`));
  }
}

export default { config: pluginConfig, handler };
