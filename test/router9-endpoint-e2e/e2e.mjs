// RARA AI WHATSAPP BOT — E2E: alihan endpoint 9router ke LOKAL (owner 21 Sep 2026)
// 9router bisa self-host (npm install -g 9router, 9router.com) — bot harus bisa
// dialihin ke http://localhost:20128/v1 TANPA edit kode & TANPA restart:
// satu pintu env-loader + getter di semua object literal + command .ai9v2 endpoint.
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const R = path.resolve(__dirname, "../..");

let pass = 0, fail = 0;
function t(name, cond, info) {
  if (cond) { pass++; }
  else { fail++; console.error("  \u274c " + name, info !== undefined ? JSON.stringify(info) : ""); }
}

delete process.env.TIO_API_URL;
delete process.env.ROUTER_API_URL;

const envLoader = await import(R + "/src/lib/config/env-loader.js");
const { getTioEndpoint, getTioBase, setTioEndpoint, resetTioEndpoint, _setEndpointWriterForTest } = envLoader;
const { aiHelp } = await import(R + "/src/lib/config/ai.js");
const r9 = await import(R + "/src/scraper/router9v2.js");
const { router9v2Models, _setRouter9v2HttpForTest, _setRouter9v2KeyForTest } = r9;
const ai9v2 = await import(R + "/plugins/ai/ai9v2.js");

const CLOUDKU = "https://9router.cloudku.us.kg/v1/chat/completions";
const LOKAL = "http://localhost:20128/v1/chat/completions";

// mock writer persist (JANGAN nulis apikeys.json asli di e2e)
const writes = [];
_setEndpointWriterForTest((filepath, data) => { writes.push({ filepath, data }); });

// ═══ SECTION 1: default & satu pintu ═══
console.log("\n— section 1: default endpoint —");
t("1a. default = gateway cloudku (perilaku gak berubah)", getTioEndpoint() === CLOUDKU, getTioEndpoint());
t("1b. getTioBase motong /v1/chat/completions", getTioBase() === "https://9router.cloudku.us.kg", getTioBase());
t("1c. aiHelp.apiEndpoint ikut satu pintu (getter)", aiHelp.apiEndpoint === CLOUDKU, aiHelp.apiEndpoint);

// ═══ SECTION 2: env override — gak perlu edit kode ═══
console.log("\n— section 2: env override —");
process.env.ROUTER_API_URL = LOKAL;
t("2a. env ROUTER_API_URL = endpoint lokal", getTioEndpoint() === LOKAL, getTioEndpoint());
t("2b. aiHelp.apiEndpoint (getter) IKUT lokal tanpa reload", aiHelp.apiEndpoint === LOKAL, aiHelp.apiEndpoint);
t("2c. env TIO_API_URL (lama) lebih prioritas", (() => { process.env.TIO_API_URL = "https://x.example/v1/chat/completions"; const v = getTioEndpoint(); delete process.env.TIO_API_URL; return v === "https://x.example/v1/chat/completions"; })(), getTioEndpoint());
t("2d. setelah TIO_API_URL dihapus, balik ROUTER_API_URL", getTioEndpoint() === LOKAL, getTioEndpoint());
delete process.env.ROUTER_API_URL;

// ═══ SECTION 3: scraper router9v2 baca base saat CALL ═══
console.log("\n— section 3: scraper call-time —");
{
  let capturedUrl = "";
  _setRouter9v2HttpForTest(async (cfg) => { capturedUrl = cfg.url; return { status: 200, data: { data: [{ id: "ag/gemini-3-flash" }] } }; });
  _setRouter9v2KeyForTest("sk-test");
  // default dulu
  await router9v2Models();
  t("3a. router9v2Models default nembak cloudku", capturedUrl.startsWith("https://9router.cloudku.us.kg"), capturedUrl);
  // switch runtime via setter
  const r = setTioEndpoint(LOKAL);
  t("3b. setTioEndpoint lokal OK", r.ok === true && r.endpoint === LOKAL, r);
  t("3c. getTioEndpoint ikut lokal (persist apikeys.json via field _router9v2Endpoint)", getTioEndpoint() === LOKAL, getTioEndpoint());
  await router9v2Models();
  t("3d. router9v2Models SEKARANG nembak localhost:20128 (call-time, tanpa restart)", capturedUrl.startsWith("http://localhost:20128"), capturedUrl);
  t("3e. apikeys.json ke-tulis dengan field _router9v2Endpoint", (() => {
    const w = writes[writes.length - 1];
    try { return JSON.parse(w.data)._router9v2Endpoint === LOKAL; } catch { return false; }
  })(), writes.length);
  // aiHelp getter ikut
  t("3f. aiHelp.apiEndpoint ikut lokal (getter runtime)", aiHelp.apiEndpoint === LOKAL, aiHelp.apiEndpoint);
  // validasi
  const bad = setTioEndpoint("ftp://bukan-http");
  t("3g. URL bukan http(s) DITOLAK", bad.ok === false && /http/i.test(bad.error), bad);
  t("3h. ditolak = endpoint gak berubah (masih lokal)", getTioEndpoint() === LOKAL, getTioEndpoint());
  // reset
  const rr = resetTioEndpoint();
  t("3i. resetTioEndpoint balik default cloudku", rr.ok === true && rr.endpoint === CLOUDKU, rr);
  await router9v2Models();
  t("3j. router9v2Models balik nembak cloudku", capturedUrl.startsWith("https://9router.cloudku.us.kg"), capturedUrl);
  _setRouter9v2HttpForTest(undefined); _setRouter9v2KeyForTest(undefined);
}

// ═══ SECTION 4: command .ai9v2 endpoint (plugin) ═══
console.log("\n— section 4: command .ai9v2 endpoint —");
{
  _setRouter9v2KeyForTest("sk-test");
  const mkM = (args, isOwner = true) => {
    const replies = [];
    return { m: { isOwner, args, react: async () => {}, reply: async (txt) => { replies.push(String(txt)); return txt; } }, replies };
  };

  // lihat status
  let { m, replies } = mkM(["endpoint"]);
  await ai9v2.handler(m, { sock: null, args: ["endpoint"] });
  t("4a. .ai9v2 endpoint nunjukin endpoint aktif (cloudku)", replies[0]?.toLowerCase().includes("cloudku"), replies[0]?.slice(0, 80));

  // non-owner ditolak
  ({ m, replies } = mkM(["endpoint", "lokal"], false));
  await ai9v2.handler(m, { sock: null, args: ["endpoint", "lokal"] });
  t("4b. non-owner DITOLAK (khusus owner)", /khusus owner/i.test(replies[0] || ""), replies[0]?.slice(0, 60));

  // switch ke lokal
  ({ m, replies } = mkM(["endpoint", "lokal"]));
  await ai9v2.handler(m, { sock: null, args: ["endpoint", "lokal"] });
  t("4c. .ai9v2 endpoint lokal → berhasil + persist", /berhasil/i.test(replies[0] || ""), replies[0]?.slice(0, 80));
  t("4d. endpoint aktif jadi localhost:20128", getTioEndpoint() === LOKAL, getTioEndpoint());

  // balik default
  ({ m, replies } = mkM(["endpoint", "default"]));
  await ai9v2.handler(m, { sock: null, args: ["endpoint", "default"] });
  t("4e. .ai9v2 endpoint default → balik cloudku", /default/i.test(replies[0] || "") && getTioEndpoint() === CLOUDKU, replies[0]?.slice(0, 80));

  _setRouter9v2KeyForTest(undefined);
}

_setEndpointWriterForTest(undefined);
console.log("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail > 0 ? 1 : 0);
