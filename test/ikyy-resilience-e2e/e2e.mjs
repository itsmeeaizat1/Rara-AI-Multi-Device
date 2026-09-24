// e2e — ikyy resilience: timeout fetch, circuit breaker, fallback 9Router
// Bug yang diperbaiki (audit 24 Sep 2026):
//   1. requestOnce GET/POST + retry ikyy TANPA timeout -> hang selamanya saat
//      IkyyXD degraded (latensi live 8-25 dtk, kadang 520/timeout).
//   2. Rantai callIkyy nyusuri 7 model ikyy berurutan -> 2-3 menit sebelum
//      9Router kejawab. Sekarang: primary + 1 fallback -> breaker 10 mnt.
//   3. Fallback 9Router TIDAK PERNAH sampai ke 9Router: callAIRaw gak pernah
//      resolve key provider (tio_openai tanpa key -> auto-fallback muter
//      balik ke ikyy_gemini). Fix: key resolution + slot router9v2.
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { fileURLToPath } from "node:url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let pass = 0, fail = 0;
function t(name, ok, extra) {
  if (ok) { pass++; console.log("  OK " + name); }
  else { fail++; console.error("  FAIL " + name + (extra !== undefined ? " " + JSON.stringify(extra).slice(0, 200) : "")); }
}

// -- init db (GOTCHA: getDatabase tanpa initDatabase THROW) --
const { initDatabase } = await import(R + "/src/lib/nova-database.js");
const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "ikyy-e2e-db-"));
await initDatabase(path.join(dbDir, "db"));

const svc = await import(R + "/src/lib/nova-ai-service.js");
const { callIkyy, _resetIkyyBreakerForTest } = svc;
const { getProviderApiKey } = await import(R + "/src/lib/apikey/ai-chain.js");

// -- SECTION 0: resolusi key tio_openai -> router9v2 --
console.log("- section 0: key resolution -");
{
  const k = getProviderApiKey("tio_openai");
  t("0a. tio_openai resolve key router9v2 (config/env)", typeof k === "string" && k.length > 0, "len=" + String(k).length);
}

// -- mock fetch: log semua request, jawab per domain --
const calls = [];
function installMock({ ikyy, router }) {
  if (!globalThis.__realFetch) globalThis.__realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    calls.push({ url: u, method: opts.method || "GET", hasSignal: !!opts.signal });
    if (u.includes("api.ikyyxd.my.id")) return ikyy(u, opts);
    if (u.includes("/chat/completions")) return router(u, opts);
    return new Response(JSON.stringify({ status: false, error: "unknown mock url: " + u }), { status: 404 });
  };
}
function restoreMock() { if (globalThis.__realFetch) { globalThis.fetch = globalThis.__realFetch; globalThis.__realFetch = null; } }
const okRouter = () => new Response(JSON.stringify({ choices: [{ message: { content: "jawaban dari 9router" } }] }), { status: 200, headers: { "content-type": "application/json" } });
const deadIkyy = () => new Response(JSON.stringify({ status: false, error: "upstream degraded" }), { status: 200, headers: { "content-type": "application/json" } });
const emptyIkyy = () => new Response(JSON.stringify({ status: true, result: "" }), { status: 200, headers: { "content-type": "application/json" } });

const ikyyCalls = () => calls.filter(c => c.url.includes("api.ikyyxd.my.id"));
const routerCalls = () => calls.filter(c => c.url.includes("/chat/completions"));

// -- SECTION 1: ikyy mati total -> 9Router kejawab (fallback beneran sampai) --
console.log("- section 1: fallback 9Router reachable -");
{
  calls.length = 0; _resetIkyyBreakerForTest();
  installMock({ ikyy: deadIkyy, router: okRouter });
  try {
    const r = await callIkyy("halo, tes fallback");
    t("1a. callIkyy balas dari 9router", String(r).includes("9router"), r);
    t("1b. request 9router kesampaian", routerCalls().length > 0, routerCalls().length);
    t("1c. ikyy dicoba dulu sebelum 9router", ikyyCalls().length >= 2, ikyyCalls().length);
    // maks 3: gemini + cici + 1 retry internal ikyy di dalam callAI(cici).
    // (callAI(ikyy_gemini) gak retry internal "udah di Ikyy".) Dulu: 7 model
    // berurutan + tanpa timeout = 175 dtk/hang. Sekarang: bounded 75 dtk
    // lalu breaker ON.
    t("1d. ikyy TIDAK disusuri 7 model (maks 3 percobaan)", ikyyCalls().length <= 3, ikyyCalls().length);
  } catch (e) {
    t("1a. callIkyy balas dari 9router", false, e.message);
  }
  restoreMock();
}

// -- SECTION 2: circuit breaker aktif -> call berikutnya LANGSUNG 9router --
console.log("- section 2: circuit breaker -");
{
  calls.length = 0; // JANGAN reset breaker -- harusnya masih ON dari section 1
  installMock({ ikyy: deadIkyy, router: okRouter });
  try {
    const r = await callIkyy("tes breaker");
    t("2a. breaker ON -> balas dari 9router", String(r).includes("9router"), r);
    t("2b. breaker ON -> ikyy gak disentuh sama sekali", ikyyCalls().length === 0, ikyyCalls().length);
    t("2c. langsung 1 call 9router tanpa putaran", routerCalls().length === 1, routerCalls().length);
  } catch (e) {
    t("2a. breaker ON -> balas dari 9router", false, e.message);
  }
  restoreMock();
}

// -- SECTION 3: reset breaker -> ikyy dicoba lagi (recovery) --
console.log("- section 3: breaker reset -");
{
  calls.length = 0; _resetIkyyBreakerForTest();
  const healthyIkyy = () => new Response(JSON.stringify({ status: true, result: "jawaban dari ikyy gemini" }), { status: 200, headers: { "content-type": "application/json" } });
  installMock({ ikyy: healthyIkyy, router: okRouter });
  const r = await callIkyy("tes recovery");
  t("3a. setelah reset, ikyy sehat dipakai kembali", String(r).includes("ikyy"), r);
  t("3b. 9router gak ikut dipanggil", routerCalls().length === 0, routerCalls().length);
  restoreMock();
}

// -- SECTION 4: ikyy balas status:true tapi result kosong -> tetap fallback --
console.log("- section 4: empty result (falsy trap) -");
{
  calls.length = 0; _resetIkyyBreakerForTest();
  installMock({ ikyy: emptyIkyy, router: okRouter });
  try {
    const r = await callIkyy("tes jawab kosong");
    t("4a. result kosong dianggap gagal -> 9router jawab", String(r).includes("9router"), r);
    t("4b. kosong TIDAK diteruskan ke user", String(r).trim() !== "" && String(r) !== "Tidak ada jawaban.", r);
  } catch (e) {
    t("4a. result kosong dianggap gagal -> 9router jawab", false, e.message);
  }
  restoreMock();
}

// -- SECTION 5: ikyy + 9router dua-duanya mati -> error jujur --
console.log("- section 5: semua mati -> error jujur -");
{
  calls.length = 0; _resetIkyyBreakerForTest();
  const deadRouter = () => new Response(JSON.stringify({ error: "rate limited" }), { status: 429, headers: { "content-type": "application/json" } });
  installMock({ ikyy: deadIkyy, router: deadRouter });
  let threw = "";
  try { await callIkyy("tes semua mati"); } catch (e) { threw = e.message; }
  t("5a. semua mati -> throw (bukan jawab kosong)", threw.length > 0, threw);
  t("5b. pesan error jujur buat user", threw.includes("cadangan gagal") || threw.includes("gagal"), threw);
  restoreMock();
}

// -- SECTION 6: timeout terpasang di semua jalur fetch (audit statis) --
console.log("- section 6: timeout audit -");
{
  const src = fs.readFileSync(R + "/src/lib/nova-ai-service.js", "utf8");
  const getOk = /method:\s*"GET",\s*\n\s*headers:\s*\{\s*"User-Agent":\s*"Mozilla\/5\.0",\s*\.\.\.prov\.authHeader\(effectiveApiKey\)\s*\},\s*\n\s*signal:\s*AbortSignal\.timeout\(25000\)/.test(src);
  t("6a. requestOnce GET pakai AbortSignal 25 dtk", getOk);
  const postOk = /body:\s*JSON\.stringify\(finalBody\),\s*\n\s*signal:\s*AbortSignal\.timeout\(60000\)/.test(src);
  t("6b. requestOnce POST pakai AbortSignal 60 dtk", postOk);
  const retryOk = src.includes('signal: AbortSignal.timeout(25000) },');
  t("6c. retry ikyy di callAIRaw pakai AbortSignal 25 dtk", retryOk);
  const breakerOk = src.includes("IKYY_BREAKER_MS") && src.includes("_markIkyyDown()");
  t("6d. circuit breaker terpasang", breakerOk);
  const resolveOk = src.includes("resolveApiKeyForProvider(providerKey, {})");
  t("6e. callAIRaw resolve key provider saat caller tanpa key", resolveOk);
  const stripCount = (src.match(/return stripMarkdownTables\(text\)/g) || []).length;
  t("6f. jumlah return stripMarkdownTables tetap 3", stripCount === 3, stripCount);
}

console.log("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail > 0 ? 1 : 0);
