// E2E 9ROUTER V2 — .ai9v2 (hosted gateway 9router.cloudku.us.kg, 17 Sep 2026)
// Semua http di-mock via seam _setRouter9v2HttpForTest. STRICT SATUAN:
// key kosong / status != 200 / balas kosong → error asli keluar.
// GOTCHA LIVE: sebagian model balas SSE walau stream:false — dua-duanya dites.
import fs from "node:fs";
import { initDatabase } from "../../src/lib/nova-database.js";
import { fromSC } from "../../src/lib/styler.js";
import * as mod from "../../src/scraper/router9v2.js";
import plug from "../../plugins/ai/ai9v2.js";

const {
  router9v2Models, router9v2Chat, router9v2Key,
  getRouter9v2Pref, setRouter9v2Pref,
  _setRouter9v2HttpForTest, _setRouter9v2KeyForTest, _resetRouter9v2ForTest,
  _setRouter9v2StateFileForTest, ROUTER9V2_DEFAULT_MODEL,
} = mod;

const sc = (s) => fromSC(String(s || "")).toLowerCase();

const DB = "/tmp/router9v2-e2e-db.json";
fs.rmSync(DB, { recursive: true, force: true });
await initDatabase(DB);
const STATE = "/tmp/router9v2-state.json";
fs.rmSync(STATE, { force: true });
_setRouter9v2StateFileForTest(STATE);

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra) => {
  w((ok ? "✅ " : "❌ ") + name + (ok ? "" : extra ? " — " + extra : ""));
  ok ? pass++ : fail++;
};

// ── mock m ──
function mkM(text, args) {
  // GOTCHA: [] itu TRUTHY → (args || text) milih array kosong → [].split
  // TypeError → di-swallow handler uncaughtException global (nova-lid.js)
  // → test MATI SENYAP exit 0.
  const argArr = Array.isArray(args) ? args : String(args || text || "").split(/\s+/).filter(Boolean);
  const o = {
    args: argArr,
    text,
    chat: "62812@g.us",
    sender: "62812@s.whatsapp.net",
    replyed: [], reacts: [],
    reply: async (s) => { o.replyed.push(s); return o; },
    react: async (e) => { o.reacts.push(e); return o; },
  };
  return o;
}

const MODELS_JSON = { data: [
  { id: "ag/gemini-3.8-flash-high" }, { id: "ag/claude-sonnet-4-6" },
  { id: "ag/gpt-oss-120b-medium" }, { id: "ag/gemini-3-flash-agent" },
] };
const CHAT_JSON = { choices: [{ message: { role: "assistant", content: "Siap." } }], model: "gemini-3.8-flash", usage: { total_tokens: 5 } };
const SSE_TEXT = [
  'data: {"id":"x","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}',
  '',
  'data: {"id":"x","choices":[{"index":0,"delta":{"content":"Halo "},"finish_reason":null}]}',
  '',
  'data: {"id":"x","choices":[{"index":0,"delta":{"content":"dari SSE!"},"finish_reason":"stop"}]}',
  '',
  'data: [DONE]',
].join("\n");

// ═══ 1. SCRAPER — key & models ═══
w("\n— scraper: key & models —");
_setRouter9v2KeyForTest("sk-e2e-9router");
t("  key kebaca dari seam", router9v2Key() === "sk-e2e-9router");
let lastCfg = null;
_setRouter9v2HttpForTest(async (cfg) => { lastCfg = cfg; return { status: 200, data: MODELS_JSON }; });
let r = await router9v2Models();
t("  models: 4 id ke-ekstrak", r.total === 4 && r.models[0] === "ag/gemini-3.8-flash-high", "→ " + r.total);
t("  URL models bener: /v1/models + Bearer key",
  lastCfg.url.endsWith("/v1/models") && lastCfg.headers.Authorization === "Bearer sk-e2e-9router");

_setRouter9v2HttpForTest(async () => ({ status: 401, data: { error: "invalid key" } }));
try { await router9v2Models(); t("  401 → error HTTP keluar (strict)", false); } catch (e) {
  t("  401 → error HTTP keluar (strict)", /HTTP 401/.test(e.message), e.message);
}
_setRouter9v2HttpForTest(async () => ({ status: 200, data: {} }));
try { await router9v2Models(); t("  data kosong → error daftar kosong", false); } catch (e) {
  t("  data kosong → error daftar kosong", /kosong/.test(e.message), e.message);
}

// ═══ 2. SCRAPER — chat JSON vs SSE ═══
w("\n— scraper: chat (JSON + fallback SSE) —");
_setRouter9v2HttpForTest(async (cfg) => { lastCfg = cfg; return { status: 200, data: CHAT_JSON }; });
r = await router9v2Chat({ messages: [{ role: "user", content: "tes" }] });
t("  JSON: text kebaca", r.text === "Siap.", "→ " + r.text);
t("  JSON: model dipakai dari response server", r.model === "gemini-3.8-flash");
t("  request kirim stream:false + default model",
  lastCfg.data.stream === false && lastCfg.data.model === ROUTER9V2_DEFAULT_MODEL, JSON.stringify(lastCfg.data).slice(0, 90));
t("  latencyMs tercatat (angka)", Number.isFinite(r.latencyMs) && r.latencyMs >= 0);

_setRouter9v2HttpForTest(async () => ({ status: 200, data: SSE_TEXT }));
r = await router9v2Chat({ messages: [{ role: "user", content: "tes" }] });
t("  SSE (server ngotot stream walau stream:false) → delta digabung",
  r.text === "Halo dari SSE!", "→ " + r.text);

_setRouter9v2HttpForTest(async () => ({ status: 500, data: "upstream error" }));
try { await router9v2Chat({ messages: [{ role: "user", content: "x" }] }); t("  500 → error HTTP", false); } catch (e) {
  t("  500 → error HTTP", /HTTP 500/.test(e.message), e.message);
}
_setRouter9v2HttpForTest(async () => ({ status: 200, data: { choices: [{ message: { content: "" } }] } }));
try { await router9v2Chat({ messages: [{ role: "user", content: "x" }] }); t("  balas kosong → error jelas", false); } catch (e) {
  t("  balas kosong → error jelas", /balas kosong/.test(e.message), e.message);
}
_setRouter9v2HttpForTest(async () => { const err = new Error("timeout"); err.code = "ECONNABORTED"; throw err; });
try { await router9v2Chat({ messages: [{ role: "user", content: "x" }] }); t("  timeout → pesan timeout khusus", false); } catch (e) {
  t("  timeout → pesan timeout khusus", /timeout/.test(e.message), e.message);
}

_setRouter9v2KeyForTest("");
try { await router9v2Chat({ messages: [{ role: "user", content: "x" }] }); t("  key kosong → error arah pusat", false); } catch (e) {
  t("  key kosong → error arah pusat", /apikeys\.json/.test(e.message), e.message);
}
_setRouter9v2KeyForTest("sk-e2e-9router");

// ═══ 3. PREF MODEL PER CHAT ═══
w("\n— pref model per chat —");
t("  awal: null → default dipakai", getRouter9v2Pref("62812@g.us") === null);
setRouter9v2Pref("62812@g.us", "ag/claude-sonnet-4-6");
t("  set → kebaca balik", getRouter9v2Pref("62812@g.us") === "ag/claude-sonnet-4-6");
t("  persist ke file state", JSON.parse(fs.readFileSync(STATE, "utf8"))["62812@g.us"] === "ag/claude-sonnet-4-6");
setRouter9v2Pref("62812@g.us", ROUTER9V2_DEFAULT_MODEL);

// ═══ 4. PLUGIN — struktur & handler ═══
w("\n— plugin ai9v2 —");
t("  default export: pluginConfig + handler", !!plug.pluginConfig?.name && typeof plug.handler === "function");
const named = await import("../../plugins/ai/ai9v2.js");
t("  NAMED export config+handler (GOTCHA loader)", !!named.config?.name && typeof named.handler === "function");
t("  alias 9routerv2 + routerv2 terdaftar",
  plug.pluginConfig.alias.includes("9routerv2") && plug.pluginConfig.alias.includes("routerv2"));

// kosong → help
let m = mkM("", []);
await plug.handler(m, { sock: {}, args: [] });
t("  tanpa pesan → box panduan",
  m.replyed.length === 1 && sc(m.replyed[0]).includes(sc("Contoh")) && m.replyed[0].includes(".ai9v2"), sc(m.replyed[0]).slice(0, 60));

// list
_setRouter9v2HttpForTest(async () => ({ status: 200, data: MODELS_JSON }));
m = mkM(".ai9v2 list", ["list"]);
await plug.handler(m, { sock: {}, args: ["list"] });
t("  list → total model + default + panah default",
  m.replyed.length === 1 && sc(m.replyed[0]).includes("4") && m.replyed[0].includes("→"), sc(m.replyed[0]).slice(0, 60));

// model gak ada
m = mkM(".ai9v2 model sukijan", ["model", "sukijan"]);
await plug.handler(m, { sock: {}, args: ["model", "sukijan"] });
t("  model nyasar → ditolak + arah .ai9v2 list",
  m.replyed.length === 1 && sc(m.replyed[0]).includes(sc("gak ada")) && m.replyed[0].includes(".ai9v2 list"));

// model valid tanpa pesan → set default
m = mkM(".ai9v2 model ag/claude-sonnet-4-6", ["model", "ag/claude-sonnet-4-6"]);
await plug.handler(m, { sock: {}, args: ["model", "ag/claude-sonnet-4-6"] });
t("  model valid → default chat diganti",
  m.replyed.length === 1 && sc(m.replyed[0]).includes("claude-sonnet-4-6") && getRouter9v2Pref("62812@g.us") === "ag/claude-sonnet-4-6");

// chat pakai default (model claude dari pref) — cek request bawa model pref
let seenModel = "";
_setRouter9v2HttpForTest(async (cfg) => { seenModel = cfg.data.model; return { status: 200, data: CHAT_JSON }; });
m = mkM("bikin pantun", ["bikin", "pantun"]);
await plug.handler(m, { sock: {}, args: ["bikin", "pantun"] });
t("  chat → jawaban + footer via 9router v2",
  m.replyed.length === 1 && m.replyed[0].includes("Siap.") && m.replyed[0].includes("— via 9router v2"), m.replyed[0]?.slice(0, 60));
t("  model pref terpakai (bukan default bot)", seenModel === "ag/claude-sonnet-4-6", "→ " + seenModel);
t("  reaksi 🧠 → 🐣", m.reacts[0] === "🧠" && m.reacts.includes("🐣"));

// model one-shot: .ai9v2 model <id> <pesan> — mock HARUS branch per-URL
// (router9v2Chat & router9v2Models dua-duanya manggil http seam yang sama)
_setRouter9v2HttpForTest(async (cfg) => {
  if (String(cfg.url).endsWith("/v1/models")) return { status: 200, data: MODELS_JSON };
  seenModel = cfg.data.model;
  return { status: 200, data: CHAT_JSON };
});
m = mkM(".ai9v2 model ag/gpt-oss-120b-medium buat pantun", ["model", "ag/gpt-oss-120b-medium", "buat", "pantun"]);
await plug.handler(m, { sock: {}, args: ["model", "ag/gpt-oss-120b-medium", "buat", "pantun"] });
t("  one-shot model <id> <pesan> → terkirim tanpa ubah default",
  m.replyed[0].includes("Siap.") && seenModel === "ag/gpt-oss-120b-medium" && getRouter9v2Pref("62812@g.us") === "ag/claude-sonnet-4-6");

// balas panjang → berantai
const LONG = Array.from({ length: 900 }, (_, i) => "baris ke-" + i).join("\n");
_setRouter9v2HttpForTest(async () => ({ status: 200, data: { choices: [{ message: { content: LONG } }], model: "gemini-3.8-flash" } }));
m = mkM("panjang", ["panjang"]);
await plug.handler(m, { sock: {}, args: ["panjang"] });
t("  jawaban >6000 char dikirim berantai (footer cuma di chunk terakhir)",
  m.replyed.length > 1 && m.replyed.at(-1).includes("— via 9router v2") && !m.replyed[0].includes("— via 9router v2"), "→ " + m.replyed.length + " chunk");

// error → box error + arah fallback .ai9
_setRouter9v2HttpForTest(async () => ({ status: 503, data: "down" }));
m = mkM("tes gagal", ["tes", "gagal"]);
await plug.handler(m, { sock: {}, args: ["tes", "gagal"] });
t("  error → box pesan + saran .ai9 list + .ai9 lama",
  m.replyed.length === 1 && sc(m.replyed[0]).includes("503") && m.replyed[0].includes(".ai9 "), sc(m.replyed[0]).slice(0, 70));
t("  reaksi error ❌", m.reacts.includes("❌"));

// key kosong → arahan set key
_setRouter9v2KeyForTest("");
m = mkM("tes", ["tes"]);
await plug.handler(m, { sock: {}, args: ["tes"] });
t("  key kosong → arah apikeys.json", m.replyed.length === 1 && m.replyed[0].includes("apikeys.json"));
_setRouter9v2KeyForTest("sk-e2e-9router");

// ═══ 5. LIVE (opsional, skip kalau offline) ═══
w("\n— live probe (hosted 9router) —");
_resetRouter9v2ForTest();
try {
  const live = await router9v2Models();
  t("  live /v1/models: " + live.total + " model", live.total > 10);
} catch (e) {
  t("  live models (skip kalau offline)", false, e.message.slice(0, 80));
}

w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
