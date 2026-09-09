// E2E anime notifier preview card (upgrade 9 Sep 2026, perpaduan script owner).
// Jalankan dari cwd DIR KOSONG: mkdir -p /tmp/anime-e2e/src/data && cd /tmp/anime-e2e &&
// node --experimental-loader <repo>/test/anime-card-mock/loader.mjs <repo>/test/anime-card-mock/e2e.mjs
// (cwd dir kosong biar STATE_FILE & db test gak nyampur repo)
import fs from "fs";
import path from "path";

const REPO = "/app/conversations/6a8e916412b12b330016328e/nova-repo";
// initDatabase wajib path eksplisit (gotcha lama: tanpa path → silent exit)
await import(REPO + "/src/lib/nova-database.js").then((m) => m.initDatabase("/tmp/anime-e2e/db"));

const N = await import(REPO + "/src/lib/nova-auto-anime-notifier.js");
const JID = "6281234567890@s.whatsapp.net";

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => {
  const ok = !!cond;
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${ok ? "" : " | " + String(extra).slice(0, 110)}`);
};

// ── socket mock: record sendMessage ──
const sent = [];
const mockSock = {
  sendMessage: async (jid, content, opts) => { sent.push({ jid, content, opts }); return { key: { id: "m" + sent.length } }; },
  groupFetchAllParticipating: async () => ({}),
  onWhatsApp: async (jid) => [jid],
};
N.setSock(mockSock);

// ── fixture builder ala respons AniList ──
const anime = (id, opts = {}) => ({
  id, title: { romaji: `Romaji ${id}`, english: opts.title || `Anime ${id}`, native: "ネイティブ" },
  episodes: opts.eps ?? 12, averageScore: opts.score ?? 80, status: opts.status || "RELEASING", format: opts.format || "TV",
  startDate: { year: 2026, month: 9, day: 10 },
  nextAiringEpisode: opts.nextEp ? { episode: opts.nextEp, timeUntilAiring: (opts.timeUntilH ?? 10) * 3600 } : null,
  genres: ["Action", "Fantasy", "Comedy", "Drama"],
  studios: { nodes: [{ name: "Studio A" }, { name: "Studio B" }] },
  coverImage: opts.noCover ? null : { extraLarge: `https://img.anilist/cover-${id}.jpg`, large: "", medium: "" },
  description: opts.desc ?? "Deskripsi <b>HTML</b> panjang tentang anime ini.",
  bannerImage: (opts.noCover && !opts.noBanner) ? `https://img.anilist/banner-${id}.jpg` : null,
  trailer: opts.noTrailer ? null : { id: "yt", site: "youtube", thumbnail: `https://img.yt/thumb-${id}.jpg` },
  externalLinks: [{ site: "MyAnimeList", url: `https://myanimelist.net/anime/${id}` }, { site: "AniList", url: `https://anilist.co/anime/${id}` }],
});

// ─── 1. formatNewAnimeCard: persis contoh owner (score mentah + readmore + footer) ───
const RM = "\u200E".repeat(4001);
const a1 = N.formatNewAnimeCard({
  id: "al-99", title: "Frieren S2", format: "TV", status: "RELEASING", startDate: "10/9/2026",
  score: 85, genres: ["Action", "Fantasy"], studios: "Madhouse",
  description: "<b>Deskripsi</b> panjang " + "isi ".repeat(200),
  nextEpisode: { episode: 5, timeUntil: 30 },
  malUrl: "https://myanimelist.net/anime/99", pageUrl: "https://anilist.co/anime/99",
}, { index: 1, total: 3, source: "AniList" });
check("1a. header ANIME BARU RILIS + nomor 1. *judul*", a1?.startsWith("🎌 ANIME BARU RILIS!") && a1.includes("1. *Frieren S2*"));
check("1b. 📺 TV | RELEASING + 📅 + ⭐ Score: 85 (mentah, bukan 8.5)", a1.includes("   📺 TV | RELEASING") && a1.includes("   📅 10/9/2026") && a1.includes("   ⭐ Score: 85"));
check("1c. 🎭 genre + 🏢 studio + 🔗 link MAL", a1.includes("   🎭 Action, Fantasy") && a1.includes("   🏢 Madhouse") && a1.includes("   🔗 https://myanimelist.net/anime/99"));
check("1d. ℅readmore: teks U+200E×4001 nyambung sebelum deskripsi full", a1.includes(`   📖 Deskripsi:${RM}\n\n`) && a1.includes("Deskripsi panjang isi"));
check("1e. footer: 📌 3 anime baru ditambahkan (ketersediaan sumber)", a1.trimEnd().endsWith("📌 3 anime baru ditambahkan (ketersediaan sumber AniList: 3)"));

// ─── 2. formatEpisodeCard: countdown jam/hari + readmore + footer total ───
const eJam = N.formatEpisodeCard({ id: "al-1", title: "One Piece", episode: 1123, timeUntil: 20, score: 90, genres: "Action, Adventure", studios: "Toei", description: "Deskripsi episode panjang", pageUrl: "https://anilist.co/anime/1" }, { index: 1, total: 2, source: "AniList" });
const eHari = N.formatEpisodeCard({ id: "al-2", title: "Bleach", episode: 30, timeUntil: 72, score: 80, genres: "Action", studios: "Pierrot", description: "", malUrl: "https://myanimelist.net/anime/2", pageUrl: "x" }, { index: 2, total: 2 });
check("2a. card episode: ~20 jam (bukan hari) + score mentah", eJam.includes("1. *One Piece*") && eJam.includes("   📺 Episode 1123 rilis dalam ~20 jam") && eJam.includes("   ⭐ 90 | 🎭 Action, Adventure"));
check("2b. card episode: ~3 hari (konversi >24 jam) + 🔗 MAL", eHari.includes("   📺 Episode 30 rilis dalam ~3 hari") && eHari.includes("   🔗 https://myanimelist.net/anime/2"));
check("2c. card episode: deskripsi di balik readmore", eJam.includes(`   📖 Deskripsi:${RM}`) && eJam.includes("Deskripsi episode panjang"));
check("2d. footer episode: 📌 Total 2 episode baru (ketersediaan sumber)", eJam.trimEnd().endsWith("📌 Total 2 episode baru (ketersediaan sumber AniList: 2)"));

// ─── 3. diffWatchlist: episode baru bawa malUrl + trailerThumb ───
// bentuk item NORMALISASI (output normAnilist) — diffWatchlist makai ini
const listD = [
  { id: "al-1", title: "A", nextEpisode: { episode: 3, timeUntil: 10 }, malUrl: "https://myanimelist.net/anime/1", trailerThumb: "https://img.yt/thumb-1.jpg" },
  { id: "al-2", title: "B", nextEpisode: { episode: 7, timeUntil: 30 }, malUrl: null, trailerThumb: null },
];
const diffD = N.diffWatchlist(listD, ["al-1", "al-2"], { "al-1": 2, "al-2": 7 });
check("3a. diff: episode baru cuma anime 1 (3 > 2), anime 2 gak dobel", diffD.newEpisodes.length === 1 && diffD.newEpisodes[0].id === "al-1");
check("3b. diff: item episode bawa malUrl + trailerThumb", diffD.newEpisodes[0].malUrl?.includes("myanimelist") && diffD.newEpisodes[0].trailerThumb?.includes("img.yt"));

// ─── 4. runCheck: first-run baseline + sample banner ───
globalThis.__ANIME_FIXTURE__ = [anime(1, { nextEp: 1, timeUntilH: 5 }), anime(2, { nextEp: 4, timeUntilH: 12 })];
N.addTarget(JID);
sent.length = 0;
const r1 = await N.runCheck();
const st1 = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src", "data", "autoanimenotifier.json"), "utf8"));
check("4a. first-run: baseline initDone + sample terkirim", st1.initDone === true && sent.length >= 1, JSON.stringify(r1));
check("4b. sample pakai banner card renderLargerThumbnail", sent[0]?.content?.contextInfo?.externalAdReply?.renderLargerThumbnail === true);

// ─── 5. runCheck kedua: per-anime preview card (gambar + caption) ───
globalThis.__ANIME_FIXTURE__ = [
  anime(1, { nextEp: 2, timeUntilH: 20 }),                       // episode baru
  anime(2, { nextEp: 4, timeUntilH: 12 }),                       // tetap
  anime(3, { title: "New Anime 3", nextEp: 1, timeUntilH: 8 }), // anime BARU + episode
];
sent.length = 0;
const r2 = await N.runCheck();
const imgs = sent.filter((s) => s.content?.image);
const cards = imgs.filter((s) => s.content?.contextInfo?.externalAdReply?.renderLargerThumbnail === true && Buffer.isBuffer(s.content?.contextInfo?.externalAdReply?.thumbnail));
check("5a. anime baru + episode baru dikirim per-anime: 3 IMAGE card (bukan batch teks)", imgs.length === 3, JSON.stringify(sent.map((s) => Object.keys(s.content))));
check("5b. card: thumbnail banner = buffer gambar + sourceUrl anilist", cards.length === 3 && cards.every((s) => s.content.contextInfo.externalAdReply.sourceUrl.includes("anilist.co/anime/")));
const capNew = imgs.find((s) => s.content.caption?.includes("New Anime 3"));
const capEp = imgs.find((s) => s.content.caption?.includes("ANIME BARU") === false && s.content.caption?.includes("Episode 2"));
check("5c. caption card anime baru: nomor + judul + 🔗 MAL + score mentah", capNew?.content?.caption?.includes("1. *New Anime 3*") && capNew.content.caption.includes("🔗 https://myanimelist.net/anime/3") && capNew.content.caption.includes("⭐ Score: 80") && capNew.content.caption.includes("📌 1 anime baru ditambahkan"));
check("5d. card episode: image + countdown + readmore + footer total 2", !!capEp && capEp.content.caption.includes("   📺 Episode 2 rilis dalam ~20 jam") && capEp.content.caption.includes("📌 Total 2 episode baru"));
check("5e. hasil runCheck: newAnime 1 + newEpisodes 2", r2.newAnime === 1 && r2.newEpisodes === 2, JSON.stringify(r2));

// ─── 6. cap anti-spam ala script: max 3 anime + 5 episode per check ───
globalThis.__ANIME_FIXTURE__ = [
  anime(10), anime(11), anime(12), anime(13), anime(14), anime(15), anime(16), // 7 anime baru
  anime(20, { nextEp: 9, timeUntilH: 5 }), anime(21, { nextEp: 9, timeUntilH: 5 }), anime(22, { nextEp: 9, timeUntilH: 5 }),
  anime(23, { nextEp: 9, timeUntilH: 5 }), anime(24, { nextEp: 9, timeUntilH: 5 }), anime(25, { nextEp: 9, timeUntilH: 5 }),
  anime(26, { nextEp: 9, timeUntilH: 5 }), anime(27, { nextEp: 9, timeUntilH: 5 }), // 8 episode baru
  anime(1, { nextEp: 2, timeUntilH: 20 }),
];
sent.length = 0;
const r3 = await N.runCheck();
const imgs3 = sent.filter((s) => s.content?.image);
const texts3 = sent.filter((s) => s.content?.text);
const ringkasAnime = texts3.find((s) => s.content.text.includes("anime baru lainya"));
const ringkasEp = texts3.find((s) => s.content.text.includes("+3 episode baru lainya"));
check("6a. cap: cuma 3 card anime + 5 card episode (8 image total)", imgs3.length === 8, `imgs=${imgs3.length} r3=${JSON.stringify(r3)}`);
check("6b. sisa anime (12) jadi ringkasan batch", !!ringkasAnime && ringkasAnime.content.text.includes("+12 anime baru lainya") && ringkasAnime.content.text.includes("Anime 16"));
check("6c. sisa episode (3) jadi ringkasan batch", !!ringkasEp && ringkasEp.content.text.includes("Episode 9"));

// ─── 7. fallback: cover & banner null → text + banner card ───
globalThis.__ANIME_FIXTURE__ = [anime(30, { noCover: true, noBanner: true, noTrailer: true, nextEp: 1, timeUntilH: 6 }), anime(1, { nextEp: 2, timeUntilH: 20 })];
sent.length = 0;
await N.runCheck();
const noImg = sent.find((s) => s.content?.text?.includes("Anime 30"));
check("7a. fallback no-cover: text (bukan image) + tetep ada banner card", !!noImg && noImg.content.contextInfo?.externalAdReply?.title === "Anime 30");

// ─── 8. fallback download gambar mati → caption tetep terkirim ───
globalThis.__ANIME_FIXTURE__ = [anime(40, { nextEp: 1, timeUntilH: 3 }), anime(1, { nextEp: 2, timeUntilH: 20 })];
globalThis.__IMG_DOWN__ = true;
sent.length = 0;
await N.runCheck();
const fb = sent.find((s) => s.content?.text?.includes("Anime 40"));
check("8a. download gambar gagal → fallback text card, fitur gak crash", !!fb && fb.content.text.includes("🔗 https://myanimelist.net/anime/40"));
globalThis.__IMG_DOWN__ = false;

// ─── 10. knob interval: .animenotify interval <menit> (5–720) ───
check("10a. interval invalid (2, 800, abc) ditolak", N.setIntervalMenit(2) === null && N.setIntervalMenit(800) === null && N.setIntervalMenit("abc") === null);
const iv = N.setIntervalMenit(60);
const st10 = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src", "data", "autoanimenotifier.json"), "utf8"));
check("10b. interval 60 menit tersimpan & kebaca status", iv === 60 && st10.intervalMenit === 60 && N.getStatus().intervalMenit === 60);

// ─── 9. cache limit: seenIds dibatasi 300 (ala script 500→300) ───
const st9 = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src", "data", "autoanimenotifier.json"), "utf8"));
check("9a. seenIds ≤ 300 setelah beberapa run", (st9.seenIds || []).length <= 300, `len=${(st9.seenIds || []).length}`);

console.log(`═══ ${pass} PASS, ${fail} FAIL ═══`);
process.exit(fail ? 1 : 0);
