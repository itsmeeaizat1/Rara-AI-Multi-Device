// E2E — ztools (.zcode/.zobfuscate/.zconvert/.zdomain/.zsource/.zwebtest) — offline via seam
import fs from "node:fs";
fs.rmSync(new URL("./e2e-db.json", import.meta.url), { recursive: true, force: true });
const { initDatabase } = await import("../../src/lib/nova-database.js");
await initDatabase(new URL("./e2e-db.json", import.meta.url).pathname);

const {
  zelToolCall, ZEL_TOOLS_KINDS, ZEL_CONVERT_TYPES,
  _setZelToolsHttpForTest, _setZelToolsKeyForTest,
} = await import("../../src/scraper/zeltools.js");
const plugin = (await import("../../plugins/tools/ztools.js")).default;
const { fromSC } = await import("../../src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra) => { w((ok ? "✅ " : "❌ ") + name + (ok ? "" : " — " + (extra || ""))); ok ? pass++ : fail++; };

function mkM(command, args, quoted) {
  const o = {
    args: (args || []).map(String), command, prefix: ".", chat: "1203630@g.us",
    quoted, replyed: [], reacts: [], sends: [],
    reply: async (s) => { o.replyed.push(s); return o; },
    react: async (e) => { o.reacts.push(e); return o; },
  };
  o.sock = { sendMessage: async (c, x) => { o.sends.push(x); return { key: { id: "x" } }; } };
  return o;
}

// ═══ 1. REGISTRY ═══
w("\n— registry —");
const NEW_KINDS = ["qr","readqr","morse","kurs","shortlink","tinyurl","ephoto","whatanime","img2prompt","gist","pastebin"];
t("  17 kind: 6 tools + 11 backup z-variant",
  Object.keys(ZEL_TOOLS_KINDS).length === 17 && ["code","obfuscate","convert","domain","source","webtest"].every(k => ZEL_TOOLS_KINDS[k]) && NEW_KINDS.every(k => ZEL_TOOLS_KINDS[k]));
t("  kind qr binary flag", ZEL_TOOLS_KINDS.qr.binary === true);
t("  convert cuma toesm/tocjs", ZEL_CONVERT_TYPES.join(",") === "toesm,tocjs");
t("  config: kategori tools, cd 15, energi 2, 8 alias, enabled",
  plugin.pluginConfig.category === "tools" && plugin.pluginConfig.cooldown === 15 && plugin.pluginConfig.energi === 2
  && plugin.pluginConfig.alias.length === 8 && plugin.pluginConfig.isEnabled === true);
t("  default export utuh", typeof plugin.handler === "function" && plugin.command === "ztools");

// ═══ 2. SCRAPER ═══
w("\n— scraper zelToolCall —");
_setZelToolsKeyForTest("zel-e2e-key");
let lastUrl = "";
_setZelToolsHttpForTest(async (u) => { lastUrl = u; return { status: 200, json: async () => ({ status: true, result: {} }) }; });
let r = await zelToolCall("code", { code: "console.log(1)" });
t("  url build: /tools/coderunner?apikey=&code=", r.ok && lastUrl.includes("/tools/coderunner?") && lastUrl.includes("code=") && lastUrl.includes("apikey="));
r = await zelToolCall("webtest", { url: "https://x.com", device: "mobile" });
t("  webtest: /tools/debugbear + device=mobile", r.ok && lastUrl.includes("/tools/debugbear?") && lastUrl.includes("device=mobile"));
r = await zelToolCall("bogus", {});
t("  kind invalid → KIND_INVALID + daftar", !r.ok && /KIND_INVALID/.test(r.error) && r.error.includes("webtest"));
r = await zelToolCall("code", {});
t("  kode kosong → CODE_EMPTY", !r.ok && /CODE_EMPTY/.test(r.error));
r = await zelToolCall("convert", { code: "x=1", type: "bogus" });
t("  type invalid → TYPE_INVALID toesm/tocjs", !r.ok && /TYPE_INVALID/.test(r.error) && r.error.includes("tocjs"));
r = await zelToolCall("source", { url: "bukan-link" });
t("  url gak valid → URL_INVALID", !r.ok && /URL_INVALID/.test(r.error));
r = await zelToolCall("domain", { q: "" });
t("  q kosong → QUERY_EMPTY", !r.ok && /QUERY_EMPTY/.test(r.error));
_setZelToolsKeyForTest("");
r = await zelToolCall("domain", { q: "x.com" });
t("  key kosong → API_KEY", !r.ok && r.error === "API_KEY");
_setZelToolsKeyForTest("zel-e2e-key");
_setZelToolsHttpForTest(async () => ({ status: 200, json: async () => ({ status: false, error: "Request failed with status code 403" }) }));
r = await zelToolCall("domain", { q: "x.com" });
t("  status:false → error asli strict", !r.ok && /403/.test(r.error));
_setZelToolsHttpForTest(async () => ({ status: 401, json: async () => ({}) }));
r = await zelToolCall("domain", { q: "x.com" });
t("  401 → API_KEY_INVALID", !r.ok && /API_KEY_INVALID/.test(r.error));

// ═══ 3. PLUGIN FLOW ═══
w("\n— plugin .ztools —");
_setZelToolsHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, result: {
  success: true,
  output: [{ type: "log", text: "4" }, { type: "error", text: "Error: boom" }],
  executionTime: 12,
  __debug: { nodeVersion: "v24.14.1" },
} }) }));

let m = mkM("ztools", []);
await plugin.handler(m, { sock: m.sock });
t("  .ztools → usage 6 tool", m.replyed.length === 1 && sc(m.replyed[0]).includes("6 tool hidup") && sc(m.replyed[0]).includes("zwebtest") && sc(m.replyed[0]).includes("zcode"));

m = mkM("zcode", ["console.log(2+2)"]);
await plugin.handler(m, { sock: m.sock });
t("  zcode: output log + error + waktu + node",
  m.replyed.length === 1 && sc(m.replyed[0]).includes("4") && sc(m.replyed[0]).includes("boom") && sc(m.replyed[0]).includes("12ms") && sc(m.replyed[0]).includes("v24"));
t("  react 🧠→🐣", m.reacts[0] === "🧠" && m.reacts.includes("🐣"));

// reply pesan kode
m = mkM("zcode", [], { text: "console.log('dari reply')" });
await plugin.handler(m, { sock: m.sock });
t("  zcode reply pesan kode kebaca", m.replyed.length === 1);

m = mkM("zcode", []);
await plugin.handler(m, { sock: m.sock });
t("  zcode tanpa kode → pesan CODE_EMPTY + react ❌", m.reacts.includes("❌") && sc(m.replyed[0]).includes("code_empty"));

// obfuscate pendek → inline code block
_setZelToolsHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, result: "function _0x1(){const a=['x'];return a}" }) }));
m = mkM("zobfuscate", ["const x=1"]);
await plugin.handler(m, { sock: m.sock });
t("  zobfuscate pendek → inline", m.replyed.length === 1 && sc(m.replyed[0]).includes("_0x1"));

// obfuscate panjang → document
_setZelToolsHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, result: "x".repeat(5000) }) }));
m = mkM("zobfuscate", ["const y=2"]);
await plugin.handler(m, { sock: m.sock });
t("  zobfuscate panjang → document .js", m.sends.length === 1 && m.sends[0].document && m.sends[0].fileName === "obfuscated.js");

// convert
_setZelToolsHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, result: "module.exports = x;" }) }));
m = mkM("zconvert", ["tocjs", "export const x=1"]);
await plugin.handler(m, { sock: m.sock });
t("  zconvert tocjs → output convert", m.replyed.length === 1 && sc(m.replyed[0]).includes("module.exports"));
m = mkM("zconvert", ["bogus", "x=1"]);
await plugin.handler(m, { sock: m.sock });
t("  zconvert type salah → hint toesm|tocjs", sc(m.replyed[0]).includes("toesm"));

// domain
_setZelToolsHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, domain: "base44.com", ip: "172.66.161.188", type: "IPv4", org: "Cloudflare, Inc.", city: "San Francisco", region: "California", country: "United States", asn: 13335, timezone: { id: "America/Los_Angeles", utc: "-07:00" }, location_url: "https://maps" }) }));
m = mkM("zdomain", ["base44.com"]);
await plugin.handler(m, { sock: m.sock });
t("  zdomain → kartu IP/org/lokasi/ASN",
  m.replyed.length === 1 && sc(m.replyed[0]).includes("base44.com") && sc(m.replyed[0]).includes("172.66") && sc(m.replyed[0]).includes("asn 13335"));

// source
_setZelToolsHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, ok: true, title: "Example Domain", url: "https://example.com/", html: "<html><body>" + "x".repeat(600) + "</body></html>" }) }));
m = mkM("zsource", ["https://example.com"]);
await plugin.handler(m, { sock: m.sock });
t("  zsource → kartu + document .html", m.replyed.length === 1 && sc(m.replyed[0]).includes("example domain") && m.sends.length === 1 && m.sends[0].fileName.endsWith(".html"));

// webtest sukses
const webtestMock = {
  status: "completed", creator: "Hazel", url: "https://example.com", device: "mobile",
  result: { result: { resultJson: {
    meta: { formFactor: "mobile", region: "us-east1" },
    perfSummary: { docTiming: { dns: 69, tcp: 82, ssl: 92, ttfb: 87, duration: 335 }, requestMetrics: { requestCount: 2, totalEncodedBodyLength: 473 } },
    lhData: { performanceMetrics: { firstContentfulPaint: 416 } },
    lcps: [{ loadTime: 456, startTime: 456 }],
  } } },
};
_setZelToolsHttpForTest(async () => ({ status: 200, json: async () => webtestMock }));
m = mkM("zwebtest", ["https://example.com", "mobile"]);
await plugin.handler(m, { sock: m.sock });
t("  zwebtest → metrik DNS/TTFB/FCP/LCP/requests",
  m.replyed.length === 1 && sc(m.replyed[0]).includes("dns 69ms") && sc(m.replyed[0]).includes("ttfb 87ms") && sc(m.replyed[0]).includes("fcp 416ms") && sc(m.replyed[0]).includes("lcp 456ms") && sc(m.replyed[0]).includes("2 request"));

// webtest gagal (resultJson kosong)
_setZelToolsHttpForTest(async () => ({ status: 200, json: async () => ({ status: "failed", result: { result: {} } }) }));
m = mkM("zwebtest", ["https://x.com"]);
await plugin.handler(m, { sock: m.sock });
t("  zwebtest gagal → pesan tes gagal + ❌", m.reacts.includes("❌") && sc(m.replyed[0]).includes("tes gagal"));

w(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exitCode = fail > 0 ? 1 : 0;
