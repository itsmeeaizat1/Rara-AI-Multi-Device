import { GoogleSearch } from "../../src/scraper/google.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import config from "../../config.js";

const pluginConfig = {
  name: "berita",
  alias: ["news", "beritaterkini", "infonews", "beritaviral"],
  category: "info",
  desc: "Cari & rangkum berita terkini dari internet tanpa clickbait",
  usage: ".berita <topik>",
  example: ".berita teknologi terbaru",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

// ─── AI prompt buat rangkum berita ───
function buildSummaryPrompt(query, headlines) {
  const hl = headlines
    .map((h, i) => `${i + 1}. ${h.title}${h.source ? ` (${h.source})` : ""}`)
    .join("\n");

  return `Kamu adalah jurnalis profesional. Berikut adalah headline berita terkini dari pencarian Google News untuk topik "${query}":

${hl}

Tugasmu: Rangkum berita-berita di atas menjadi format BERIKUT INI persis (jangan ubah format):

📰 RANGKUMAN BERITA: ${query}

[Tulis 3-5 poin berita terpenting, tiap poin maksimal 2-3 kalimat. Jangan clickbait, sajikan faktanya saja. Gunakan bahasa Indonesia yang jelas dan padat.]

📎 SUMBER UTAMA
[Sebutkan 2-3 sumber berita terkredit yang relevan dari daftar di atas]

⚠️ CATATAN
[Tulis 1 kalimat: "Informasi dirangkum dari hasil pencarian Google News pada [tanggal hari ini]. Akurasi dapat berbeda dengan perkembangan terbaru."]

Aturan:
1. Hanya rangkum dari headline yang diberikan, JANGAN mengarang
2. Jika headline kurang dari 3, tetap rangkum yang ada
3. Jangan gunakan markdown formatting (tidak **bold**, tidak ## heading)
4. Gunakan nomor (1. 2. 3.) untuk poin berita`;
}

// ─── Gemini AI call (pakai APIkey.google) ───
async function summarizeWithAI(query, headlines) {
  const googleKey = config.APIkey?.google || "";
  if (!googleKey) {
    // Fallback: pakai callAI dengan provider default
    return await callAI({
      providerKey: "openai",
      messages: buildSummaryPrompt(query, headlines),
      apiKey: config.aiHelp?.apiKey || "",
      apiEndpoint: config.aiHelp?.apiEndpoint || "https://ai.tioo.eu.org/v1/chat/completions",
      model: config.aiHelp?.model || "deepseek-v4-flash:free",
      temperature: 0.3,
      maxTokens: 1200,
    });
  }

  // Pakai Gemini langsung
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleKey}`;
  const prompt = buildSummaryPrompt(query, headlines);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1200 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("AI mengembalikan respon kosong");
  return text.trim();
}

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const query = m.text?.trim();

  if (!query) {
    const text = claraWrap("Berita AI", [
      `Mencari dan merangkum berita terkini tanpa clickbait.`,
      ``,
      `Penggunaan: *${prefix}berita <topik>*`,
      ``,
      `Contoh:`,
      `*${prefix}berita teknologi terbaru*`,
      `*${prefix}berita gempa hari ini*`,
      `*${prefix}berita piala dunia*`,
    ].join("\n"));
    await sendReplyWithNav(sock, m, text, "berita");
    return;
  }

  await m.react("🕐");

  try {
    // Step 1: Scrape Google News
    const searchResult = await GoogleSearch(query);

    if (!searchResult.status || !searchResult.results || searchResult.results.length === 0) {
      // Fallback: langsung pakai AI tanpa headline
      await m.reply(claraWrap("Berita AI", `Tidak ada headline ditemukan dari Google News untuk "${query}". Mencoba analisis AI langsung...`));

      try {
        const fallbackPrompt = `Berikan ringkasan berita terkini tentang "${query}" dalam bahasa Indonesia. Sajikan 3-5 poin penting dengan format nomor. Jangan clickbait, berdasarkan pengetahuanmu. Tambahkan catatan bahwa ini berdasarkan pengetahuan AI, bukan real-time search.`;
        const googleKey = config.APIkey?.google || "";

        if (googleKey) {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleKey}`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: fallbackPrompt }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 1200 },
            }),
          });
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            await m.reply(claraWrap("Berita AI", text.trim()));
            await m.react("✅");
            return;
          }
        }

        await m.reply(claraWrap("Berita AI", `Tidak ada hasil berita untuk "${query}". Coba topik lain.`));
        return;
      } catch (e2) {
        await m.reply(claraWrap("Berita AI", `Gagal mencari berita untuk "${query}". Coba lagi nanti.`));
        return;
      }
    }

    // Ambil 8 headline pertama
    const headlines = searchResult.results.slice(0, 8).map((r) => ({
      title: r.resource_title || r.title || "Tanpa judul",
      source: r.origin_node || r.source || "",
      link: r.resolved_endpoint || r.link || "",
    }));

    // Step 2: Kirim notifikasi proses
    await m.reply(claraWrap("Berita AI", `Ditemukan ${headlines.length} headline untuk "${query}". Sedang merangkum dengan AI...`));

    // Step 3: AI summarize
    const summary = await summarizeWithAI(query, headlines);

    // Step 4: Kirim hasil
    await m.reply(claraWrap("Berita AI", summary));
    await m.react("✅");
  } catch (err) {
    console.log("[Berita] Error:", err.message);

    // Last resort: tampilkan headline mentah
    if (searchResult?.results?.length > 0) {
      const items = searchResult.results.slice(0, 5).map((n, i) =>
        `${i + 1}. ${n.resource_title || n.title || "Tanpa judul"}\n   ${n.origin_node || ""} - ${n.resolved_endpoint || ""}`
      ).join("\n\n");
      await m.reply(claraWrap("Berita AI", `AI summarizer gagal, tapi ini headline mentah:\n\n${items}`));
    } else {
      await m.reply(claraWrap("Berita AI", `Terjadi error: ${err.message?.slice(0, 100) || "Unknown error"}`));
    }
  }
}

export default { config: pluginConfig, handler };
