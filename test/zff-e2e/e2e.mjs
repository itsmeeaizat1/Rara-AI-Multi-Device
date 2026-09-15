// E2E — zff (Free Fire zelapi backup: search/profile/stats/like)
import fs from "node:fs";
fs.rmSync(new URL("./e2e-db.json", import.meta.url), { recursive: true, force: true });
const { initDatabase } = await import("../../src/lib/nova-database.js");
await initDatabase(new URL("./e2e-db.json", import.meta.url).pathname);

const {
  ffSearch, ffProfile, ffStats, ffLike, ZEL_FF_MODES, ZEL_FF_REGIONS,
  _setZelffHttpForTest, _setZelffKeyForTest,
} = await import("../../src/scraper/zelff.js");
const plugin = (await import("../../plugins/stalker/zelff.js")).default;
const { fromSC } = await import("../../src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra) => { w((ok ? "✅ " : "❌ ") + name + (ok ? "" : " — " + (extra || ""))); ok ? pass++ : fail++; };

function mkM(command, args) {
  const o = {
    args: (args || []).map(String), command, prefix: ".", chat: "1203630@g.us",
    replyed: [], reacts: [],
    reply: async (s) => { o.replyed.push(s); return o; },
    react: async (e) => { o.reacts.push(e); return o; },
    sock: { sendMessage: async () => ({ key: { id: "x" } }) },
  };
  return o;
}

// ═══ 1. REGISTRY ═══
w("\n— registry —");
t("  mode br/cs", ZEL_FF_MODES.join(",") === "br,cs");
t("  20 region ID/SG/BR/US-family", ZEL_FF_REGIONS.includes("ID") && ZEL_FF_REGIONS.includes("SG") && ZEL_FF_REGIONS.includes("BR") && ZEL_FF_REGIONS.length === 20);
const cfg = plugin.pluginConfig;
t("  config: stalker, cd 10, e1, 5 alias, enabled", cfg.category === "stalker" && cfg.cooldown === 10 && cfg.energi === 1 && cfg.alias.length === 5 && cfg.isEnabled === true);
t("  default export utuh (pluginConfig + handler + command)", typeof plugin.handler === "function" && plugin.command === "zff" && typeof plugin.pluginConfig === "object");

// ═══ 2. SCRAPER ═══
w("\n— scraper —");
_setZelffKeyForTest("zel-e2e-key");
let lastUrl = "";
_setZelffHttpForTest(async (u) => { lastUrl = u; return { status: 200, json: async () => ({ status: true, results: [] }) }; });
let r = await ffSearch("panda");
t("  ffSearch url /freefire/search?q=panda&apikey=", lastUrl.includes("/freefire/search?") && lastUrl.includes("q=panda") && lastUrl.includes("apikey="));
r = await ffSearch("panda");
t("  results kosong → PEMAIN GAK KETEMU", !r.ok && /Pemain gak ketemu/.test(r.error));
r = await ffSearch("");
t("  q kosong → QUERY_EMPTY", !r.ok && /QUERY_EMPTY/.test(r.error));
r = await ffProfile("abc");
t("  uid non-angka → UID_INVALID", !r.ok && /UID_INVALID/.test(r.error));
_setZelffHttpForTest(async (u) => { lastUrl = u; return { status: 200, json: async () => ({ status: true, data: { basicinfo: { accountid: "123", nickname: "Tes", region: "ID", level: 10, liked: 5 } } }) }; });
r = await ffProfile("12345");
t("  ffProfile url + basicinfo kebaca", lastUrl.includes("/freefire/profile?uid=12345") && r.ok && r.profile.basicinfo.nickname === "Tes");
_setZelffHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, data: { basicinfo: {} } }) }));
r = await ffProfile("12345");
t("  profile kosong (flaky) → error jelas", !r.ok && /flaky/.test(r.error));
_setZelffHttpForTest(async (u) => { lastUrl = u; return { status: 200, json: async () => ({ status: true, data: { solostats: { accountid: "12345", gamesplayed: 3, wins: 2, kills: 32, detailedstats: { damage: 1000, headshotkills: 5, highestkills: 9 } }, quadstats: { accountid: "0" } } }) }; });
r = await ffStats("12345", "br");
t("  ffStats br url + solo kebaca + quad 0 di-skip", lastUrl.includes("/freefire/stats?uid=12345&mode=br&type=0") && r.ok && r.stats.solostats.kills === 32);
r = await ffStats("12345", "xx");
t("  mode invalid → MODE_INVALID", !r.ok && /MODE_INVALID/.test(r.error));
_setZelffHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, data: { solostats: { accountid: "0" } } }) }));
r = await ffStats("12345", "br");
t("  stats semua 0 → flaky error", !r.ok && /flaky/.test(r.error));
_setZelffHttpForTest(async (u) => { lastUrl = u; return { status: 200, json: async () => ({ status: true, result: { success: true } }) }; });
r = await ffLike("5460318947", "SG");
t("  ffLike url /freefire/like?uid=&region=SG", lastUrl.includes("/freefire/like?") && lastUrl.includes("region=SG") && r.ok);
r = await ffLike("5460318947", "XX");
t("  region invalid → REGION_INVALID", !r.ok && /REGION_INVALID/.test(r.error));
_setZelffHttpForTest(async () => ({ status: 200, json: async () => ({ status: false, error: "No credentials for region ID" }) }));
r = await ffLike("5460318947", "ID");
t("  No credentials → error asli strict", !r.ok && /No credentials for region ID/.test(r.error));
_setZelffHttpForTest(async () => ({ status: 401, json: async () => ({}) }));
r = await ffProfile("12345");
t("  401 → API_KEY_INVALID", !r.ok && /API_KEY_INVALID/.test(r.error));
_setZelffKeyForTest("");
r = await ffSearch("x");
t("  key kosong → API_KEY", !r.ok && r.error === "API_KEY");
_setZelffKeyForTest("zel-e2e-key");

// ═══ 3. PLUGIN FLOW ═══
w("\n— plugin flow —");
let m = mkM("zff", []);
await plugin.handler(m, { sock: m.sock });
t("  .zff → usage 4 action", m.replyed.length === 1 && sc(m.replyed[0]).includes("search") && sc(m.replyed[0]).includes("like"));

_setZelffHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, results: [
  { accountid: "12817761", nickname: "Gacor", region: "ID", level: 9, liked: 95, lastloginat: "1553254922" },
  { accountid: "2643265123", nickname: "PANDA7", region: "US", level: 4, liked: 57, lastloginat: "1608331400" },
] }) }));
m = mkM("zffsearch", ["gacor"]);
await plugin.handler(m, { sock: m.sock });
t("  zffsearch → list nick + uid + like", m.replyed.length === 1 && sc(m.replyed[0]).includes("gacor") && sc(m.replyed[0]).includes("12817761") && sc(m.replyed[0]).includes("95"));
t("  react 🧠→🐣", m.reacts[0] === "🧠" && m.reacts.includes("🐣"));

_setZelffHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, data: { basicinfo: { accountid: "12345", nickname: "Bocil", region: "ID", level: 64, liked: 5060, lastloginat: "1789254200" }, clanbasicinfo: { clanname: "NOVA", clanlevel: 5, membernum: 12 }, profileinfo: { ismarkedstar: true } } }) }));
m = mkM("zffprofile", ["12345"]);
await plugin.handler(m, { sock: m.sock });
t("  zffprofile → nick + level + clan + marked star", m.replyed.length === 1 && sc(m.replyed[0]).includes("bocil") && sc(m.replyed[0]).includes("level 64") && sc(m.replyed[0]).includes("nova") && sc(m.replyed[0]).includes("marked star"));

_setZelffHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, data: {
  solostats: { accountid: "12345", gamesplayed: 3, wins: 2, kills: 32, detailedstats: { damage: 1000, headshotkills: 5, highestkills: 9 } },
  duostats: { accountid: "12345", gamesplayed: 10, wins: 4, kills: 50, detailedstats: {} },
  quadstats: { accountid: "12345", gamesplayed: 7, wins: 5, kills: 21, detailedstats: { knockdown: 8 } },
} }) }));
m = mkM("zffstats", ["12345", "br"]);
await plugin.handler(m, { sock: m.sock });
t("  zffstats br → solo/duo/squad semua", m.replyed.length === 1 && sc(m.replyed[0]).includes("solo") && sc(m.replyed[0]).includes("duo") && sc(m.replyed[0]).includes("squad") && sc(m.replyed[0]).includes("32"));

_setZelffHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, data: { csstats: { accountid: "12345", gamesplayed: 36, wins: 34, kills: 352, detailedstats: { mvpcount: 25, damage: 97685, headshotkills: 175 } } } }) }));
m = mkM("zffstats", ["12345", "cs"]);
await plugin.handler(m, { sock: m.sock });
t("  zffstats cs → clash squad + mvp", m.replyed.length === 1 && sc(m.replyed[0]).includes("clash squad") && sc(m.replyed[0]).includes("mvp 25"));

m = mkM("zffstats", ["12345", "xx"]);
await plugin.handler(m, { sock: m.sock });
t("  zffstats mode salah → hint br/cs + ❌", m.reacts.includes("❌") && sc(m.replyed[0]).includes("br / cs"));

_setZelffHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, result: { success: true } }) }));
m = mkM("zfflike", ["5460318947", "sg"]);
await plugin.handler(m, { sock: m.sock });
t("  zfflike sg (lowercase) → terkirim", m.replyed.length === 1 && sc(m.replyed[0]).includes("like terkirim") && sc(m.replyed[0]).includes("sg"));

_setZelffHttpForTest(async () => ({ status: 200, json: async () => ({ status: false, error: "No credentials for region ID" }) }));
m = mkM("zfflike", ["12817761", "ID"]);
await plugin.handler(m, { sock: m.sock });
t("  zfflike region tanpa kredensial → error asli", m.reacts.includes("❌") && sc(m.replyed[0]).includes("no credentials"));

w(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exitCode = fail > 0 ? 1 : 0;
