// E2E — zeldetail (7 endpoint zelapi kategori Details) — offline penuh via seam
import fs from "node:fs";
fs.rmSync(new URL("./e2e-db.json", import.meta.url), { recursive: true, force: true });
const { initDatabase } = await import("../../src/lib/nova-database.js");
await initDatabase(new URL("./e2e-db.json", import.meta.url).pathname);

const {
  zeldetailDetail, ZEL_DETAIL_KINDS, findZelDetailKind, detectZelDetailKind,
  resolveGmapsShortlink, resolveAppstoreId,
  _setZelDetailHttpForTest, _setZelDetailKeyForTest, _setItunesHttpForTest, _setZelShortResolverForTest,
} = await import("../../src/scraper/zeldetail.js");
const plugin = (await import("../../plugins/stalker/zeldetail.js")).default;
const { fromSC } = await import("../../src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra) => {
  if (extra !== undefined && !ok) { w((ok ? "  ✅ " : "  ❌ ") + name + " — " + extra); }
  else w((ok ? "✅ " : "❌ ") + name);
  ok ? pass++ : fail++;
};

// ── mock m ──
function mkM(text, command, args) {
  const o = {
    args: (args || []).map(String),
    command, prefix: ".", text,
    replyed: [], reacts: [],
    reply: async (s) => { o.replyed.push(s); return o; },
    react: async (e) => { o.reacts.push(e); return o; },
  };
  return o;
}

// ═══ 1. REGISTRY ═══
w("\n— registry —");
const kinds = Object.keys(ZEL_DETAIL_KINDS);
t("  7 endpoint details lengkap", kinds.length === 7 && ["appstore","gmaps","googleplay","idnlive","speedtest","whatsapp","xiaomi"].every(k => kinds.includes(k)));
t("  param benar: id untuk appstore/googleplay/speedtest, url untuk sisanya",
  ZEL_DETAIL_KINDS.appstore.param === "id" && ZEL_DETAIL_KINDS.googleplay.param === "id" && ZEL_DETAIL_KINDS.speedtest.param === "id"
  && ZEL_DETAIL_KINDS.gmaps.param === "url" && ZEL_DETAIL_KINDS.idnlive.param === "url" && ZEL_DETAIL_KINDS.whatsapp.param === "url" && ZEL_DETAIL_KINDS.xiaomi.param === "url");
t("  findZelDetailKind: exact + alias ramah", findZelDetailKind("playstore") === "googleplay" && findZelDetailKind("channel") === "whatsapp" && findZelDetailKind("maps") === "gmaps" && findZelDetailKind("bogus") === null);

// ═══ 2. DETEKSI KIND DARI URL ═══
w("\n— deteksi kind dari URL —");
t("  link apps.apple.com → appstore", detectZelDetailKind("https://apps.apple.com/id/app/whatsapp/id310633997") === "appstore");
t("  link play.google.com → googleplay", detectZelDetailKind("https://play.google.com/store/apps/details?id=com.whatsapp") === "googleplay");
t("  link google maps → gmaps", detectZelDetailKind("https://www.google.com/maps/place/Monas") === "gmaps");
t("  link idn.app → idnlive", detectZelDetailKind("https://www.idn.app/jkt48-official/live/xyz") === "idnlive");
t("  link whatsapp channel → whatsapp", detectZelDetailKind("https://whatsapp.com/channel/0029VaK8z") === "whatsapp");
t("  link mi.com → xiaomi", detectZelDetailKind("https://www.mi.com/id/product/redmi-note-14") === "xiaomi");

// ═══ 3. SCRAPER zeldetailDetail ═══
w("\n— scraper zeldetailDetail —");
_setZelDetailKeyForTest("zel-e2e-key");
let lastUrl = "";
_setZelDetailHttpForTest(async (u) => {
  lastUrl = u;
  return { status: 200, json: async () => ({ status: true, data: { title: "OK" } }) };
});
let r = await zeldetailDetail("whatsapp", "https://whatsapp.com/channel/0029VaK8z");
t("  ok → url bener /details/whatsapp?url=&apikey=",
  r.ok && lastUrl.includes("/details/whatsapp?") && lastUrl.includes("url=") && lastUrl.includes("apikey="));
r = await zeldetailDetail("appstore", "310633997");
t("  id param nempel", r.ok && lastUrl.includes("/details/appstore?") && lastUrl.includes("id=310633997"));
r = await zeldetailDetail("whatsapp", "https://whatsapp.com/channel/0029VaK8z");
t("  url ke-encode", r.ok && (() => { const q = lastUrl.split("url=")[1] || ""; return decodeURIComponent(q).includes("whatsapp.com/channel"); })());
r = await zeldetailDetail("bogus", "x");
t("  kind invalid → KIND_INVALID + daftar 7", !r.ok && /KIND_INVALID/.test(r.error) && r.error.includes("xiaomi"));
r = await zeldetailDetail("gmaps", "");
t("  value kosong → VALUE_KOSONG", !r.ok && r.error === "VALUE_KOSONG");
_setZelDetailKeyForTest("");
r = await zeldetailDetail("gmaps", "https://maps.google.com/x");
t("  key kosong → API_KEY", !r.ok && r.error === "API_KEY");
_setZelDetailKeyForTest("zel-e2e-key");
_setZelDetailHttpForTest(async () => ({ status: 200, json: async () => ({ status: false, error: "Livestream data not found" }) }));
r = await zeldetailDetail("idnlive", "https://www.idn.app/x");
t("  status:false → error asli (strict, no fallback)", !r.ok && /Livestream data not found/.test(r.error));
_setZelDetailHttpForTest(async () => ({ status: 401, json: async () => ({}) }));
r = await zeldetailDetail("gmaps", "https://maps.google.com/x");
t("  401 → API_KEY_INVALID", !r.ok && /API_KEY_INVALID/.test(r.error));
_setZelDetailHttpForTest(async () => ({ status: 429, json: async () => ({}) }));
r = await zeldetailDetail("gmaps", "https://maps.google.com/x");
t("  429 → RATE_LIMIT", !r.ok && /RATE_LIMIT/.test(r.error));

// ═══ 4. RESOLVER ═══
w("\n— resolver —");
r = await resolveAppstoreId("310633997");
t("  angka → langsung id", r.ok && r.appId === "310633997" && r.via === "id");
r = await resolveAppstoreId("https://apps.apple.com/id/app/whatsapp-messenger/id310633997");
t("  link apple → id ke-ekstrak", r.ok && r.appId === "310633997");
r = await resolveAppstoreId("https://toko-palsu.com/app");
t("  link lain → ditolak", !r.ok && /Bukan link App Store/.test(r.error));
let itunesUrl = "";
_setItunesHttpForTest(async (u) => {
  itunesUrl = u;
  return { status: 200, json: async () => ({ results: [{ trackId: 310633997, trackName: "WhatsApp Messenger" }] }) };
});
r = await resolveAppstoreId("whatsapp messenger");
t("  nama → itunes search (term nempel)", r.ok && r.appId === "310633997" && itunesUrl.includes("term=") && itunesUrl.includes("itunes.apple.com/search"));
t("  nama → trackName kebawa", r.ok && r.name === "WhatsApp Messenger");
_setItunesHttpForTest(async () => ({ status: 200, json: async () => ({ results: [] }) }));
r = await resolveAppstoreId("apptidakterkenalxyz");
t("  gak ketemu → error ramah", !r.ok && /gak ketemu/.test(r.error));
r = await resolveGmapsShortlink("https://www.google.com/maps/place/Monas");
t("  full url → pass-through", r.ok && r.url === "https://www.google.com/maps/place/Monas");
_setZelShortResolverForTest(async () => ({ url: "https://www.google.com/maps/place/Monas+Jakarta" }));
r = await resolveGmapsShortlink("https://maps.app.goo.gl/xyz");
t("  shortlink → di-expand ke full url", r.ok && r.url.includes("google.com/maps"));
_setZelShortResolverForTest(async () => ({ url: "https://bukan-maps.com/x" }));
r = await resolveGmapsShortlink("https://maps.app.goo.gl/xyz");
t("  shortlink rusak → error ramah", !r.ok && /Shortlink/.test(r.error));

// ═══ 5. PLUGIN HANDLER ═══
w("\n— plugin .zeldetail —");
_setZelDetailKeyForTest("zel-e2e-key");
_setZelDetailHttpForTest(async (u) => {
  lastUrl = u;
  return { status: 200, json: async () => ({
    status: true, source_url: "https://whatsapp.com/channel/0029VaK8z", ok: true,
    channel: { id: "0029VaK8z", name: "Nova Test Channel", handle: "@novatest", bio: "bio tes", followers: "340 followers", invite_url: "https://whatsapp.com/channel/0029VaK8z" },
  }) };
});
let m = mkM("", "zeldetail", []);
await plugin.handler(m, { sock: {} });
t("  tanpa argumen → usage 7 pencarian + cara pakai",
  m.replyed.length === 1 && sc(m.replyed[0]).includes("7 pencarian detail") && sc(m.replyed[0]).includes("zappstore") && sc(m.replyed[0]).includes("zchannel"));

m = mkM("https://whatsapp.com/channel/0029VaK8z", "zeldetail", ["https://whatsapp.com/channel/0029VaK8z"]);
await plugin.handler(m, { sock: {} });
t("  hub + link channel → auto-detect whatsapp → kartu nama channel",
  m.replyed.length === 1 && sc(m.replyed[0]).includes("nova test channel") && lastUrl.includes("/details/whatsapp?"));
t("  react 🧠 → 🐣", m.reacts[0] === "🧠" && m.reacts.includes("🐣"));

m = mkM("https://whatsapp.com/channel/0029VaK8z", "zchannel", ["https://whatsapp.com/channel/0029VaK8z"]);
await plugin.handler(m, { sock: {} });
t("  alias .zchannel → sama kayak hub", m.replyed.length === 1 && sc(m.replyed[0]).includes("nova test channel"));

m = mkM("h? bio tes", "zchannel", ["h?", "bio", "tes"]);
await plugin.handler(m, { sock: {} });
t("  .zchannel tanpa link → minta link channel", m.replyed.length === 1 && sc(m.replyed[0]).includes("link channel whatsapp"));

m = mkM("bogus apapun", "zeldetail", ["bogus", "apapun"]);
await plugin.handler(m, { sock: {} });
t("  kind gak dikenal → arahan ke usage", m.replyed.length === 1 && sc(m.replyed[0]).includes("7 pencarian"));

// appstore via nama (itunes mock)
_setItunesHttpForTest(async () => ({ status: 200, json: async () => ({ results: [{ trackId: 310633997, trackName: "WhatsApp Messenger" }] }) }));
_setZelDetailHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, data: { title: "WhatsApp Messenger", developer: "WhatsApp Inc.", rating: 4.7, total_ratings: "37", description: "deskripsi" } }) }));
m = mkM("whatsapp", "zappstore", ["whatsapp"]);
await plugin.handler(m, { sock: {} });
t("  .zappstore <nama> → resolve itunes → kartu app",
  m.replyed.length === 1 && sc(m.replyed[0]).includes("whatsapp messenger") && sc(m.replyed[0]).includes("developer"));

// googleplay package
m = mkM("com.whatsapp", "zplaystore", ["com.whatsapp"]);
await plugin.handler(m, { sock: {} });
t("  .zplaystore <package> → kartu play", m.replyed.length === 1 && sc(m.replyed[0]).includes("whatsapp messenger"));

m = mkM("whatsapp aja", "zplaystore", ["whatsapp", "aja"]);
await plugin.handler(m, { sock: {} });
t("  .zplaystore nama polos → minta package/link", m.replyed.length === 1 && sc(m.replyed[0]).includes("package"));

// idnlive domain salah
m = mkM("https://youtube.com/x", "zidnlive", ["https://youtube.com/x"]);
await plugin.handler(m, { sock: {} });
t("  .zidnlive domain salah → error", m.replyed.length === 1 && sc(m.replyed[0]).includes("idn.app"));

// strict: status false
_setZelDetailHttpForTest(async () => ({ status: 200, json: async () => ({ status: false, error: "URL harus Google Maps URL!" }) }));
m = mkM("https://youtube.com/x", "zgmaps", ["https://youtube.com/x"]);
await plugin.handler(m, { sock: {} });
t("  endpoint 200 tapi status:false → error asli + react ❌",
  m.reacts.includes("❌") && sc(m.replyed[0]).includes("url harus google maps url"));

// ═══ 6. CONFIG ═══
w("\n— config —");
const cfg = plugin.pluginConfig || plugin.config;
t("  kategori stalker, cd 10, energi 1, enabled", cfg.category === "stalker" && cfg.cooldown === 10 && cfg.energi === 1 && cfg.isEnabled === true);
t("  8 alias (7 kind + zdetail)", cfg.alias.length === 8 && ["zappstore","zchannel","zdetail"].every(a => cfg.alias.includes(a)));
t("  alias gak bentrok suite .z lama (zchatgpt dll)", !cfg.alias.includes("zchatgpt") && !cfg.alias.includes("zelai"));

w(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exitCode = fail > 0 ? 1 : 0;
