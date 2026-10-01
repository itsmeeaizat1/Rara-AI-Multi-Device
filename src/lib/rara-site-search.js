// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 SITE SEARCH ENGINE BERSAMA — dipakai DUA agent:
//   • .raraagent  (src/lib/aiagent.js — TOOLS.searchsite)
//   • .aisuperagent (plugins/ai-agent/agent.js — deteksi lokal + tool planner)
// 🔹 Request owner 14 Sep 2026: "cba tes klo disuruh cari kayak carikan
// aplikasi whatsapp di apkmiror" — tes live nunjukin planner milih tool
// download (403, salah total) karena gak ada tool buka situs sembarang.
// Fix: chromium beneran buka web-nya (rara-web-browser.js — DuckDuckGo
// site: search + buka halaman hasil utama), hasil = kartu plain text +
// NARASI ALIVE (AI ngjelasin apa yang dia temuin kayak ngomong — pola
// sama kayak rara-yt-search.js).
// ============================================================

// ── seam dep buat e2e offline (siteSearch / pageFacts / aiChat) ──
const __siteDeps = {};
export function _setSiteSearchDepsForTest(d) { Object.assign(__siteDeps, d); }
export function _resetSiteSearchDepsForTest() { for (const k of Object.keys(__siteDeps)) delete __siteDeps[k]; }

// 🔹 DETEKSI INTENT — "carikan aplikasi whatsapp di apkmirror" →
// { site: "apkmirror", query: "aplikasi whatsapp" }. t = teks ternormalisasi,
// original = teks asli. Return null kalau bukan request cari di situs.
// CATATAN: deteksi YOUTUBE jalan duluan di caller (biar gak rebutan).
// alias situs tanpa .com → domain bener (apkmiror = typo owner, ikutin)
const SITE_ALIAS = {
  apkmirror: "apkmirror.com",
  apkmiror: "apkmirror.com",
  apkpure: "apkpure.com",
  aptoide: "aptoide.com",
  playstore: "play.google.com",
  playstoreofficial: "play.google.com",
  gplay: "play.google.com",
  shopee: "shopee.co.id",
  tokopedia: "tokopedia.com",
  lazada: "lazada.co.id",
  bukalapak: "bukalapak.com",
};

export function detectSiteSearchIntent(t, original) {
  t = String(t || "").toLowerCase();
  original = String(original || t);
  if (!/\b(carikan|cairkan|carikn|cariin|cari|crikin|search|nyari(kan)?|lihat(kan|in)?|cek(kan|in)?|buka(kan|in)?)\b/.test(t)) return null;
  // situs: domain bener ATAU alias dikenal (bukan youtube — jalur sendiri)
  const m = t.match(/\bdi\s+((?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)+(?:\/\S*)?)\b/i)
    || t.match(new RegExp("\\bdi\\s+(" + Object.keys(SITE_ALIAS).join("|") + ")\\b", "i"));
  if (!m) return null;
  let site = m[1].toLowerCase().replace(/^www\./, "").replace(/\/.*$/, "");
  if (/youtube|youtu\.be/.test(site)) return null;
  const rawToken = m[1].toLowerCase(); // "apkmiror" / "www.tokopedia.com"
  if (SITE_ALIAS[site]) site = SITE_ALIAS[site];
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(site)) return null; // wajib domain valid
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // pola pembersih: DOMAIN FULL duluan (biar titiknya ikut kebawa),
  // baru rawToken user (typo "apkmiror"), baru potongan domain
  const parts = [site, rawToken, ...site.split(/[.\/]/)]
    .map((x) => x.replace(/^www\./, "")).filter(Boolean).map(esc);
  const query = original
    .replace(/www\./gi, " ")
    .replace(/\b(tolong|please|dong|ya|yah|deh|sih|min|coba|kak|bang|bantu)\b/gi, " ")
    .replace(/\b(carikan|cairkan|carikn|cariin|cari|crikin|search|nyarikan|nyari|lihatkan|lihatin|lihat|cekkan|cekin|cek|bukakan|bukain|buka|aplikasi|apk|di)\b/gi, " ")
    .replace(new RegExp("\\b(" + [...new Set(parts)].join("|") + ")\\b", "gi"), " ")
    .replace(/\s*\.\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!query) return null;
  return { site, query };
}

// 🔹 NARASI ALIVE — AI ngjelasin hasil pencarian situs kayak ngomong
// (pola sama narrateSearchResult di rara-yt-search.js — semua fakta
// WAJIB dari data browser, gak boleh ngarang). Gagal → skip senyap.
async function narrateSiteResult(sock, m, { site, query, results, facts, deps }) {
  const D = deps;
  try {
    const chat = D.aiChat || (await import("./rara-ai-fallback.js")).aiChainChat;
    const prompt = [
      "SYSTEM: Kamu Rara — asisten WhatsApp bot yang baru selesai nyariin sesuatu di situs " + site + " buat user. User nyari: '" + query + "'. Hasil pencariannya udah dikirim ke user (kartu plain text + link). Sekarang JELASIN hasil pencariannya ke user dengan bahasa NGOMONG natural kaya lagi cerita ke teman — hidup, santai, bahasa gaul Indonesia.",
      "",
      // DATA RINGKAS — halaman utama + judul/link hasil lain.
      // GOTCHA (ketemu live 14 Sep): facts.text 1600 char + JSON
      // stringify penuh → prompt >8KB → AI provider GET 414
      // Request-URI Too Large. Narasi cukup intinya.
      "DATA HASIL PENCARIAN + FAKTA HALAMAN ASLI (JANGAN NGARANG di luar data ini — semua fakta yang kamu sebut HARUS dari sini; halaman_utama = situs yang udah dibuka browser):",
      JSON.stringify({
        halaman_utama: {
          judul: results[0]?.title || facts?.title || "",
          link: results[0]?.url || "",
          deskripsi: results[0]?.snippet || facts?.description || "",
          isi_halaman: (facts?.text || "").slice(0, 700),
        },
        hasil_lain: results.slice(1, 4).map((r) => ({ judul: r.title, link: r.url })),
      }),
      "",
      "ATURAN:",
      "- 2-4 kalimat, maksimal 450 karakter.",
      "- Sebutin data kunci (nama aplikasi/halaman, versi/detail dari fakta) secara natural — BUKAN daftar kaku.",
      "- Bahasa ngomong santai kaya orang — JANGAN markdown, JANGAN link, JANGAN bullet, JANGAN awali dengan 'Oke' atau 'Nah'.",
      "- Tutup dengan ajakan natural singkat (misal: mau link-nya dibuka lagi / mau cari yang lain).",
      "- LANGSUNG isi jawaban tanpa pembuka 'Jawaban:' — murni narasimu.",
    ].join("\n");
    let out = String((await chat(prompt, { timeoutMs: 45000 })) || "").trim();
    out = out.replace(/^jawaban[:\s]*/i, "").trim();
    if (out && out.length > 10) {
      try { await sock.sendMessage(m.chat, { text: out }, { quoted: m }); } catch {}
    }
  } catch (e) {
    console.error("[sitesearch] narasi AI gagal (skip — kartu tetap lengkap):", e.message);
  }
}

// 🔹 CARI + KIRIM — browser beneran: cari dalam situs → kartu hasil +
// fakta halaman utama → narasi alive. Return { site, count }.
export async function searchSiteAndSend(sock, m, { site, query, deps = {} }) {
  const D = { ...__siteDeps, ...deps };
  const siteSearch = D.siteSearch
    || (await import("../scraper/rara-web-browser.js")).browserSiteSearch;
  const pageFacts = D.pageFacts
    || (await import("../scraper/rara-web-browser.js")).browserPageFacts;

  const results = await siteSearch(site, query, { limit: 5 });
  if (!results?.length) {
    throw new Error(
      "gak nemu hasil di " + site + " buat: " + query +
      " — coba kata kunci lain, atau cek nama situsnya (contoh: apkmirror)",
    );
  }

  // ── buka halaman hasil UTAMA — info lengkap (versi/spec/harga/dll
  // tergantung situs) diambil dari isi halaman ASLI ──
  let facts = null;
  // retry 2x — situs kadang lambat/CF challenge transient (request owner:
  // preview screenshot = inti "browsing live", jadi layak diperjuangin)
  for (let i = 0; i < 2 && !facts?.screenshot; i++) {
    try {
      facts = await pageFacts(results[0].url);
    } catch (e) { console.error("[sitesearch] buka halaman utama gagal (coba " + (i + 1) + "/2):", e.message); }
  }

  // ── KARTU plain text (request owner: hasil search = plain text
  // lengkap yang kebaca langsung, bukan preview yang harus diklik) ──
  const lines = [
    "🔎 *" + site + " — " + query + "*", "",
    "🔍 _dicari via: browser beneran (chromium)_", "",
    "🏆 *" + results[0].title + "*",
    "🔗 " + results[0].url,
  ];
  if (results[0].snippet) lines.push("📝 " + results[0].snippet);
  if (facts?.description) lines.push("📄 " + facts.description);
  if (facts?.text) lines.push("📃 " + facts.text.slice(0, 700) + (facts.text.length > 700 ? "…" : ""));
  if (results.length > 1) {
    lines.push("", "👀 Hasil lain yang mirip:");
    for (const r of results.slice(1, 4)) {
      lines.push("• " + r.title + " → " + r.url);
    }
  }
  const cardText = lines.filter(Boolean).join("\n");
  // 🔹 PREVIEW SCREENSHOT — gambaran web yang agent lihat (request owner
  // 14 Sep: "kyk youtube aja td gt kyk browsing live") — screenshot
  // halaman ASLI dikirim sebagai gambar + kartu jadi caption-nya; gak
  // ada screenshot (halaman gagal kebuka/gagal motret) → kartu teks doang.
  let sentPreview = false;
  if (facts?.screenshot) {
    try {
      await sock.sendMessage(m.chat, { image: facts.screenshot, caption: cardText }, { quoted: m });
      sentPreview = true;
    } catch { /* gagal kirim gambar → fallback teks */ }
  }
  if (!sentPreview) {
    try {
      await sock.sendMessage(m.chat, { text: cardText }, { quoted: m });
    } catch {
      await m.reply?.(cardText);
    }
  }

  // ── narasi alive — AI ngjelasin hasilnya kayak ngomong ──
  await narrateSiteResult(sock, m, { site, query, results, facts, deps: D });
  return { site, count: results.length };
}
