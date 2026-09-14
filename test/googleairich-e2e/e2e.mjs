// E2E GOOGLE AI RICH .googleairich — plugin airich kedua dari NOL.
// .googleairich [query] → homepage Google di chat; ada query → hasil
// ASLI DDG di-render ala SERP (judul biru + url hijau + snippet).
import fs from "node:fs";
import { initDatabase } from "../../src/lib/nova-database.js";
import plugin, {
  esc, ddgRichSearch, buildGoogleHtml,
  _setGoogleRichHttpForTest, _resetGoogleRichHttpForTest,
} from "../../plugins/airich/googleairich.js";
import { fromSC } from "../../src/lib/styler.js";

const DB = "/tmp/googleairich-e2e-db.json";
fs.rmSync(DB, { recursive: true, force: true });
await initDatabase(DB);

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra) => {
  w((ok ? "✅ " : "❌ ") + name + (ok ? "" : extra ? " — " + extra : ""));
  ok ? pass++ : fail++;
};
const plain = (s) => fromSC(String(s || "")).toLowerCase();

const mkM = (text) => ({
  args: [], chat: "g@test", sender: "u@test", prefix: ".", text,
  reply: async (x) => { mkM.replyed.push(String(x)); },
  react: async () => true,
});
mkM.replyed = [];

const relays = [];
const sock = { relayMessage: async (chat, msg, o) => { relays.push({ chat, msg }); return {}; } };

// ── decode helper: payload HTML dari relay ──
const decodePayload = (relay) => JSON.parse(Buffer.from(relay.msg.botForwardedMessage.message.richResponseMessage.unifiedResponse.data, "base64").toString("utf-8")).sections[0].view_model.primitive.payload;

// ═══ 1. esc — escape query/hasil internet ═══
w("\n— esc —");
t("  tag & quote di-escape",
  esc('<script>alert("x")</script>') === "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");

// ═══ 2. ddgRichSearch — normalisasi + strict (parsing uddg/tag = urusan
//     browserWebSearch, udah diuji di suite searchsite-e2e) ═══
w("\n— ddgRichSearch —");
_setGoogleRichHttpForTest({ ddg: async () => [
  { title: "Resep Rendang Asli", url: "https://rendang.id/resep", snippet: "Rendang daging sapi santan kelopa, masak 4 jam. " + "x".repeat(200) },
  { title: "Cara Hitung Porsi", url: "https://plain.example.com/hitung", snippet: "Porsi per orang itu 150 gram." },
] });
const res = await ddgRichSearch("resep rendang");
t("  hasil nyampe (2 item)", res.length === 2);
t("  snippet dipotong max 160", res[0].snippet.length === 160, "len=" + res[0].snippet.length);
_setGoogleRichHttpForTest({ ddg: async () => [] });
let ddgErr = "";
try { await ddgRichSearch("x"); } catch (e) { ddgErr = e.message; }
t("  hasil kosong → throw ramah (no silent fail)", /gak nemu hasil/.test(ddgErr));

// ═══ 3. buildGoogleHtml — SERP ala google ═══
w("\n— buildGoogleHtml —");
const noQ = buildGoogleHtml({ query: null, results: [] });
t("  homepage tanpa query: logo warna + search bar + 2 tombol klasik",
  noQ.includes("class=\"g1\"") && noQ.includes("Telusuri dengan Google") && noQ.includes("Saya Merasa Beruntung") && noQ.includes("Ketik lewat command"));
const withQ = buildGoogleHtml({ query: "resep <rendang>", results: res });
t("  animasi ngetik: query raw di-escape < biar gak bisa break </scr"+"ipt>",
  /var full = "resep \\u003crendang\\u003e"/.test(withQ) && !/<rendang>/.test(withQ));
t("  hasil: url hijau + judul biru #1a0dab + snippet abu",
  withQ.includes("rendang.id/resep") && withQ.includes("Resep Rendang Asli") && withQ.includes("#1a0dab"));
t("  meta SERP 'Sekitar N hasil' + footer AI Rich",
  /Sekitar \d+ hasil \(0,42 detik\)/.test(withQ) && withQ.includes("AI Rich Response"));
t("  judul & snippet di-escape dari sumber internet",
  buildGoogleHtml({ query: "x", results: [{ title: "<b>hack</b>", url: "https://a.com/\"onerror=1", snippet: "<script>" }] }).includes("&lt;b&gt;hack&lt;/b&gt;") && !/<script>alert/.test(withQ));

// ═══ 4. handler — relay + polish otomatis ═══
w("\n— handler —");
_setGoogleRichHttpForTest({ ddg: async () => [
  { title: "Resep Rendang Asli", url: "https://rendang.id/resep", snippet: "Rendang daging sapi santan, masak 4 jam." },
] });
mkM.replyed.length = 0; relays.length = 0;
await plugin.handler(mkM("resep rendang"), { sock });
t("  relay 1x ke chat, payload ke-polish bottom sheet",
  relays.length === 1 && relays[0].chat === "g@test" && decodePayload(relays[0]).includes("data-nova-bottomsheet"));
t("  SERP asli dalam payload", decodePayload(relays[0]).includes("rendang.id/resep"));
t("  title submessage = Google 🔍 <query>",
  relays[0].msg.botForwardedMessage.message.richResponseMessage.submessages[0].messageText === "Google 🔍 resep rendang");
t("  gak ada reply error", mkM.replyed.length === 0, JSON.stringify(mkM.replyed));

// tanpa query → homepage polos
mkM.replyed.length = 0; relays.length = 0;
await plugin.handler(mkM(""), { sock });
t("  tanpa query → homepage Google polos di relay",
  relays.length === 1 && decodePayload(relays[0]).includes("Saya Merasa Beruntung") && decodePayload(relays[0]).includes("<meta name=\"viewport\""));

// error path: ddg mati → error asli via claraWrap (smallcaps!)
_setGoogleRichHttpForTest({ ddg: async () => [] });
mkM.replyed.length = 0; relays.length = 0;
await plugin.handler(mkM("query mati"), { sock });
t("  ddg gagal → relay gak jalan + error asli (fromSC)",
  relays.length === 0 && mkM.replyed.length === 1 && /buka google di chat: gak nemu hasil/.test(plain(mkM.replyed[0])));

_resetGoogleRichHttpForTest();

// ═══ 5. live DDG ═══
w("\n— live DDG —");
try {
  const live = await ddgRichSearch("nasi goreng resep");
  t("  live: hasil asli DDG ≥1 (url + judul)", live.length >= 1 && /^https?:/.test(live[0].url) && live[0].title.length > 3, JSON.stringify(live[0]).slice(0, 100));
} catch (e) {
  t("  live DDG (skip kalau offline)", false, e.message);
}

// ═══ 6. registrasi ═══
w("\n— registrasi —");
t("  command + alias (bukagoogle/grich) + kategori airich",
  plugin.command === "googleairich" && plugin.pluginConfig.alias.includes("bukagoogle") && plugin.pluginConfig.category === "airich");
t("  cd 20 / energi 2 / enabled", plugin.pluginConfig.cooldown === 20 && plugin.pluginConfig.energi === 2 && plugin.pluginConfig.isEnabled);

w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
