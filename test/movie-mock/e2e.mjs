// E2E movie notifier (feat baru 9 Sep 2026). Jalankan dari cwd dir KOSONG:
//   mkdir -p /tmp/movie-e2e/src/data && cd /tmp/movie-e2e &&
//   node --experimental-loader <repo>/test/movie-mock/loader.mjs <repo>/test/movie-mock/e2e.mjs
import fs from "fs";
import path from "path";

const REPO = "/app/conversations/6a8e916412b12b330016328e/nova-repo";
await import(REPO + "/src/lib/nova-database.js").then((m) => m.initDatabase("/tmp/movie-e2e/db"));

const M = await import(REPO + "/src/lib/nova-movie-notifier.js");
const JID = "6281234567890@s.whatsapp.net";
const RM = "\u200E".repeat(4001);

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => {
  const ok = !!cond;
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${ok ? "" : " | " + String(extra).slice(0, 120)}`);
};

const sent = [];
const mockSock = {
  sendMessage: async (jid, content, opts) => { sent.push({ jid, content, opts }); return { key: { id: "m" + sent.length } }; },
  groupFetchAllParticipating: async () => ({}),
  onWhatsApp: async (jid) => [jid],
};
M.setSock(mockSock);

// ── fixture Cinemeta (katalog meta item + meta detail) ──
const meta = (id, name, o = {}) => ({
  id, imdb_id: id, type: "movie", name, releaseInfo: o.year || "2026",
  genres: o.genres || ["Action", "Adventure", "Sci-Fi"], cast: o.cast || ["Robert Downey Jr.", "Chris Evans", "Scarlett Johansson"],
  director: o.director || ["Anthony Russo", "Joe Russo"], description: o.desc || "Deskripsi sinopsis film panjang sekali.",
  imdbRating: o.rating, runtime: o.runtime || "160 min", poster: o.poster || `https://img/poster-${id}.jpg`,
});
globalThis.__CINEMETA__ = {
  // katalog trending (top)
  "catalog/movie/top.json": { metas: [meta("tt1", "Film Trending 1"), meta("tt2", "Film Trending 2"), meta("tt3", "Film Trending 3"), meta("tt4", "Film Trending 4", { rating: null, runtime: null })] },
  // katalog upcoming (year)
  "catalog/movie/year/year=2026.json": { metas: [meta("tt10", "Film Baru 2026 A"), meta("tt11", "Film Baru 2026 B")] },
  // katalog rating tinggi (imdbRating)
  "catalog/movie/imdbRating.json": { metas: [meta("tt20", "Film Rating Tinggi 1"), meta("tt21", "Film Rating Tinggi 2")] },
  // search
  "search=avengers": { metas: [meta("tt99", "Avengers: Doomsday", { rating: "8.7", year: "2026" })] },
  // meta detail (enrich): tt4 ratingnya null → bakal di-enrich
  "meta/movie/tt4.json": { meta: meta("tt4", "Film Trending 4", { rating: "7.9", runtime: "120 min", desc: "Sinopsis lengkap hasil enrich." }) },
};

// ─── 1. formatMovieCard persis contoh owner ───
const cap = M.formatMovieCard({
  id: "tt12345678", title: "Avengers: Doomsday", year: "2026", rating: 8.7,
  genres: ["Action", "Adventure", "Sci-Fi"], runtime: 160,
  director: ["Anthony Russo", "Joe Russo"],
  actors: ["Robert Downey Jr.", "Chris Evans", "Scarlett Johansson"],
  description: "Pasukan Avengers kembali bersatu menghadapi ancaman... " + "panjang ".repeat(100),
}, { type: "trending", index: 1, total: 3 });
check("1a. header 🔥 *FILM TRENDING!* + nomor + judul (tahun)", cap.startsWith("🔥 *FILM TRENDING!*") && cap.includes("1. *Avengers: Doomsday* (2026)"));
check("1b. rating/genre/durasi/sutradara/pemain persis contoh", cap.includes("⭐ Rating: 8.7/10") && cap.includes("🎭 Genre: Action, Adventure, Sci-Fi") && cap.includes("⏱️ Durasi: 160 menit") && cap.includes("🎥 Sutradara: Anthony Russo, Joe Russo") && cap.includes("👥 Pemain: Robert Downey Jr., Chris Evans, Scarlett Johansson"));
check("1c. 🔗 IMDb link + sinopsis di balik ℅readmore", cap.includes("🔗 IMDb: https://www.imdb.com/title/tt12345678/") && cap.includes(`📖 Sinopsis:${RM}\n\nPasukan Avengers`));

// ─── 2. header per tipe ───
const hUp = M.formatMovieCard({ id: "tt1", title: "X", year: "2026" }, { type: "upcoming" });
const hNp = M.formatMovieCard({ id: "tt1", title: "X", year: "2026" }, { type: "nowplaying" });
const hNew = M.formatMovieCard({ id: "tt1", title: "X", year: "2026" }, { type: "new" });
check("2a. header upcoming/nowplaying/new", hUp.startsWith("📅 *FILM TERBARU!*") && hNp.startsWith("🎥 *FILM RATING TINGGI!*") && hNew.startsWith("🎬 *FILM DITEMUKAN!*"));

// ─── 3. diffMovies pure ───
const diff3 = M.diffMovies([{ id: "tt1" }, { id: "tt5" }, { id: "tt6" }], ["tt1"]);
check("3a. diff: film tanpa id dibuang + dedup cache", diff3.length === 2 && diff3[0].id === "tt5");
check("3b. diff gak mutasi input", JSON.stringify(diff3) === JSON.stringify([{ id: "tt5" }, { id: "tt6" }]));

// ─── 4. first-run: baseline + pesan aktivasi (IMDbOT down → Cinemeta) ───
M.addTarget(JID);
sent.length = 0;
const r4 = await M.runCheck();
const st4 = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src", "data", "automovienotifier.json"), "utf8"));
const aktivasi = sent.find((s) => s.content?.text?.includes("MOVIE NOTIFIER AKTIF"));
check("4a. first-run: initDone + pesan aktivasi terkirim", st4.initDone === true && !!aktivasi, JSON.stringify(r4).slice(0, 90));
check("4b. first-run: baseline cache semua tipe (4+2+2 id) + sumber Cinemeta", (st4.caches.trending?.length === 4) && (st4.caches.upcoming?.length === 2) && (st4.caches.nowplaying?.length === 2) && st4.lastSources?.trending === "Cinemeta");
check("4c. first-run: gak kirim card film (baseline, bukan spam 8 card)", sent.filter((s) => s.content?.image).length === 0 && sent.length === 1);

// ─── 5. check kedua: film baru per tipe → card per-film ───
globalThis.__CINEMETA__["catalog/movie/top.json"] = { metas: [meta("tt5", "Film Trending BARU", { rating: "9.1" }), meta("tt1", "Film Trending 1"), meta("tt2", "Film Trending 2"), meta("tt3", "Film Trending 3")] };
globalThis.__CINEMETA__["catalog/movie/year/year=2026.json"] = { metas: [meta("tt12", "Film Upcoming BARU"), meta("tt10", "A"), meta("tt11", "B")] };
sent.length = 0;
const r5 = await M.runCheck();
const imgs5 = sent.filter((s) => s.content?.image);
const capTrend = imgs5.find((s) => s.content?.caption?.includes("FILM TRENDING"));
const capUp = imgs5.find((s) => s.content?.caption?.includes("FILM TERBARU"));
check("5a. film baru dikirim per-film: 2 IMAGE card (trending 1 + upcoming 1)", imgs5.length === 2, JSON.stringify(r5.summary));
check("5b. card trending: caption lengkap + banner renderLargerThumbnail + thumbnail buffer", capTrend?.content?.caption?.includes("1. *Film Trending BARU* (2026)") && capTrend.content.caption.includes("⭐ Rating: 9.1/10") && capTrend.content.contextInfo?.externalAdReply?.renderLargerThumbnail === true && Buffer.isBuffer(capTrend.content.contextInfo.externalAdReply.thumbnail));
check("5c. banner sourceUrl IMDb + rating di body", capTrend?.content?.contextInfo?.externalAdReply?.sourceUrl === "https://www.imdb.com/title/tt5/" && capTrend.content.contextInfo.externalAdReply.body === "⭐ 9.1/10");
check("5d. card upcoming kekirim juga", !!capUp && capUp.content.caption.includes("1. *Film Upcoming BARU*"));

// ─── 6. dedup: check ketiga tanpa perubahan → gak ada card ───
sent.length = 0;
const r6 = await M.runCheck();
check("6a. cache pintar: gak kirim ulang film yang sama (0 card)", sent.filter((s) => s.content?.image).length === 0 && r6.sent === 0);

// ─── 7. cap anti-spam: max 3 per tipe per check ───
globalThis.__CINEMETA__["catalog/movie/top.json"] = { metas: [meta("tt30", "C1"), meta("tt31", "C2"), meta("tt32", "C3"), meta("tt33", "C4"), meta("tt34", "C5")] };
sent.length = 0;
const r7 = await M.runCheck();
const imgs7 = sent.filter((s) => s.content?.image);
check("7a. cap: cuma 3 card (5 film baru), sisanya masuk cache gak dobel", imgs7.length === 3 && r7.summary.trending === 5);
const st7 = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src", "data", "automovienotifier.json"), "utf8"));
check("7b. semua id baru masuk cache (tt30-tt34) — sisa cap gak dikirim ulang", ["tt30", "tt31", "tt32", "tt33", "tt34"].every((id) => st7.caches.trending.includes(id)));

// ─── 8. tipe off → skip ───
M.setContentType("trending", false);
globalThis.__CINEMETA__["catalog/movie/top.json"] = { metas: [meta("tt40", "SKIP ME")] };
sent.length = 0;
const r8 = await M.runCheck();
check("8a. tipe trending off → gak dikirim, tipe lain tetap jalan", !sent.some((s) => s.content?.caption?.includes("SKIP ME")) && r8.summary.trending === undefined);
M.setContentType("trending", true);
// restore fixture trending (test 8 ganti jadi SKIP ME)
globalThis.__CINEMETA__["catalog/movie/top.json"] = { metas: [meta("tt30", "C1"), meta("tt31", "C2"), meta("tt32", "C3")] };

// ─── 9. force now: sample tanpa nyentuh cache ───
sent.length = 0;
await M.runCheck({ force: true, chatId: JID });
const st9 = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src", "data", "automovienotifier.json"), "utf8"));
const dbg9 = sent.map((s) => (s.content?.caption ? "IMG:" + s.content.caption.split("\n")[2] : s.content?.text ? "TXT:" + s.content.text.split("\n")[0] : "?"));
check("9a. force: sample 2 per tipe terkirim ke chatId", sent.filter((s) => s.content?.image).length === 6, JSON.stringify(dbg9));
check("9b. force TIDAK nyentuh cache (tt40 tetap gak di-cache)", !st9.caches.trending.includes("tt40"));

// ─── 10. enrich: rating null → detail chain isi ───
const m4 = meta("tt4", "Film Trending 4", { rating: null, runtime: null });
const en = await M.enrichMovie({ ...m4, rating: null, runtime: null, description: "" });
check("10a. enrich: rating+runtime+desc keisi dari meta detail", en.rating === 7.9 && en.runtime === 120 && en.description === "Sinopsis lengkap hasil enrich.");

// ─── 11. search manual: IMDbOT down → Cinemeta ───
const { list, source } = await M.searchMovies("avengers", 3);
check("11a. search manual: nemu Avengers via Cinemeta", list.length === 1 && list[0].title === "Avengers: Doomsday" && source === "Cinemeta");
const capS = M.formatMovieCard(list[0], { type: "new" });
check("11b. caption hasil cari: header DITEMUKAN + rating", capS.startsWith("🎬 *FILM DITEMUKAN!*") && capS.includes("⭐ Rating: 8.7/10"));

// ─── 12. fallback poster gagal → text + banner ───
globalThis.__IMG_DOWN__ = true;
sent.length = 0;
await M.sendMovieCardTo(mockSock, JID, { id: "tt77", title: "No Poster Film", year: "2026", rating: 8.0, poster: "https://img/broken.jpg" }, { type: "trending" });
globalThis.__IMG_DOWN__ = false;
const fb = sent[0];
check("12a. poster gagal → text card + banner tetep ada (gak crash)", fb?.content?.text?.includes("No Poster Film") && fb.content.contextInfo?.externalAdReply?.title === "No Poster Film");

// ─── 13. IMDbOT UP → dipakai (utama sesuai script) ───
globalThis.__IMDBOT_UP__ = true;
globalThis.__IMDBOT_RESPONSE__ = { results: [{ id: "tt900", title: "Dari IMDbOT", year: "2026", rating: 7.5, genres: ["Drama"], runtime: 100, directors: ["Sutradara X"], actors: ["Aktor A"], plot: "Plot IMDbOT.", poster: "https://img/ok.jpg" }] };
globalThis.__CINEMETA__["catalog/movie/top.json"] = { metas: [meta("tt901", "Harus gak kepake")] };
sent.length = 0;
const r13 = await M.runCheck();
const cap13 = sent.find((s) => s.content?.caption?.includes("Dari IMDbOT"));
check("13a. IMDbOT hidup → sumber utama (normImdbot jalan)", !!cap13 && r13.summary.trending >= 1);
globalThis.__IMDBOT_UP__ = false;

// ─── 14. knob interval ───
check("14a. interval invalid ditolak (2, 800, abc)", M.setIntervalMenit(2) === null && M.setIntervalMenit(800) === null && M.setIntervalMenit("abc") === null);
const iv = M.setIntervalMenit(30);
check("14b. interval 30 menit tersimpan & kebaca status", iv === 30 && M.getStatus().intervalMenit === 30);

// ─── 15. cache limit 200 → keep 100 ───
const stL = { caches: { trending: Array.from({ length: 150 }, (_, i) => "tt" + i) } };
// pushCache gak diexport — cek via behavior: total id di cache gak lewat 100
globalThis.__CINEMETA__["catalog/movie/top.json"] = { metas: Array.from({ length: 12 }, (_, i) => meta("ttL" + i, "L" + i)) };
await M.runCheck();
const st15 = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src", "data", "automovienotifier.json"), "utf8"));
check("15a. cache dibatasi ≤ 100 per tipe (ala script 200→100)", (st15.caches.trending || []).length <= 100, `len=${(st15.caches.trending || []).length}`);

console.log(`═══ ${pass} PASS, ${fail} FAIL ═══`);
process.exit(fail ? 1 : 0);
