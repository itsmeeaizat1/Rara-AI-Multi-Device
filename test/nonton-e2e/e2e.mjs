// E2E — NONTON ANIME HUB (.nonton — anibiplay + otakudesu, fase 1)
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

const plug = await import("../../plugins/anime/nonton.js");

let sends = [], reacts = [], gotUrl = "";
const setHttp = (json, status = 200) => {
  plug._setZelAnimeHttpForTest(async (u) => {
    gotUrl = u;
    return { status, json: async () => json };
  });
};
plug._setZelAnimeKeyForTest("zelapi-testkey");

const mk = (args) => ({
  args,
  sender: "62user@g.us", chat: "gc@g.us", pushName: "user", isOwner: false,
  react: async (r) => { reacts.push(r); },
  reply: async (t) => { sends.push(t); },
});
const run = async (args) => {
  sends = []; reacts = []; gotUrl = "";
  await plug.handler(mk(args));
  return norm(sends[0] || "");
};

// ── 1. usage kosong ──
w("\n— .nonton (usage) —");
{
  const card = await run([]);
  check("1a. usage keluar", card.includes("nonton anime hub"));
  check("1b. contoh anibiplay ada", card.includes("anibiplay"));
}

// ── 2. sumber gak dikenal ──
w("\n— sumber gak dikenal —");
{
  const card = await run(["asdgh"]);
  check("2a. pesan sumber gak dikenal", card.includes("gak dikenal"));
}

// ── 3. animelovers/wotanim ditunda ──
w("\n— animelovers & wotanim ditunda —");
{
  const c1 = await run(["animelovers", "ongoing"]);
  check("3a. animelovers pesan ditunda", c1.includes("belum dipasang") && c1.includes("403"));
  const c2 = await run(["wotanim", "cari", "naruto"]);
  check("3b. wotanim pesan ditunda", c2.includes("belum dipasang"));
}

// ── 4. animekompi mati ──
w("\n— animekompi mati —");
{
  const c = await run(["animekompi", "home"]);
  check("4a. animekompi pesan mati", c.includes("mati total"));
}

// ── 5. anibiplay home sukses ──
w("\n— anibiplay home —");
{
  setHttp({ status: true, creator: "Hazel", featured: [], latestUpdates: [{ title: "Boruto", slug: "boruto-x" }] });
  const c = await run(["anibiplay", "home"]);
  check("5a. judul home keluar", c.includes("update terbaru"));
  check("5b. anime keluar", c.includes("boruto"));
  check("5c. url bener", gotUrl.includes("anibiplay/home") && gotUrl.includes("apikey=zelapi-testkey"));
  check("5d. react urutan", reacts[0] === "🧠" && reacts[1] === "🐣");
}

// ── 6. anibiplay cari sukses ──
w("\n— anibiplay cari —");
{
  setHttp({ status: true, query: "one piece", total: 1, results: [{ title: "ONE PIECE", type: "TV", status: "ongoing", genres: ["Action"], slug: "one-piece" }] });
  const c = await run(["anibiplay", "cari", "one", "piece"]);
  check("6a. hasil pencarian keluar", c.includes("one piece"));
  check("6b. query dikirim bener", gotUrl.includes("q=one+piece") || gotUrl.includes("q=one%20piece"));
}

// ── 7. anibiplay cari tanpa query ──
w("\n— anibiplay cari tanpa query —");
{
  const c = await run(["anibiplay", "cari"]);
  check("7a. minta contoh", c.includes("contoh"));
}

// ── 8. anibiplay detail sukses (field status = string anime, bukan boolean) ──
w("\n— anibiplay detail (status string bukan boolean) —");
{
  setHttp({ status: "completed", creator: "Hazel", slug: "boruto-x", title: "BORUTO", studio: "Pierrot", genres: [{ name: "Action" }], synopsis: "Cerita ninja." });
  const c = await run(["anibiplay", "detail", "boruto-x"]);
  check("8a. detail keluar walau status='completed' string", c.includes("boruto"));
  check("8b. studio keluar", c.includes("pierrot"));
  check("8c. gak dianggap error (STRICT cuma cek === false)", !c.includes("gagal"));
}

// ── 9. anibiplay episode sukses ──
w("\n— anibiplay episode —");
{
  setHttp({ status: true, title: "Boruto Episode 1", streams: [{ server: "ServerA", url: "http://x" }], downloads: [] });
  const c = await run(["anibiplay", "episode", "boruto-x", "1"]);
  check("9a. episode keluar", c.includes("boruto episode 1"));
  check("9b. server streaming keluar", c.includes("servera"));
  check("9c. param slug+ep dikirim", gotUrl.includes("slug=boruto-x") && gotUrl.includes("ep=1"));
}

// ── 10. anibiplay episode tanpa param ──
w("\n— anibiplay episode tanpa param —");
{
  const c = await run(["anibiplay", "episode", "boruto-x"]);
  check("10a. minta contoh", c.includes("contoh"));
}

// ── 11. anibiplay explore sukses ──
w("\n— anibiplay explore —");
{
  setHttp({ status: true, page: 1, total_pages: 76, total: 1801, results: [{ title: "Nige Jouzu", status: "ongoing", slug: "nige-x" }] });
  const c = await run(["anibiplay", "explore", "action"]);
  check("11a. explore keluar", c.includes("nige jouzu"));
  check("11b. genre dikirim", gotUrl.includes("genre=action"));
}

// ── 12. otakudesu sukses ──
w("\n— otakudesu —");
{
  setHttp({ status: true, ongoing: { total: 1, list: [{ title: "Seihantai", episode: "Episode 11", day: "Senin" }] }, complete: { total: 1, list: [{ title: "Naruto", episode: "220 eps" }] } });
  const c = await run(["otakudesu"]);
  check("12a. ongoing keluar", c.includes("seihantai"));
  check("12b. complete keluar", c.includes("naruto"));
  check("12c. action=complete dikirim", gotUrl.includes("action=complete"));
}

// ── 13. STRICT error asli (bukan fallback ngasal) ──
w("\n— error asli STRICT —");
{
  setHttp({ status: false, error: "Invalid API Key." });
  const c = await run(["anibiplay", "home"]);
  check("13a. error asli keluar", c.includes("invalid api key"));
  check("13b. react error", reacts.includes("❌"));
}

// ── 14. HTTP gagal parse json ──
w("\n— HTTP non-json —");
{
  plug._setZelAnimeHttpForTest(async () => ({ status: 500, json: async () => { throw new Error("bad json"); } }));
  const c = await run(["anibiplay", "home"]);
  check("14a. HTTP status keluar", c.includes("http 500"));
}

// ── 15. aksi gak dikenal buat anibiplay ──
w("\n— aksi gak dikenal —");
{
  const c = await run(["anibiplay", "asalasalan"]);
  check("15a. pesan aksi gak dikenal", c.includes("gak dikenal"));
}

// ── summary ──
w("\n— summary —");
w(`PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
