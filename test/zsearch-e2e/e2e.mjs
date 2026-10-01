// E2E — zsearch suite (zelapi /search)
import fs from "node:fs";
fs.rmSync(new URL("./e2e-db.json", import.meta.url), { recursive: true, force: true });
const { initDatabase } = await import("../../src/lib/rara-database.js");
await initDatabase(new URL("./e2e-db.json", import.meta.url).pathname);

const zs = await import("../../src/scraper/zelsearch.js");
const plugin = (await import("../../plugins/search/zsearch.js")).default;
const { fromSC } = await import("../../src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra) => { w((ok ? "✅ " : "❌ ") + name + (ok ? "" : " — " + (extra || ""))); ok ? pass++ : fail++; };

function mkM(command, args, text) {
  const o = {
    args: (args || []).map(String), command, prefix: ".", chat: "1203630@g.us",
    text: text || "", replyed: [], reacts: [],
    reply: async (s) => { o.replyed.push(s); return o; },
    react: async (e) => { o.reacts.push(e); return o; },
    sock: { sendMessage: async () => ({ key: { id: "x" } }) },
  };
  return o;
}

// ═══ 1. REGISTRY ═══
w("\n— registry —");
const cfg = plugin.pluginConfig;
t("  zsearch: 15 alias, kategori search, cd 10, e1", cfg.alias.length === 15 && cfg.category === "search" && cfg.cooldown === 10 && cfg.energi === 1);
t("  zsearch default export utuh", typeof plugin.handler === "function" && plugin.command === "zsearch");

// ═══ 2. SCRAPER ═══
w("\n— scraper —");
zs._setZelSearchKeyForTest("zel-e2e-key");
let lastUrl = "";
const mkHttp = (payload) => async (u) => { lastUrl = u; return { status: 200, json: async () => payload }; };
const mkErr = (status, payload) => async (u) => { lastUrl = u; return { status, json: async () => payload }; };

zs._setZelSearchHttpForTest(mkHttp({ status: true, total: 2, results: [{ name: "WhatsApp Business", version: "2.26", feature: "Communication", url: "https://apkmody.com/x" }, { name: "WA Mods", version: "1.0", feature: "Social", url: "https://apkmody.com/y" }] }));
let r = await zs.zsApkmody("whatsapp");
t("  apkmody url + hasil kebaca", lastUrl.includes("/search/apkmody?q=whatsapp") && r.ok && r.list[0].name === "WhatsApp Business");

zs._setZelSearchHttpForTest(mkHttp({ status: true, results: [{ id: "1", title: "Rendang Daging", prepTime: "30 menit", servings: "2 porsi", url: "https://cookpad.com/id/resep/1" }] }));
r = await zs.zsCookpad("rendang");
t("  cookpad url + prep kebaca", lastUrl.includes("/search/cookpad?q=rendang") && r.ok && r.list[0].prepTime === "30 menit");

zs._setZelSearchHttpForTest(mkHttp({ status: true, total_results: 3, results: [{ title: "Berita AI", url: "https://detik.com/x", channel: "detikInet" }] }));
r = await zs.zsDetik("ai");
t("  detik url + channel kebaca", lastUrl.includes("/search/detikcom?q=ai") && r.ok && r.list[0].channel === "detikInet");

zs._setZelSearchHttpForTest(mkHttp({ status: true, total: 1, data: [{ title: "GrayPillow on DeviantArthttps://www.deviantart.com/graypillow/art/cheese-cats-1GrayPillow", url: "https://www.deviantart.com/x", artist: "graypillow" }] }));
r = await zs.zsDeviantart("cat");
t("  deviantart: title messy DIBERSIHKIN", r.ok && r.list[0].cleanTitle === "GrayPillow" && !r.list[0].cleanTitle.includes("https"));

zs._setZelSearchHttpForTest(mkHttp({ status: true, domain: "google.com", records: { A: [{ name: "google.com.", ttl: 300, data: "142.250.x.x" }], MX: [{ data: "10 smtp.google.com.", priority: 10 }], TXT: [] } }));
r = await zs.zsDns("https://google.com/page");
t("  dns: https:// prefix ke-strip", lastUrl.includes("/search/dns?domain=google.com") && r.ok && r.records.A[0].data === "142.250.x.x");
r = await zs.zsDns("bukan-domain");
t("  dns invalid → DOMAIN_INVALID", !r.ok && /DOMAIN_INVALID/.test(r.error));

zs._setZelSearchHttpForTest(mkHttp({ status: true, total: 1, result: [{ name: "Grup Anime", code: "ABC", link: "https://chat.whatsapp.com/ABC", description: "x" }] }));
r = await zs.zsGroupwa("anime");
t("  groupwa url + link kebaca", lastUrl.includes("/search/groupwa?q=anime") && r.ok && r.list[0].link.includes("chat.whatsapp.com"));

zs._setZelSearchHttpForTest(mkHttp({ status: true, results: [{ title: "Free Naruto Twixtor Clips", views: "239,682", comments: "5", link: "https://hiitwixtor.com/x" }] }));
r = await zs.zsTwixtor("naruto");
t("  twixtor url + views kebaca", lastUrl.includes("/search/hiitwixtor?q=naruto") && r.ok && r.list[0].views === "239,682");

zs._setZelSearchHttpForTest(mkHttp({ status: true, channel: "GTV", jadwal: [{ time: "01:00WIB", title: "1001 Kisah" }, { time: "02:00WIB", title: "Ragam Cerita" }] }));
r = await zs.zsJadwalTv("gtv");
t("  jadwaltv url + jadwal kebaca", lastUrl.includes("/search/jadwaltv?channel=gtv") && r.ok && r.jadwal[0].time === "01:00WIB");

zs._setZelSearchHttpForTest(mkHttp({ status: true, result: { results: [{ id: "acode.todo", name: "TODO Highlighter", version: "1.0", downloads: "1000", rating: "5", author: "x", link: "https://acode.org/x" }] } }));
r = await zs.zsAcode("todo");
t("  acode url + rating kebaca", lastUrl.includes("/search/acode?q=todo") && r.ok && r.list[0].name === "TODO Highlighter");

r = await zs.zsApkmody("");
t("  query kosong → QUERY_EMPTY", !r.ok && /QUERY_EMPTY/.test(r.error));
zs._setZelSearchHttpForTest(mkErr(500, { status: false, message: "Request failed with status code 407" }));
r = await zs.zsCookpad("x");
t("  upstream mati → error asli strict", !r.ok && /HTTP 500/.test(r.error));
zs._setZelSearchKeyForTest("");
r = await zs.zsDetik("x");
t("  key kosong → API_KEY", !r.ok && r.error === "API_KEY");
zs._setZelSearchKeyForTest("zel-e2e-key");

// ═══ 3. PLUGIN FLOW ═══
w("\n— plugin flow —");
zs._setZelSearchHttpForTest(mkHttp({ status: true, total: 2, results: [
  { name: "WhatsApp Business", version: "2.26", feature: "Communication", url: "https://apkmody.com/x" },
  { name: "WA Mods", version: "1.0", feature: "Social", url: "https://apkmody.com/y" },
] }));
let m = mkM("zapkmody", ["whatsapp"], "whatsapp");
await plugin.handler(m, { sock: m.sock });
t("  zapkmody → list apk + url", sc(m.replyed[0]).includes("whatsapp business") && sc(m.replyed[0]).includes("apkmody.com"));
t("  react 🧠→🐣", m.reacts[0] === "🧠" && m.reacts.includes("🐣"));

zs._setZelSearchHttpForTest(mkHttp({ status: true, results: [{ title: "Rendang Daging", prepTime: "30 menit", servings: "2 porsi", url: "https://cookpad.com/id/resep/1" }] }));
m = mkM("zcookpad", ["rendang"], "rendang");
await plugin.handler(m, { sock: m.sock });
t("  zcookpad → resep + prep time", sc(m.replyed[0]).includes("rendang daging") && sc(m.replyed[0]).includes("30 menit"));

zs._setZelSearchHttpForTest(mkHttp({ status: true, total_results: 1, results: [{ title: "Berita AI Bisa Mengambil Alih Dunia", url: "https://detik.com/x", channel: "detikInet" }] }));
m = mkM("zdetik", ["ai"], "ai");
await plugin.handler(m, { sock: m.sock });
t("  zdetik → berita + channel", sc(m.replyed[0]).includes("berita ai") && sc(m.replyed[0]).includes("detikinet"));

zs._setZelSearchHttpForTest(mkHttp({ status: true, total: 1, data: [{ title: "GrayPillow on DeviantArthttps://xGrayPillow", url: "https://www.deviantart.com/x", artist: "graypillow" }] }));
m = mkM("zdeviant", ["cat"], "cat");
await plugin.handler(m, { sock: m.sock });
t("  zdeviant → title bersih + artist", sc(m.replyed[0]).includes("graypillow") && !sc(m.replyed[0]).includes("deviantarthttps"));

zs._setZelSearchHttpForTest(mkHttp({ status: true, domain: "google.com", records: { A: [{ name: "google.com.", ttl: 300, data: "142.250.4.100" }], MX: [{ data: "10 smtp.google.com.", priority: 10 }] } }));
m = mkM("zdns", ["google.com"], "google.com");
await plugin.handler(m, { sock: m.sock });
t("  zdns → records A + MX", sc(m.replyed[0]).includes("142.250.4.100") && sc(m.replyed[0]).includes("smtp.google.com"));

zs._setZelSearchHttpForTest(mkHttp({ status: true, total: 1, result: [{ name: "Grup Anime Indonesia", link: "https://chat.whatsapp.com/ABC" }] }));
m = mkM("zgroupwa", ["anime"], "anime");
await plugin.handler(m, { sock: m.sock });
t("  zgroupwa → nama grup + link chat.whatsapp.com", sc(m.replyed[0]).includes("grup anime") && sc(m.replyed[0]).includes("chat.whatsapp.com"));

zs._setZelSearchHttpForTest(mkHttp({ status: true, results: [{ title: "Free Naruto Twixtor Clips", views: "239,682", comments: "5", link: "https://hiitwixtor.com/x" }] }));
m = mkM("ztwixtor", ["naruto"], "naruto");
await plugin.handler(m, { sock: m.sock });
t("  ztwixtor → clip + views", sc(m.replyed[0]).includes("naruto twixtor") && sc(m.replyed[0]).includes("239,682"));

zs._setZelSearchHttpForTest(mkHttp({ status: true, channel: "GTV", jadwal: [{ time: "01:00WIB", title: "1001 Kisah" }, { time: "02:00WIB", title: "Ragam Cerita" }] }));
m = mkM("zjadwaltv", ["gtv"], "gtv");
await plugin.handler(m, { sock: m.sock });
t("  zjadwaltv → jadwal list + WIB rapi", sc(m.replyed[0]).includes("1001 kisah") && sc(m.replyed[0]).includes("01:00 wib"));

zs._setZelSearchHttpForTest(mkHttp({ status: true, result: { results: [{ name: "TODO Highlighter", version: "1.0", downloads: "1000", rating: "5", link: "https://acode.org/x" }] } }));
m = mkM("zacode", ["todo"], "todo");
await plugin.handler(m, { sock: m.sock });
t("  zacode → plugin + downloads", sc(m.replyed[0]).includes("todo highlighter") && sc(m.replyed[0]).includes("1000"));

m = mkM("zapkmody", [], "");
await plugin.handler(m, { sock: m.sock });
t("  query kosong → ❌ + hint", m.reacts.includes("❌") && sc(m.replyed[0]).includes("query kosong"));

m = mkM("zsearch", [], "");
await plugin.handler(m, { sock: m.sock });
t("  hub .zsearch → 9 fitur", sc(m.replyed[0]).includes("zapkmody") && sc(m.replyed[0]).includes("zjadwaltv") && sc(m.replyed[0]).includes("zacode"));

zs._setZelSearchHttpForTest(mkErr(500, { status: false, message: "Request failed with status code 407" }));
m = mkM("zdetik", ["x"], "x");
await plugin.handler(m, { sock: m.sock });
t("  upstream mati → ❌ + error asli", m.reacts.includes("❌") && sc(m.replyed[0]).includes("http 500"));

w(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail > 0 ? 1 : 0);
