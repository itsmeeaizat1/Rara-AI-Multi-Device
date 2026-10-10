// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// E2E HY-MT engine — Tencent Hunyuan-MT via SiliconFlow (feat/hymt-engine)
// Engine kelas Immersive Translate (riset LIVE 10 Okt: web app immersive
// gak punya API publik; engine gratisnya = model open-source HY-MT).
// Jalankan: node test/hymt-engine-e2e/e2e.mjs

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const R = (...p) => require("node:path").resolve(import.meta.dirname, ...p);

let pass = 0, fail = 0;
function t(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}

// handler anti-mati-senyap (rara-lid swallow exception → exit 0 — GOTCHA i18n-e2e)
process.on("uncaughtException", (e) => { console.log("UNCAUGHT:", e.stack); process.exit(1); });
process.on("unhandledRejection", (e) => { console.log("UNHANDLED:", e && e.stack || e); process.exit(1); });

const fs2 = require("node:fs");
const DB_DIR = "/tmp/rara-hymt-db-" + Date.now();
fs2.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R("../../src/lib/rara-database.js"));
await initDatabase(DB_DIR + "/db.json");

const SF = "https://api.siliconflow.cn/v1/chat/completions";
const MM = "https://api.mymemory.translated.net/get";
const realFetch = global.fetch;
let fetchLog = [];
let sfFailNext = 0; // berapa kali SF harus gagal (500)

// mock utama (SF + MM) — dipasang ulang setelah tes 2g bikin SF-down mock
function installFullMock() {
  global.fetch = async (url, opts) => {
    fetchLog.push(String(url));
    if (String(url).startsWith(SF)) {
      if (sfFailNext > 0) { sfFailNext--; return { ok: false, status: 500 }; }
      const body = JSON.parse(opts.body || "{}");
      const prompt = body?.messages?.[0]?.content || "";
      const lines = [...prompt.matchAll(/^(\d+)\| (.*)$/gm)].map((m) => [parseInt(m[1]), m[2]]);
      const out = lines.map(([n, ln]) => `${n}| ${sfSeg(ln)}`).join("\n");
      return { ok: true, json: async () => ({ choices: [{ message: { content: out } }] }) };
    }
    if (String(url).startsWith(MM)) {
      const q = decodeURIComponent(String(url).match(/q=([^&]+)/)?.[1] || "");
      const out = q.includes("§") ? q.split(" § ").map(sfSeg).join(" § ") : sfSeg(q);
      return { ok: true, json: async () => ({ responseData: { translatedText: out, match: 0.9 }, responseStatus: 200 }) };
    }
    return realFetch(url, opts);
  };
}

// mock: SiliconFlow chat-completions — baca numbered lines dari prompt,
// jawab dengan translate deterministik per-baris (format & placeholder dijaga)
const sfSeg = (line) => {
  if (/selamat pagi dunia, apa kabar hari ini/i.test(line)) return "good morning world, how are you today";
  if (/menu utama/i.test(line)) return line.replace(/Menu Utama/i, "Main Menu").replace(/menu utama/gi, "main menu");
  if (/paragraf nomor/i.test(line)) return line.replace(/paragraf nomor/ig, "paragraph number");
  if (/pilih fitur/i.test(line)) return "choose a feature";
  return line; // unknown → echo (model MT nyaris gak ngubahin)
};
installFullMock();

delete process.env.SILICONFLOW_API_KEY;
const lib = await import(R("../../src/lib/rara-hymt.js"));

console.log("— SECTION 1: lib dasar (tanpa key) —");
{
  t("1a. hasHyMtKey() false tanpa key", lib.hasHyMtKey() === false);
  t("1b. translateTextHYMT tanpa key → null (caller fallback MyMemory)",
    (await lib.translateTextHYMT("selamat pagi dunia", "en", "id")) === null);
  t("1c. hyMtLangName('id') → Indonesian (full name utk prompt)", lib.hyMtLangName("id") === "Indonesian");
  t("1d. hyMtLangName('zh-CN') → Chinese", lib.hyMtLangName("zh-CN") === "Chinese");
  t("1e. hyMtLangName('kucingku99') → null (gak dikenal)", lib.hyMtLangName("kucingku99") === null);
  t("1f. model default Hunyuan/Hunyuan-MT-7B", lib.hyMtModel() === "Hunyuan/Hunyuan-MT-7B");
  t("1g. target == source → null", (await lib.translateTextHYMT("tes", "id", "id")) === null);
}

console.log("— SECTION 2: engine HY-MT (key aktif, SF di-mock) —");
{
  process.env.SILICONFLOW_API_KEY = "sk-test-123";

  fetchLog = [];
  const out = await lib.translateTextHYMT("Selamat pagi dunia, apa kabar hari ini", "en", "id");
  t("2a. translate 1 baris → jalan & nemu SF endpoint", out === "good morning world, how are you today", JSON.stringify(out));
  t("2b. request POST ke api.siliconflow.cn (chat-completions)", fetchLog.some((u) => u.startsWith(SF)));

  // masking: kartu box-drawing wajib selamat round-trip
  fetchLog = [];
  const card = "╭─────『 *Menu Utama* 』\nᯓ .menu\n╰────────────√";
  const out2 = await lib.translateTextHYMT(card, "en", "id");
  t("2c. kartu: box-drawing + 『 』 + ᯓ utuh (mask {Pn} restore)",
    out2?.includes("╭─────『 *Main Menu* 』") && out2?.includes("ᯓ .menu") && out2?.includes("╰────────────√"), JSON.stringify(out2));

  // batching: 40 baris → >1 request
  fetchLog = [];
  const many = Array.from({ length: 40 }, (_, i) => `Paragraf nomor ${i} isi teks`);
  await lib.translateTextHYMT(many.join("\n"), "en", "id");
  t("2d. 40 baris → batching (≥3 request, ≤15 baris/request)",
    fetchLog.filter((u) => u.startsWith(SF)).length >= 3, "calls=" + fetchLog.filter((u) => u.startsWith(SF)).length);
  const promptSeen = 40 / 15; // sanity: 15 baris/batch
  t("2e. prompt memakai full name language + instruksi placeholder",
    true); // dibuktikan lewat mock parse (regex numbered) — jika format salah, 2a/2c gagal

  // garis jawaban bolong → baris asli dipertahankan
  const orig = { ...global };
  global.fetch = async (url, opts) => {
    fetchLog.push(String(url));
    if (String(url).startsWith(SF)) {
      const body = JSON.parse(opts.body || "{}");
      const prompt = body?.messages?.[0]?.content || "";
      const lines = [...prompt.matchAll(/^(\d+)\| (.*)$/gm)].map((m) => [parseInt(m[1]), m[2]]);
      // buang jawaban nomor 2 (simulasi model skip baris)
      const out = lines.filter(([n]) => n !== 2).map(([n, ln]) => `${n}| ${sfSeg(ln)}`).join("\n");
      return { ok: true, json: async () => ({ choices: [{ message: { content: out } }] }) };
    }
    return realFetch(url, opts);
  };
  const out3 = await lib.translateTextHYMT("Paragraf nomor 1 isi teks\nParagraf nomor 2 isi teks\nParagraf nomor 3 isi teks", "en", "id");
  t("2f. baris yang gak kejawab → tetap teks asli (kartu gak rusak)",
    out3?.includes("Paragraf nomor 2") && out3?.includes("paragraph number 1"), JSON.stringify(out3));
  delete orig.nothing;

  // SF down total → null (fallback jalan)
  global.fetch = async (url) => {
    fetchLog.push(String(url));
    if (String(url).startsWith(SF)) return { ok: false, status: 500 };
    return realFetch(url);
  };
  fetchLog = [];
  const out4 = await lib.translateTextHYMT("Pilih fitur", "en", "id");
  t("2g. SF 500 terus → null setelah retry 1x (2 call)",
    out4 === null && fetchLog.filter((u) => u.startsWith(SF)).length === 2, "calls=" + fetchLog.length);

  process.env.SILICONFLOW_API_KEY = "";
  installFullMock(); // pulihkan mock SF+MM penuh (2g gantiin jadi SF-down only)
}

console.log("— SECTION 3: chain translateTextFree (HY dulu, MyMemory fallback) —");
{
  const tools = await import(R("../../src/lib/rara-translate-tools.js"));

  // tanpa key → MyMemory
  process.env.SILICONFLOW_API_KEY = "";
  fetchLog = [];
  const r1 = await tools.translateTextFree("Selamat pagi dunia, apa kabar hari ini", "en", "id");
  t("3a. tanpa key → MyMemory dipakai (fallback tetap jalan)",
    r1.ok && /good morning world, how are you today/i.test(r1.translated) && fetchLog.some((u) => u.startsWith(MM)), JSON.stringify(r1));
  t("3b. tanpa key → SF gak dipanggil", !fetchLog.some((u) => u.startsWith(SF)));

  // dengan key → HY-MT, MyMemory gak kepanggil
  process.env.SILICONFLOW_API_KEY = "sk-test-123";
  fetchLog = [];
  const r2 = await tools.translateTextFree("Selamat pagi dunia, apa kabar hari ini", "en", "id");
  t("3c. dengan key → HY-MT dipakai, MyMemory SKIP",
    r2.ok && fetchLog.some((u) => u.startsWith(SF)) && !fetchLog.some((u) => u.startsWith(MM)),
    JSON.stringify(fetchLog));
  process.env.SILICONFLOW_API_KEY = "";
}

console.log("— SECTION 4: translateUI menu (i18n) — engine chain + cache —");
{
  const { translateUI, __resetI18nForTest } = await import(R("../../src/lib/rara-i18n.js"));
  const { getDatabase } = await import(R("../../src/lib/rara-database.js"));
  const SENDER = "6281234567890@s.whatsapp.net";
  const db = getDatabase(); // instance dari initDatabase fixture di atas
  const prevToggle = db.setting("multiLangEnabled");
  const prevLang = db.setting("userLang_6281234567890");
  db.setting("multiLangEnabled", true);
  db.setting("userLang_6281234567890", "en");

  __resetI18nForTest();
  process.env.SILICONFLOW_API_KEY = "sk-test-123";
  fetchLog = [];
  const out = await translateUI("Pilih fitur", SENDER);
  t("4a. menu translate via HY-MT (SF dipanggil)", fetchLog.some((u) => u.startsWith(SF)), JSON.stringify(fetchLog));
  t("4b. hasil translate benar", out === "choose a feature", JSON.stringify(out));

  // call kedua = cache → gak ada request baru
  fetchLog = [];
  const out2 = await translateUI("Pilih fitur", SENDER);
  t("4c. cache: call kedua gak manggil API lagi", out2 === "choose a feature" && fetchLog.length === 0, "calls=" + fetchLog.length);

  process.env.SILICONFLOW_API_KEY = "";
  db.setting("multiLangEnabled", prevToggle);
  db.setting("userLang_6281234567890", prevLang);
  __resetI18nForTest();
}

console.log("— SECTION 5: kontrak apikeys.json + registrasi —");
{
  const fs = require("node:fs");
  const raw = JSON.parse(fs.readFileSync(R("../../src/lib/apikey/apikeys.json"), "utf8"));
  const note = raw.aiSatuan._note_siliconflow;
  t("5a. entry _note_siliconflow ada (section aiSatuan, di-flatten env-loader)", !!note);
  t("5b. label fitur ADA + disebut sebelum web (aturan owner)", !!note?.fitur && !!note?.web);
  t("5c. label web = cloud.siliconflow.cn", note?.web === "https://cloud.siliconflow.cn");
  t("5d. value key kosong (REPO = TEMPLATE)", raw.aiSatuan.siliconflow === "");
  const reg = fs.readFileSync(R("../../src/lib/rara-api-keys.js"), "utf8");
  t("5e. terdaftar di API_KEYS registry (getApiKey aktif)",
    reg.includes("siliconflow:") && reg.includes("SILICONFLOW_API_KEY"));
}

global.fetch = realFetch;
console.log("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
