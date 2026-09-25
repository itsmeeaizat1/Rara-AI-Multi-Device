// E2E — NONTON ANIME HUB (.nonton — anibiplay + animelovers + otakudesu)
import { strict as assert } from "assert";
import fs from "fs";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
function check(name, cond, extra = "") {
  if (cond) { pass++; w(`  ✅ ${name}`); }
  else { fail++; w(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}

const TMP = "/tmp/nonton-e2e";
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
process.env.NOVA_DB_DIR = TMP;
const { initDatabase } = await import("../../src/lib/nova-database.js");
await initDatabase(TMP + "/db.json");
const { fromSC } = await import("../../src/lib/styler.js");
const norm = (s) => fromSC(String(s || "")).toLowerCase();

const plug = await import("../../plugins/anime/watch.js");

let sends = [], reacts = [], gotUrls = [];
const setHttp = (json, status = 200) => {
  plug._setZelAnimeHttpForTest(async (u) => {
    gotUrls.push(u);
    return { status, json: async () => json };
  });
};
// seq: kasih beberapa respons berurutan (buat tes retry) — tiap panggilan
// fetch berikutnya ambil elemen selanjutnya dari array.
const setHttpSeq = (seq) => {
  let i = 0;
  plug._setZelAnimeHttpForTest(async (u) => {
    gotUrls.push(u);
    const item = seq[Math.min(i, seq.length - 1)];
    i++;
    return { status: item.status ?? 200, json: async () => item.json };
  });
};
plug._setZelAnimeKeyForTest("zelapi-testkey");
plug._setZelAnimeSleepForTest(async () => {}); // biar e2e gak nunggu delay retry beneran

const mk = (args) => ({
  args,
  sender: "62user@g.us", chat: "gc@g.us", pushName: "user", isOwner: false,
  react: async (r) => { reacts.push(r); },
  reply: async (t) => { sends.push(t); },
});
const run = async (args) => {
  sends = []; reacts = []; gotUrls = [];
  await plug.handler(mk(args));
  return norm(sends[0] || "");
};

// ── 1. usage kosong ──
w("\n— .nonton (usage) —");
{
  const card = await run([]);
  check("1a. usage keluar", card.includes("nonton anime hub"));
  check("1b. contoh anibiplay ada", card.includes("anibiplay"));
  check("1c. contoh animelovers ada", card.includes("animelovers"));
}

// ── 2. sumber gak dikenal ──
w("\n— sumber gak dikenal —");
{
  const card = await run(["asdgh"]);
  check("2a. pesan sumber gak dikenal", card.includes("gak dikenal"));
}

// ── 3. wotanim ditunda, animekompi mati ──
w("\n— wotanim ditunda, animekompi mati —");
{
  const c2 = await run(["wotanim", "cari", "naruto"]);
  check("3a. wotanim pesan ditunda", c2.includes("belum dipasang"));
  const c3 = await run(["animekompi", "home"]);
  check("3b. animekompi pesan mati", c3.includes("mati total"));
}

// ── 4. anibiplay home sukses ──
w("\n— anibiplay home —");
{
  setHttp({ status: true, creator: "Hazel", featured: [], latestUpdates: [{ title: "Boruto", slug: "boruto-x" }] });
  const c = await run(["anibiplay", "home"]);
  check("4a. judul home keluar", c.includes("update terbaru"));
  check("4b. anime keluar", c.includes("boruto"));
  check("4c. url bener", gotUrls[0].includes("anibiplay/home") && gotUrls[0].includes("apikey=zelapi-testkey"));
  check("4d. react urutan", reacts[0] === "🧠" && reacts[1] === "🐣");
}

// ── 5. anibiplay cari sukses ──
w("\n— anibiplay cari —");
{
  setHttp({ status: true, query: "one piece", total: 1, results: [{ title: "ONE PIECE", type: "TV", status: "ongoing", genres: ["Action"], slug: "one-piece" }] });
  const c = await run(["anibiplay", "cari", "one", "piece"]);
  check("5a. hasil pencarian keluar", c.includes("one piece"));
  check("5b. query dikirim bener", gotUrls[0].includes("q=one+piece") || gotUrls[0].includes("q=one%20piece"));
}

// ── 6. anibiplay cari tanpa query ──
w("\n— anibiplay cari tanpa query —");
{
  const c = await run(["anibiplay", "cari"]);
  check("6a. minta contoh", c.includes("contoh"));
}

// ── 7. anibiplay detail sukses (field status = string anime, bukan boolean) ──
w("\n— anibiplay detail (status string bukan boolean) —");
{
  setHttp({ status: "completed", creator: "Hazel", slug: "boruto-x", title: "BORUTO", studio: "Pierrot", genres: [{ name: "Action" }], synopsis: "Cerita ninja." });
  const c = await run(["anibiplay", "detail", "boruto-x"]);
  check("7a. detail keluar walau status='completed' string", c.includes("boruto"));
  check("7b. studio keluar", c.includes("pierrot"));
  check("7c. gak dianggap error (STRICT cuma cek === false)", !c.includes("gagal"));
}

// ── 8. anibiplay episode sukses ──
w("\n— anibiplay episode —");
{
  setHttp({ status: true, title: "Boruto Episode 1", streams: [{ server: "ServerA", url: "http://x" }], downloads: [] });
  const c = await run(["anibiplay", "episode", "boruto-x", "1"]);
  check("8a. episode keluar", c.includes("boruto episode 1"));
  check("8b. server streaming keluar", c.includes("servera"));
  check("8c. param slug+ep dikirim", gotUrls[0].includes("slug=boruto-x") && gotUrls[0].includes("ep=1"));
}

// ── 9. anibiplay episode tanpa param ──
w("\n— anibiplay episode tanpa param —");
{
  const c = await run(["anibiplay", "episode", "boruto-x"]);
  check("9a. minta contoh", c.includes("contoh"));
}

// ── 10. anibiplay explore sukses ──
w("\n— anibiplay explore —");
{
  setHttp({ status: true, page: 1, total_pages: 76, total: 1801, results: [{ title: "Nige Jouzu", status: "ongoing", slug: "nige-x" }] });
  const c = await run(["anibiplay", "explore", "action"]);
  check("10a. explore keluar", c.includes("nige jouzu"));
  check("10b. genre dikirim", gotUrls[0].includes("genre=action"));
}

// ── 11. otakudesu sukses ──
w("\n— otakudesu —");
{
  setHttp({ status: true, ongoing: { total: 1, list: [{ title: "Seihantai", episode: "Episode 11", day: "Senin" }] }, complete: { total: 1, list: [{ title: "Naruto", episode: "220 eps" }] } });
  const c = await run(["otakudesu"]);
  check("11a. ongoing keluar", c.includes("seihantai"));
  check("11b. complete keluar", c.includes("naruto"));
  check("11c. action=complete dikirim", gotUrls[0].includes("action=complete"));
}

// ── 12. animelovers ongoing sukses langsung (no retry needed) ──
w("\n— animelovers ongoing sukses langsung —");
{
  setHttp({ status: true, page: 1, total: 1, data: [{ id: 1, url: "seihantai-kimi-boku-s2-sub-indo", judul: "Seihantai na Kimi to Boku 2nd Season", lastch: "Ep 11" }] });
  const c = await run(["animelovers", "ongoing"]);
  check("12a. list keluar", c.includes("seihantai"));
  check("12b. cuma 1x fetch (gak perlu retry)", gotUrls.length === 1);
}

// ── 13. animelovers ongoing GAGAL dulu (403) lalu SUKSES di retry ke-2 ──
w("\n— animelovers retry setelah 403 —");
{
  setHttpSeq([
    { json: { status: false, error: "Request failed with status code 403" } },
    { json: { status: true, page: 1, total: 1, data: [{ id: 1, url: "naruto-sub-indo", judul: "Naruto" }] } },
  ]);
  const c = await run(["animelovers", "baru"]);
  check("13a. akhirnya sukses setelah retry", c.includes("naruto"));
  check("13b. total 2x fetch (1 gagal + 1 retry sukses)", gotUrls.length === 2);
}

// ── 14. animelovers GAGAL TERUS (403 semua percobaan) → error asli ──
w("\n— animelovers gagal semua percobaan —");
{
  setHttp({ status: false, error: "Request failed with status code 403" });
  const c = await run(["animelovers", "movie"]);
  check("14a. error asli keluar", c.includes("403"));
  check("14b. total 4x fetch (1 + 3 retry, lalu nyerah)", gotUrls.length === 4);
  check("14c. react error", reacts.includes("❌"));
}

// ── 15. animelovers cari sukses ──
w("\n— animelovers cari —");
{
  setHttp({ status: true, page: 1, total: 1, data: [{ id: 1, url: "one-piece-sub-indo", judul: "One Piece" }] });
  const c = await run(["animelovers", "cari", "one", "piece"]);
  check("15a. hasil keluar", c.includes("one piece"));
  check("15b. q dikirim", gotUrls[0].includes("q=one"));
}

// ── 16. animelovers detail sukses ──
w("\n— animelovers detail —");
{
  setHttp({ status: true, judul: "Naruto", sinopsis: "Ninja muda.", genre: ["Action", "Adventure"], status: "Completed" });
  const c = await run(["animelovers", "detail", "naruto-sub-indo"]);
  check("16a. detail keluar", c.includes("naruto"));
  check("16b. slug dikirim", gotUrls[0].includes("slug=naruto-sub-indo"));
}

// ── 17. animelovers nonton (stream) sukses ──
w("\n— animelovers nonton (stream) —");
{
  setHttp({ status: true, judul: "Naruto", episode: [{ title: "Episode 1", url: "http://x" }] });
  const c = await run(["animelovers", "nonton", "naruto-sub-indo"]);
  check("17a. stream keluar", c.includes("episode 1"));
}

// ── 18. animelovers aksi/param kosong ──
w("\n— animelovers validasi param —");
{
  const c1 = await run(["animelovers"]);
  check("18a. animelovers tanpa aksi minta contoh", c1.includes("contoh"));
  const c2 = await run(["animelovers", "detail"]);
  check("18b. detail tanpa slug minta contoh", c2.includes("contoh"));
}

// ── 19. STRICT error asli anibiplay (bukan fallback ngasal) ──
w("\n— error asli STRICT anibiplay —");
{
  setHttp({ status: false, error: "Invalid API Key." });
  const c = await run(["anibiplay", "home"]);
  check("19a. error asli keluar", c.includes("invalid api key"));
  check("19b. react error", reacts.includes("❌"));
}

// ── 20. HTTP gagal parse json ──
w("\n— HTTP non-json —");
{
  plug._setZelAnimeHttpForTest(async () => ({ status: 500, json: async () => { throw new Error("bad json"); } }));
  const c = await run(["anibiplay", "home"]);
  check("20a. HTTP status keluar", c.includes("http 500"));
}

// ── 21. aksi gak dikenal ──
w("\n— aksi gak dikenal —");
{
  setHttp({ status: true });
  const c1 = await run(["anibiplay", "asalasalan"]);
  check("21a. anibiplay aksi gak dikenal", c1.includes("gak dikenal"));
  const c2 = await run(["animelovers", "asalasalan"]);
  check("21b. animelovers aksi gak dikenal", c2.includes("gak dikenal"));
}

// ── summary ──
w("\n— summary —");
w(`PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
