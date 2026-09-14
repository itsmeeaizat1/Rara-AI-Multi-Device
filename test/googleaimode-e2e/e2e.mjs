// E2E — Google AI Mode (.googleaimode) via searchapi.io — STRICT satuan, no fallback
import { strict as assert } from "assert";
import fs from "fs";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
function check(name, cond, extra = "") {
  if (cond) { pass++; w(`  ✅ ${name}`); }
  else { fail++; w(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}

// ── setup db & env (pola e2e repo) ──
const TMP = "/tmp/googleaimode-e2e";
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
process.env.NOVA_DB_DIR = TMP;
const { initDatabase } = await import("../../src/lib/nova-database.js");
await initDatabase(TMP + "/db.json");

const { fromSC } = await import("../../src/lib/styler.js");
const { googleAiModeSearch } = await import("../../src/scraper/searchapi.js");
const plugin = await import("../../plugins/ai/googleaimode.js");
const { handler } = plugin;

const norm = (s) => fromSC(String(s)).toLowerCase();
let sends = [];
let reacts = [];
const sock = {};
const mk = (args, extra = {}) => ({
  args,
  sender: "62user@g.us",
  chat: "gc@g.us",
  pushName: "user",
  isOwner: false,
  react: async (r) => { reacts.push(r); },
  reply: async (t) => { sends.push(t); },
  ...extra,
});

w("\n— usage (tanpa args) —");
sends = [];
await handler(mk([]), { sock });
check("kartu usage keluar", sends.length === 1 && /google ai mode/.test(norm(sends[0])));
check("berisi contoh command", /\.googleaimode/.test(norm(sends[0])));

w("\n— key belum di-set → error jelas, TANPA fallback —");
sends = []; reacts = [];
await handler(mk(["siapa", "presiden", "indonesia"]), { sock });
check("error key keluar", sends.length === 1 && /api key searchapi\.io belum di-set/.test(norm(sends[0])));
check("react ❌", reacts.includes("❌"));
check("gak ada jawaban AI lain (strict)", !/jawaban/i.test(norm(sends[0]).replace(/jawaban ai google/g, "")));

w("\n— 401 key invalid → error asli —");
{
  const scr = await import("../../src/scraper/searchapi.js");
  const { _setSearchApiHttpForTest, _setSearchApiKeyForTest } = scr;
  _setSearchApiKeyForTest("TEST-KEY");
  _setSearchApiHttpForTest(async () => ({ status: 401, json: async () => ({}) }));
  const { getSearchApiKey } = await import("../../src/lib/config/env-loader.js");
  // inject key dummy biar lolos gate
  const orig = getSearchApiKey();
  const r = await import("../../src/scraper/searchapi.js");
  const r401 = await scr.googleAiModeSearch("tes", {});
  check("401 → API_KEY_INVALID", !r401.ok && /api_key_invalid.*401/i.test(r401.error || ""));
  _setSearchApiHttpForTest(null);
}

w("\n— 429 kuota habis → pesan kuota —");
{
  const scr = await import("../../src/scraper/searchapi.js");
  const { _setSearchApiHttpForTest, _setSearchApiKeyForTest } = scr;
  _setSearchApiKeyForTest("TEST-KEY");
  _setSearchApiHttpForTest(async () => ({ status: 429, json: async () => ({}) }));
  const r = await import("../../src/scraper/searchapi.js");
  const r429 = await scr.googleAiModeSearch("tes", {});
  check("429 → QUOTA_HABIS", !r429.ok && /quota_habis.*429/i.test(r429.error || ""));
  _setSearchApiHttpForTest(null);
}

w("\n— sukses: jawaban + sumber —");
{
  const mockData = {
    search_metadata: { status: "Success", total_time_taken: 4.71 },
    generated_markdown: "Jokowi sudah bukan presiden. Presiden Indonesia saat ini Prabowo Subianto.",
    reference_links: [
      { title: "Wikipedia", link: "https://id.wikipedia.org/wiki/Prabowo_Subianto" },
      { title: "Detik", link: "https://news.detik.com/berita-prabowo" },
    ],
    followups: [{ question: "Siapa wakil presiden Indonesia?" }],
  };
  const { _setSearchApiHttpForTest } = await import("../../src/scraper/searchapi.js");
  let gotUrl = "";
  _setSearchApiHttpForTest(async (u) => { gotUrl = u; return { status: 200, json: async () => mockData }; });
  sends = []; reacts = [];
  await handler(mk(["siapa", "presiden", "indonesia"]), { sock });
  const card = norm(sends[0] || "");
  check("kartu jawaban keluar", sends.length === 1 && /ai mode google/.test(card));
  check("isi jawaban AI", card.includes("prabowo"));
  check("sumber link kecantum", card.includes("id.wikipedia.org") && card.includes("news.detik.com"));
  check("sumber max 6", (card.match(/🔗/g) || []).length <= 6);
  check("followup kecantum", card.includes("siapa wakil presiden"));
  check("engine searchapi disebut", card.includes("searchapi.io"));
  check("engine=google_ai_mode terpakai", gotUrl.includes("engine=google_ai_mode"));
  check("hl=id default", gotUrl.includes("hl=id"));
  check("react 🧠→🐣", reacts.includes("🧠") && reacts.includes("🐣"));
  _setSearchApiHttpForTest(null);
}

w("\n— parser toleran: text_blocks tanpa markdown —");
{
  const mockData = {
    search_metadata: { status: "Success" },
    text_blocks: [
      { type: "text", snippet: "Fiber itu serat optik." },
      { type: "text", snippet: "Kecepatannya tinggi." },
    ],
    web_references: [{ title: "Telkom", link: "https://telkom.co.id/fiber" }],
  };
  const scr = await import("../../src/scraper/searchapi.js");
  const { _setSearchApiHttpForTest, _setSearchApiKeyForTest } = scr;
  _setSearchApiKeyForTest("TEST-KEY");
  _setSearchApiHttpForTest(async () => ({ status: 200, json: async () => mockData }));
  const rr = await scr.googleAiModeSearch("fiber", {});
  check("jawaban dari text_blocks gabung", rr.ok && rr.answer.includes("Fiber itu serat optik.") && rr.answer.includes("Kecepatannya tinggi."));
  check("sumber dari web_references", rr.sources[0]?.link === "https://telkom.co.id/fiber");
  _setSearchApiHttpForTest(null);
}

w("\n— jawaban kosong → error jelas —");
{
  const scr = await import("../../src/scraper/searchapi.js");
  const { _setSearchApiHttpForTest, _setSearchApiKeyForTest } = scr;
  _setSearchApiKeyForTest("TEST-KEY");
  _setSearchApiHttpForTest(async () => ({ status: 200, json: async () => ({ search_metadata: { status: "Success" } }) }));
  const rr = await scr.googleAiModeSearch("xyz", {});
  check("error 'gak ngasih jawaban'", !rr.ok && /gak ngasih jawaban/.test(norm(rr.error || "")));
  _setSearchApiHttpForTest(null);
}

w("\n— reply foto → mode visual (url param) —");
{
  const mockData = {
    search_metadata: { status: "Success" },
    generated_markdown: "Ini foto kucing oren.",
    reference_links: [{ title: "Wiki", link: "https://wikipedia.org/cat" }],
  };
  const { _setSearchApiHttpForTest } = await import("../../src/scraper/searchapi.js");
  let gotUrl = "";
  _setSearchApiHttpForTest(async (u) => { gotUrl = u; return { status: 200, json: async () => mockData }; });
  // mock uguu upload (lewat seam plugin)
  plugin._setUguuForTest(async () => "https://a.uguu.se/aimode.jpg");
  sends = []; reacts = [];
  await handler(mk(["ini", "gambar", "apa"], {
    quoted: { isImage: true, download: async () => Buffer.from("fakeimg") },
  }), { sock });
  const card = norm(sends[0] || "");
  check("upload uguu dipanggil", gotUrl.includes("url=https%3A%2F%2Fa.uguu.se%2Faimode.jpg") || gotUrl.includes("url=" + encodeURIComponent("https://a.uguu.se/aimode.jpg")));
  check("jawaban visual keluar", card.includes("ini gambar apa") && card.includes("kucing"));
  plugin._setUguuForTest(null);
  _setSearchApiHttpForTest(null);
}

w("\n— foto tanpa teks → header ANALISIS GAMBAR —");
{
  const scr3 = await import("../../src/scraper/searchapi.js");
  const _setSearchApiHttpForTest = scr3._setSearchApiHttpForTest;
  plugin._setUguuForTest(async () => "https://a.uguu.se/aimode.jpg");
  _setSearchApiHttpForTest(async () => ({ status: 200, json: async () => ({
    search_metadata: { status: "Success" },
    generated_markdown: "Ini foto kucing oren.",
    reference_links: [{ title: "Wiki", link: "https://wikipedia.org/cat" }],
  }) }));
  sends = [];
  await handler(mk([], {
    quoted: { isImage: true, download: async () => Buffer.from("fakeimg") },
  }), { sock });
  const card2 = norm(sends[0] || "");

  check("header analisis gambar", card2.includes("analisis gambar") && card2.includes("kucing"));
  check("q kosong gak ngeyatuh ke usage", sends.length === 1 && !/contoh/.test(card2));
  plugin._setUguuForTest(null);
}

w("\n— timeout → error sopan —");
{
  const scr = await import("../../src/scraper/searchapi.js");
  const { _setSearchApiHttpForTest, _setSearchApiKeyForTest } = scr;
  _setSearchApiKeyForTest("TEST-KEY");
  _setSearchApiHttpForTest(async () => { const e = new Error("aborted"); e.name = "AbortError"; throw e; });
  const rr = await scr.googleAiModeSearch("tes", {});
  check("timeout terdeteksi", !rr.ok && /timeout/i.test(rr.error || ""));
  _setSearchApiHttpForTest(null);
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
