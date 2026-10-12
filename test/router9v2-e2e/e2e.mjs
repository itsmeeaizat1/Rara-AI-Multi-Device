// E2E 9ROUTER V2 — MODUL router9v2.js (17 Sep 2026; plugin .ai9v2 DIHAPUS
// 12 Okt 2026 karena web hosted mati — modul tetap dipakai ocode & rantai AI).
// Semua http di-mock via seam _setRouter9v2HttpForTest. STRICT SATUAN:
// key kosong / status != 200 / balas kosong → error asli keluar.
// GOTCHA LIVE: sebagian model balas SSE walau stream:false — dua-duanya dites.
import fs from "node:fs";
import { initDatabase } from "../../src/lib/rara-database.js";
import { fromSC } from "../../src/lib/styler.js";
import * as mod from "../../src/scraper/router9v2.js";

const {
  router9v2Models, router9v2Chat, router9v2Key,
  router9v2ChatSmart, router9v2Ping, ROUTER9V2_FAST_MODEL,
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
  // TypeError → di-swallow handler uncaughtException global (rara-lid.js)
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
  { id: "ag/gemini-pro-agent" }, { id: "ag/gemini-3.8-flash-high" }, { id: "ag/claude-sonnet-4-6" },
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
t("  models: 5 id ke-ekstrak", r.total === 5 && r.models[0] === "ag/gemini-pro-agent", "→ " + r.total);
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

// ═══ 2b. SMART CHAT — retry + fallback tier cepat ═══
w("\n— smart chat: retry + fallback —");
{
  // attempt-1 gagal, retry sukses → hasil model diminta, ada totalLatencyMs
  let calls = 0;
  _setRouter9v2HttpForTest(async (cfg) => {
    if (String(cfg.url).endsWith("/v1/models")) return { status: 200, data: MODELS_JSON };
    calls++;
    if (calls === 1) return { status: 503, data: "spike" };
    return { status: 200, data: CHAT_JSON };
  });
  const r = await router9v2ChatSmart({ messages: [{ role: "user", content: "x" }], model: "ag/gemini-3.8-flash-high" });
  t("  spike 503 → retry 1x sukses (model diminta tetap)",
    calls === 2 && r.text === "Siap." && !r.fallbackFrom, "calls=" + calls);
  t("  totalLatencyMs tercatat", Number.isFinite(r.totalLatencyMs) && r.totalLatencyMs >= 0);
}
{
  // 2x gagal → fallback tier cepat sukses
  let calls = 0; let seenModels = [];
  _setRouter9v2HttpForTest(async (cfg) => {
    if (String(cfg.url).endsWith("/v1/models")) return { status: 200, data: MODELS_JSON };
    calls++; seenModels.push(cfg.data.model);
    if (calls <= 2) return { status: 503, data: "down" };
    return { status: 200, data: CHAT_JSON };
  });
  const r = await router9v2ChatSmart({ messages: [{ role: "user", content: "x" }], model: "ag/gemini-3.8-flash-high" });
  t("  2x gagal → otomatis fallback tier cepat",
    calls === 3 && r.fallbackFrom === "ag/gemini-3.8-flash-high" && seenModels[2] === ROUTER9V2_FAST_MODEL,
    "calls=" + calls + " models=" + seenModels.join(","));
}
{
  // model fast sendiri gagal → error asli (tanpa fallback ke diri sendiri)
  _setRouter9v2HttpForTest(async (cfg) => ({ status: 503, data: "down" }));
  try { await router9v2ChatSmart({ messages: [{ role: "user", content: "x" }], model: ROUTER9V2_FAST_MODEL }); t("  fast gagal → error asli keluar", false); } catch (e) {
    t("  fast gagal → error asli keluar", /HTTP 503/.test(e.message), e.message);
  }
}
{
  // semua jalur gagal → error asli (strict, bukan null senyap)
  _setRouter9v2HttpForTest(async (cfg) => {
    if (String(cfg.url).endsWith("/v1/models")) return { status: 200, data: MODELS_JSON };
    return { status: 500, data: "mati total" };
  });
  try { await router9v2ChatSmart({ messages: [{ role: "user", content: "x" }], model: "ag/gemini-3.8-flash-high" }); t("  total gagal → error asli", false); } catch (e) {
    t("  total gagal → error asli", /HTTP 500/.test(e.message), e.message);
  }
}

// ═══ 2c. PING — diagnosa latency ═══
w("\n— ping —");
{
  let n = 0;
  _setRouter9v2HttpForTest(async (cfg) => { n++; return { status: 200, data: n === 1 ? MODELS_JSON : CHAT_JSON }; });
  const p = await router9v2Ping();
  t("  ping: 3 jalur diukur (models + 2 chat), 0 error",
    p.chats.length === 3 && p.errors === 0, JSON.stringify(p.chats));
  t("  ping: baris ✅ + total ms",
    p.lines.length >= 3 && p.lines[0].startsWith("✅") && p.totalMs >= 0, p.lines[0]);
}
{
  _setRouter9v2HttpForTest(async () => { throw new Error("timeout"); });
  const p = await router9v2Ping();
  t("  ping: semua down → error kehitung, gak crash",
    p.errors === 3 && p.lines.every((l) => l.startsWith("❌")), "errors=" + p.errors);
}

// ═══ 3. PREF MODEL PER CHAT ═══
w("\n— pref model per chat —");
t("  awal: null → default dipakai", getRouter9v2Pref("62812@g.us") === null);
setRouter9v2Pref("62812@g.us", "ag/claude-sonnet-4-6");
t("  set → kebaca balik", getRouter9v2Pref("62812@g.us") === "ag/claude-sonnet-4-6");
t("  persist ke file state", JSON.parse(fs.readFileSync(STATE, "utf8"))["62812@g.us"] === "ag/claude-sonnet-4-6");
setRouter9v2Pref("62812@g.us", ROUTER9V2_DEFAULT_MODEL);

// ═══ 5. LIVE (opsional, skip kalau offline) ═══
w("\n— live probe (hosted 9router) —");
_resetRouter9v2ForTest();
try {
  const live = await router9v2Models();
  t("  live /v1/models: " + live.total + " model", live.total > 10);
} catch (e) {
  // SKIP JUJUR (bukan FAIL): hosted 9router v2 lagi down / 5xx Cloudflare —
  // bukan bug kode. FAIL cuma kalau errorNYA gak jelas (bukan 5xx/network).
  const msg = String(e.message || e);
  const offline = /HTTP 5\d\d|5\d\d:|fetch failed|ECONNREFUSED|ENOTFOUND|timeout|502|503/i.test(msg);
  if (offline) {
    w("  ⏭ live models: SKIP — hosted 9router lagi down (" + msg.slice(0, 60) + ")");
  } else {
    t("  live models (skip kalau offline)", false, msg.slice(0, 80));
  }
}

w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
