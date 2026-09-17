// E2E FIX .novaagent GAK BISA CARI INFO TERKINI (12 Sep 2026, owner report):
// ".novaagent sebutkan berita mbg yang keracunan lagi viral" dijawab dari
// halusinasi training data lama (padahal .novaagent BY-DESIGN gak browsing,
// beda dari .aisuperagent). FIX: heuristik needsWebSearch() + quickWebSearch()
// dititip ke prompt think() SEBELUM AI jawab — hasil browsing asli + boleh
// cite link sumber. Semua HTTP di-inject (offline).
import { initDatabase } from "../../src/lib/nova-database.js";
import { setWebSearchHttp, setPreviewHttp, resetWebSearchDeps, searchWeb } from "../../src/lib/nova-websearch.js";
import { needsWebSearch, quickWebSearch, buildThinkSystemPrompt, sanitizeAiReply, _setBrowserSearchForTest } from "../../src/lib/aiagent.js";

// FIX 17 Sep: fallback chromium WAJIB di-disable default di e2e — kalau
// gak, quickWebSearch bakal launch browser beneran (flaky + lambat).
_setBrowserSearchForTest(null);


await initDatabase("/tmp/novaagent-websearch-e2e-db.json");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra) => { w((ok ? "✅ " : "❌ ") + name + (ok ? "" : extra ? " — " + extra : "")); ok ? pass++ : fail++; };

// ═══ 1. needsWebSearch heuristik ═══
w("\n— needsWebSearch —");
t("1a. 'berita mbg yang keracunan lagi viral' → true", needsWebSearch("sebutkan berita mbg yang keracunan lagi viral"));
t("1b. 'kabar terbaru gempa' → true", needsWebSearch("kabar terbaru gempa hari ini"));
t("1c. 'apa itu nodejs' → false (pengetahuan umum, gak perlu search)", !needsWebSearch("apa itu nodejs"));
t("1d. 'tutup grup' → false", !needsWebSearch("tutup grup"));
t("1e. 'kasus viral minggu ini apa' → true", needsWebSearch("kasus viral minggu ini apa"));
t("1f. 'jam berapa sekarang' → false (bukan pola berita)", !needsWebSearch("jam berapa sekarang"));

// ═══ 2. quickWebSearch — search sukses + baca 2 halaman ═══
w("\n— quickWebSearch —");
const BING_HTML = `<!DOCTYPE html><html><body>
<li class="b_algo"><h2><a href="https://www.cnnindonesia.com/nasional/mbg-keracunan">MBG Keracunan: Ratusan Siswa Dilarikan ke RS</a></h2>
<div class="b_caption"><p>Program Makan Bergizi Gratis (MBG) di beberapa daerah dilaporkan menyebabkan keracunan massal.</p></div></li>
<li class="b_algo"><h2><a href="https://www.detik.com/mbg-viral">Viral Kasus MBG Keracunan, Kemenkes Turun Tangan</a></h2>
<div class="b_caption"><p>Kasus keracunan program MBG jadi viral di media sosial.</p></div></li>
</body></html>`;
const PAGE1 = `<html><head><title>MBG Keracunan: Ratusan Siswa Dilarikan ke RS</title>
<meta property="og:description" content="Ratusan siswa mengalami keracunan usai konsumsi menu MBG."></head>
<body><p>Program Makan Bergizi Gratis (MBG) di sejumlah sekolah menyebabkan ratusan siswa keracunan makanan dan dilarikan ke rumah sakit.</p></body></html>`;
const PAGE2 = `<html><head><title>Viral Kasus MBG Keracunan</title></head>
<body><p>Kasus keracunan program Makan Bergizi Gratis viral di media sosial, Kemenkes langsung investigasi.</p></body></html>`;

setWebSearchHttp(async (url) => {
  if (String(url).includes("bing.com")) return BING_HTML;
  return "<html><body>kosong</body></html>";
});
setPreviewHttp(async (url) => {
  if (url.includes("cnnindonesia")) return PAGE1;
  if (url.includes("detik")) return PAGE2;
  return "<html><body></body></html>";
});

const found = await quickWebSearch("berita mbg keracunan viral");
t("2a. quickWebSearch return block + sources", !!found && found.sources.length === 2, JSON.stringify(found?.sources?.map((s) => s.url)));
t("2b. block isi konten ASLI (makan bergizi gratis, bukan metanol)", /makan bergizi gratis/i.test(found.block) && !/metanol/i.test(found.block), found.block.slice(0, 150));
t("2c. block ada URL sumber asli", found.block.includes("cnnindonesia.com") && found.block.includes("detik.com"));
resetWebSearchDeps();

// search gagal total → null (graceful, gak throw)
setWebSearchHttp(async () => { throw new Error("network down"); });
const failed = await quickWebSearch("berita apapun");
t("2d. search gagal total → null (gak crash)", failed === null);

// hasil sampah gak nyambung (ketemu pas smoke live 12 Sep: query berita MBG
// balik profil LinkedIn) → kena filter relevansi, sumber nyambung tetap masuk
setWebSearchHttp(async () => {
  return `<!DOCTYPE html><html><body>
<li class="b_algo"><h2><a href="https://it.linkedin.com/in/pia-pafundi">Pia Clara Pafundi - Vertex Pharmaceuticals | LinkedIn</a></h2>
<div class="b_caption"><p>Vai al contenuto principale Accedi per visualizzare il profilo completo.</p></div></li>
<li class="b_algo"><h2><a href="https://www.detik.com/mbg-keracunan">Keracunan MBG: Ratusan Siswa Keracunan Makan Bergizi Gratis</a></h2>
<div class="b_caption"><p>Program MBG keracunan massal, siswa dilarikan ke RS.</p></div></li>
</body></html>`;
});
setPreviewHttp(async (url) => String(url).includes("detik.com")
  ? "<html><head><title>Keracunan MBG: Ratusan Siswa Keracunan Makan Bergizi Gratis</title></head><body><p>Program Makan Bergizi Gratis (MBG) menyebabkan ratusan siswa keracunan.</p></body></html>"
  : "<html><body>profil lengkap pia clara pafundi vertex pharmaceuticals</body></html>");
const filtered = await quickWebSearch("berita mbg makan bergizi gratis keracunan terbaru");
t("2e. hasil sampah (LinkedIn gak nyambung) dibuang filter relevansi, sumber nyambung tetap", !!filtered && filtered.sources.length === 1 && filtered.sources[0].url.includes("detik.com"), JSON.stringify(filtered?.sources?.map((s) => s.url)));

// SEMUA hasil sampah → null (jangan pernah kasih konteks menyesatkan ke AI)
setWebSearchHttp(async () => {
  return `<!DOCTYPE html><html><body>
<li class="b_algo"><h2><a href="https://it.linkedin.com/in/pia-pafundi">Pia Clara Pafundi - Vertex Pharmaceuticals | LinkedIn</a></h2>
<div class="b_caption"><p>Vai al contenuto principale.</p></div></li>
</body></html>`;
});
setPreviewHttp(async () => "<html><body>random halaman</body></html>");
const allGarbage = await quickWebSearch("berita mbg makan bergizi gratis keracunan terbaru");
t("2f. SEMUA hasil sampah → null (gak ada konteks menyesatkan)", allGarbage === null);
resetWebSearchDeps();

// NEW 17 Sep (owner report "carikan berita makanan mbg beracun" dijawab
// "saya tidak tahu"): engine scrape gagal/sampah → FALLBACK CHROMIUM nyelametin
setWebSearchHttp(async () => { throw new Error("network down"); });
setPreviewHttp(async (url) => String(url).includes("kompas.com")
  ? "<html><head><title>Kasus Keracunan MBG di Berbagai Daerah Terus Berulang</title></head><body><p>Keracunan MBG berulang di berbagai daerah, pemerintah cari siasat.</p></body></html>"
  : "<html><body></body></html>");
_setBrowserSearchForTest(async (q, { limit }) => [
  { title: "Kasus Keracunan MBG di Berbagai Daerah Terus Berulang", url: "https://www.kompas.com/mbg-keracunan", snippet: "Keracunan MBG berulang" },
  { title: "Siasat Pemerintah Terkait MBG", url: "https://health.detik.com/mbg-siasat", snippet: "Siasat pemerintah soal keracunan MBG" },
].slice(0, limit));
const chromeSaved = await quickWebSearch("berita makanan mbg beracun");
t("2g. engine scrape mati → FALLBACK CHROMIUM balikin hasil asli (bukan null)", !!chromeSaved && chromeSaved.sources.length >= 1, JSON.stringify(chromeSaved?.sources?.map((s) => s.url)));
t("2h. blok fallback isi konten berita nyata", !!chromeSaved && /keracunan mbg/i.test(chromeSaved.block));
_setBrowserSearchForTest(null); // balik ke disabled
resetWebSearchDeps();

// ═══ 3. buildThinkSystemPrompt() — webSearch context nyambung ke prompt ═══
w("\n— buildThinkSystemPrompt() dgn ctx.webSearch —");
const promptWithSearch = buildThinkSystemPrompt({ botname: "Nova AI", webSearch: found.block });
const countMarker = (s) => (s.match(/HASIL PENCARIAN WEB TERKINI/g) || []).length;
t("3a. blok webSearch ACTUALLY ke-injek (marker muncul 2x: aturan + blok isi) + konten asli, bukan halusinasi metanol", countMarker(promptWithSearch) === 2 && /makan bergizi gratis/i.test(promptWithSearch) && !/metanol/i.test(promptWithSearch));
t("3b. prompt bawa URL sumber ASLI dari hasil search", promptWithSearch.includes("cnnindonesia.com") && promptWithSearch.includes("detik.com"));
t("3c. prompt izinkan cite [S1]/[S2] KHUSUS kalau blok webSearch ada", /BOLEH cantumkan link sumber \[S1\]\/\[S2\]/.test(promptWithSearch));

// simulasi reply AI yang PAKAI konteks ini — pastikan sanitizeAiReply gak mutilasi link asli
const simulatedReply = "Kasus MBG (Makan Bergizi Gratis) yang viral itu soal ratusan siswa keracunan makanan program MBG di sekolah, bukan metanol. Kemenkes udah turun tangan investigasi.\n📎 Sumber: https://www.cnnindonesia.com/nasional/mbg-keracunan";
t("3d. sanitizeAiReply gak mutilasi link sumber asli (bukan domain halusinasi)", sanitizeAiReply(simulatedReply).includes("cnnindonesia.com") && /makan bergizi gratis/i.test(sanitizeAiReply(simulatedReply)));

// tanpa ctx.webSearch → prompt TETAP larang URL (regresi aturan lama, no webSearch = no exception)
const promptNoSearch = buildThinkSystemPrompt({ botname: "Nova AI" });
t("3e. tanpa webSearch → blok isi TIDAK di-injek (marker cuma 1x dari teks aturan) + aturan larang URL tetap ada", countMarker(promptNoSearch) === 1 && promptNoSearch.includes("JANGAN tulis URL apa pun"));

// ctx.memory tetap jalan bareng webSearch (regresi fitur memory 12 Sep 2026)
const promptBoth = buildThinkSystemPrompt({ botname: "Nova AI", memory: "- suka kucing", webSearch: found.block });
t("3f. memory + webSearch bisa nempel bareng tanpa saling ganggu", promptBoth.includes("MEMORI TENTANG USER") && promptBoth.includes("suka kucing") && promptBoth.includes("HASIL PENCARIAN WEB TERKINI"));
// ═══ 4. RELEVANSI GUARD searchWeb (bug owner 12 Sep: ".agent disuruh siapa
// prabowo malah tdk ditemukan" — Bing nyariin kata tandanya doang → SERP
// sampah → agent baca halaman nyasar) — via seam setWebSearchHttp ═══
w("\n— relevansi guard searchWeb —");
{
  const _rs2 = resetWebSearchDeps;
  const mkBing = (items) => "<html><body>" + items.map((it) =>
    `<li class="b_algo"><h2><a href="https://id.wikipedia.org/wiki/${encodeURIComponent(it.u)}">${it.t}</a></h2><div class="b_caption"><p>${it.s || ""}</p></div></li>`).join("") + "</body></html>";
  const JUNK = [{ t: "Siapa Gdl | Guadalajara - Facebook", u: "fb-gdl", s: "Acércate al SIAPA esquema de descuentos" }, { t: "Bienvenido - SIAPA", u: "siapa", s: "Muse ¿Olvido su contraseña?" }];
  const GOOD = [{ t: "Prabowo Subianto - Wikipedia bahasa Indonesia", u: "Prabowo_Subianto", s: "Prabowo Subianto adalah presiden Indonesia ke-8" }];

  // 4a. semua engine sampah → hasil mentah terakhir + flag lowRelevance
  setWebSearchHttp(async () => mkBing(JUNK));
  let r = await searchWeb("siapa prabowo", { limit: 5 });
  t("4a. SERP sampah semua engine → lowRelevance: true (jangan dibaca agent)", r?.lowRelevance === true && r?.items?.length > 0, JSON.stringify(r || {}).slice(0, 100));

  // 4b. query penuh sampah → auto-retry tanpa kata tanya ("prabowo") → nemu
  let calls = [];
  setWebSearchHttp(async (url) => {
    calls.push(String(url));
    // panggilan utk query penuh ("siapa" ada di query) → sampah; core "prabowo" → bagus
    return decodeURIComponent(url).includes("siapa") ? mkBing(JUNK) : mkBing(GOOD);
  });
  r = await searchWeb("siapa prabowo", { limit: 5 });
  t("4b. retry core-query (siapa prabowo → prabowo) nemu hasil bener", r?.lowRelevance !== true && /prabowo/i.test(r?.items?.[0]?.title || "") && r?.usedCoreQuery === true, JSON.stringify(r || {}).slice(0, 120));
  t("4c. retry core-query beneran nembak query tanpa kata tanya", calls.some((u) => /prabowo(?!.*siapa)/i.test(decodeURIComponent(u))), calls[0]?.slice(0, 60));

  // 4d. SERP bagus langsung → gak ada flag, hasil utuh
  setWebSearchHttp(async () => mkBing(GOOD));
  r = await searchWeb("prabowo presiden", { limit: 5 });
  t("4d. SERP relevan → hasil normal tanpa flag", r?.lowRelevance !== true && r?.items?.length > 0 && !r?.usedCoreQuery);

  _rs2();
}

w(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
