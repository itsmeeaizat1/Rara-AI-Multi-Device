// E2E — zinfo suite (zelapi /info) + zhonesty + zmaths/zpresiden (factory v3)
import fs from "node:fs";
fs.rmSync(new URL("./e2e-db.json", import.meta.url), { recursive: true, force: true });
const { initDatabase } = await import("../../src/lib/nova-database.js");
await initDatabase(new URL("./e2e-db.json", import.meta.url).pathname);

const info = await import("../../src/scraper/zelinfo.js");
const games = await import("../../src/scraper/zelgames.js");
const plugin = (await import("../../plugins/info/zinfo.js")).default;
const hon = (await import("../../plugins/fun/zhonesty.js")).default;
const factory = await import("../../src/lib/nova-game-factory.js");
const { fromSC } = await import("../../src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra) => { w((ok ? "✅ " : "❌ ") + name + (ok ? "" : " — " + (extra || ""))); ok ? pass++ : fail++; };

function mkM(command, args, text) {
  const o = {
    args: (args || []).map(String), command, prefix: ".", chat: "1203630@g.us",
    text: text, replyed: [], reacts: [],
    reply: async (s) => { o.replyed.push(s); return o; },
    react: async (e) => { o.reacts.push(e); return o; },
    sock: { sendMessage: async () => ({ key: { id: "x" } }) },
  };
  return o;
}

// ═══ 1. REGISTRY ═══
w("\n— registry —");
const cfg = plugin.pluginConfig;
t("  zinfo: 7 alias info, cd 10, e1, enabled", cfg.alias.length === 7 && cfg.cooldown === 10 && cfg.energi === 1 && cfg.isEnabled === true);
t("  zinfo default export utuh", typeof plugin.handler === "function" && plugin.command === "zinfo");
t("  zhonesty: fun, 3 alias, default utuh", hon.pluginConfig.category === "fun" && hon.pluginConfig.alias.length === 3 && typeof hon.handler === "function");
t("  factory zmaths/zpresiden ke-register", factory.games.get("zmaths") && factory.games.get("zpresiden"));
t("  zmaths plugin config (game category)", (await import("../../plugins/game/zmaths.js")).config.name === "zmaths");
t("  zpresiden plugin config (game category)", (await import("../../plugins/game/zpresiden.js")).config.name === "zpresiden");

// ═══ 2. SCRAPER zelinfo ═══
w("\n— scraper zelinfo —");
info._setZelInfoKeyForTest("zel-e2e-key");
let lastUrl = "";
info._setZelInfoHttpForTest(async (u) => { lastUrl = u; return { status: 200, json: async () => ({ status: true, data: [{ name: "Agnes AI", modelCount: 5, maxContext: "256K", modalities: ["text", "vision"] }] , total: 1 }) }; });
let r = await info.infoTokengratis();
t("  tokengratis url + list kebaca", lastUrl.includes("/info/tokengratis?") && r.ok && r.list[0].name === "Agnes AI");
info._setZelInfoHttpForTest(async (u) => { lastUrl = u; return { status: 200, json: async () => ({ status: true, result: { data: { attributes: { price: 70590, percentage: 2.74, movement: "loss", prices: [{ buy_price: 2573550, sell_price: 2488774, datetime: "08/09/26" }] } } } }) }; });
r = await info.infoGold();
t("  gold: price/movement/prices kebaca", r.ok && r.gold.price === 70590 && r.gold.movement === "loss");
info._setZelInfoHttpForTest(async (u) => { lastUrl = u; return { status: 200, json: async () => ({ status: true, data: [{ name: "Semeru", level: "Level III (Siaga)", author: "x" }] }) }; });
r = await info.infoMountain();
t("  mountain url + level kebaca", lastUrl.includes("/info/mountain?") && r.ok && r.list[0].level.includes("Siaga"));
info._setZelInfoHttpForTest(async (u) => { lastUrl = u; return { status: 200, json: async () => ({ status: true, result: { coin: "btc", price: 1368041083.19, ma5: 1372749299, ma10: 1378864075, rsi: 47.43, signal: "TURUN - TUNGGU" } }) }; });
r = await info.infoCrypto("BTC");
t("  crypto: uppercase dinormalisasi + url coin=btc", lastUrl.includes("coin=btc") && r.ok && r.crypto.signal === "TURUN - TUNGGU");
r = await info.infoCrypto("xyz");
t("  coin unsupported → COIN_INVALID", !r.ok && /COIN_INVALID/.test(r.error));
info._setZelInfoHttpForTest(async (u) => { lastUrl = u; return { status: 200, json: async () => ({ status: true, quote: { ticker: "BBRI", exchange: "IDX", symbol: "BBRI:IDX", name: "Bank Rakyat Indonesia", currency: "IDR", price: 3330, change: -70, change_percent: -2.05, previous_close: 3400 } }) }; });
r = await info.infoGfinance("bbri");
t("  gfinance: bbri → auto BBRI:IDX", lastUrl.includes("q=BBRI%3AIDX") && r.ok && r.quote.price === 3330);
info._setZelInfoHttpForTest(async () => ({ status: 500, json: async () => ({ status: false, error: 'Tidak ada ticker yang cocok' }) }));
r = await info.infoGfinance("XXX:IDX");
t("  gfinance unknown ticker → error asli strict", !r.ok && /Tidak ada ticker/.test(r.error));
info._setZelInfoHttpForTest(async (u) => { lastUrl = u; return { status: 200, json: async () => ({ status: true, route: { origin: "Jakarta", destination: "Bandung" }, couriers: [{ name: "Anteraja", services: [{ code: "Regular", description: "Paket Regular", price: "Rp 44.800", estimate: "Estimasi Tiba 2 - 4 Hari" }] }] }) }; });
r = await info.infoOngkir("jakarta", "bandung", "2");
t("  ongkir url + kurir kebaca", lastUrl.includes("/info/ongkir?") && lastUrl.includes("asal=jakarta") && r.ok && r.couriers[0].services[0].price === "Rp 44.800");
r = await info.infoOngkir("", "bandung");
t("  ongkir asal kosong → ASAL_EMPTY", !r.ok && /ASAL_EMPTY/.test(r.error));
info._setZelInfoKeyForTest("");
r = await info.infoGold();
t("  key kosong → API_KEY", !r.ok && r.error === "API_KEY");
info._setZelInfoKeyForTest("zel-e2e-key");

// ═══ 3. SCRAPER zelgames ═══
w("\n— scraper zelgames —");
games._setZelGamesKeyForTest("zel-e2e-key");
games._setZelGamesHttpForTest(async (u) => { lastUrl = u; return { status: 200, json: async () => ({ status: true, result: { question: "-12 ÷ 4 = ?", mode: "extreme", correct_answer: -3 } }) }; });
let q = await games.zelMaths();
t("  maths → {soal, jawaban, deskripsi mode}", lastUrl.includes("/games/maths?") && q.soal.includes("-12") && q.jawaban === "-3" && q.deskripsi.includes("extreme"));
games._setZelGamesHttpForTest(async (u) => { lastUrl = u; return { status: 200, json: async () => ({ status: true, question: "Siapa presiden ke-2 Indonesia?", answer: "Soeharto" }) }; });
q = await games.zelPresiden();
t("  presiden → soal+jawaban", lastUrl.includes("/games/tebakpresiden?") && q.jawaban === "Soeharto");
games._setZelGamesHttpForTest(async (u) => { lastUrl = u; return { status: 200, json: async () => ({ status: true, game: "Honesty", question: "pacaran?", user_answer: "ragu", honesty_score: 5, honesty_level: "Cukup Jujur", feedback: "Anda ragu-ragu." }) }; });
let g = await games.zelHonesty("pacaran?", "ragu");
t("  honesty ragu → skor 5", lastUrl.includes("/games/honesty?") && g.ok && g.result.honesty_score === 5);
g = await games.zelHonesty("pacaran?", "bohong");
t("  honesty jawaban invalid → ANSWER_INVALID", !g.ok && /ANSWER_INVALID/.test(g.error));
games._setZelGamesHttpForTest(async () => ({ status: 200, json: async () => ({ status: false, error: "upstream down" }) }));
try { await games.zelMaths(); t("  maths upstream down → THROW strict (fetchQuestion contract)", false); } catch (e) { t("  maths upstream down → THROW strict (fetchQuestion contract)", /upstream down/.test(e.message)); }

// ═══ 4. PLUGIN FLOW zinfo ═══
w("\n— plugin flow zinfo —");
info._setZelInfoHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, data: [
  { name: "Agnes AI", modelCount: 5, maxContext: "256K", modalities: ["text", "vision"] },
  { name: "NoTrack", modelCount: 2, freeLimit: "unlimited", modalities: ["text"] },
], total: 2 }) }));
let m = mkM("ztokengratis", []);
await plugin.handler(m, { sock: m.sock });
t("  ztokengratis → list provider + modalities", m.replyed.length === 1 && sc(m.replyed[0]).includes("agnes ai") && sc(m.replyed[0]).includes("text/vision"));

info._setZelInfoHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, result: { data: { attributes: { price: 70590, percentage: 2.74, movement: "loss", prices: [{ buy_price: 2573550, sell_price: 2488774, datetime: "15/09/26" }] } } } }) }));
m = mkM("zgold", []);
await plugin.handler(m, { sock: m.sock });
t("  zgold → LOSS 2.74% + beli/jual", sc(m.replyed[0]).includes("loss") && sc(m.replyed[0]).includes("2.74%"));

info._setZelInfoHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, data: [{ name: "Semeru", level: "Level III (Siaga)", description: "erupsi" }] }) }));
m = mkM("zgunung", []);
await plugin.handler(m, { sock: m.sock });
t("  zgunung → Semeru Siaga", sc(m.replyed[0]).includes("semeru") && sc(m.replyed[0]).includes("siaga"));

info._setZelInfoHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, result: { coin: "btc", update: "15/9/2026", price: 1368041083.19, ma5: 1372749299, ma10: 1378864075, rsi: 47.43, signal: "TURUN - TUNGGU" } }) }));
m = mkM("zcrypto", ["btc"]);
await plugin.handler(m, { sock: m.sock });
t("  zcrypto btc → rp + rsi + signal", sc(m.replyed[0]).includes("btc") && sc(m.replyed[0]).includes("rsi") && sc(m.replyed[0]).includes("turu​n".replace("\u200b","")));

info._setZelInfoHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, quote: { symbol: "BBRI:IDX", name: "Bank Rakyat Indonesia", currency: "IDR", price: 3330, change: -70, change_percent: -2.05, previous_close: 3400 } }) }));
m = mkM("zsaham", ["bbri"]);
await plugin.handler(m, { sock: m.sock });
t("  zsaham bbri → quote + minus merah", sc(m.replyed[0]).includes("bbri") && sc(m.replyed[0]).includes("3.330"));

info._setZelInfoHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, route: { origin: "Jakarta Barat", destination: "Surabaya" }, couriers: [{ name: "Anteraja", services: [{ code: "Regular", price: "Rp 44.800", estimate: "Estimasi Tiba 2 - 4 Hari" }] }] }) }));
m = mkM("zongkir", [], "jakarta | surabaya | 2");
await plugin.handler(m, { sock: m.sock });
t("  zongkir pipe → kurir + harga", sc(m.replyed[0]).includes("anteraja") && sc(m.replyed[0]).includes("44.800"));
t("  react 🧠→🐣", m.reacts[0] === "🧠" && m.reacts.includes("🐣"));

m = mkM("zongkir", [], "jakarta");
await plugin.handler(m, { sock: m.sock });
t("  zongkir tanpa pipe → hint format + ❌", m.reacts.includes("❌") && sc(m.replyed[0]).includes("asal"));

m = mkM("zinfo", []);
await plugin.handler(m, { sock: m.sock });
t("  zinfo hub → 6 fitur", m.replyed.length === 1 && sc(m.replyed[0]).includes("ztokengratis") && sc(m.replyed[0]).includes("zongkir"));

// ═══ 5. PLUGIN FLOW zhonesty ═══
w("\n— plugin flow zhonesty —");
games._setZelGamesHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, question: "udah ngerjain tugas?", user_answer: "ragu", honesty_score: 5, honesty_level: "Cukup Jujur", feedback: "Anda ragu-ragu." }) }));
m = mkM("zhonesty", [], "udah ngerjain tugas? | ragu");
await hon.handler(m, { sock: m.sock });
t("  zhonesty pipe → skor + bar + level", m.replyed.length === 1 && sc(m.replyed[0]).includes("cukup jujur") && sc(m.replyed[0]).includes("▰"));
t("  react 🧠→🐣", m.reacts[0] === "🧠" && m.reacts.includes("🐣"));

m = mkM("zhonesty", [], "udah ngerjain tugas?");
await hon.handler(m, { sock: m.sock });
t("  zhonesty tanpa pipe → usage", m.replyed.length === 1 && sc(m.replyed[0]).includes("jujur"));

m = mkM("zhonesty", [], "tes | bohong");
await hon.handler(m, { sock: m.sock });
t("  zhonesty jawaban invalid → ❌ + hint", m.reacts.includes("❌") && sc(m.replyed[0]).includes("jujur"));

w(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail > 0 ? 1 : 0);
