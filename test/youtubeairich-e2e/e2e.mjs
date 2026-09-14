// E2E YOUTUBE AI RICH .youtubeairich — plugin airich ketiga.
// .youtubeairich [query] → YouTube "terbuka" di chat: hasil ASLI
// (chromium browserSearchYoutube), tap video → player interaktif.
import fs from "node:fs";
import { initDatabase } from "../../src/lib/nova-database.js";
import plugin, {
  esc, fmtViews, ytRichSearch, buildYtHtml,
  _setYtRichHttpForTest, _resetYtRichHttpForTest,
} from "../../plugins/airich/youtubeairich.js";
import { fromSC } from "../../src/lib/styler.js";

const DB = "/tmp/youtubeairich-e2e-db.json";
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
const decodePayload = (relay) => JSON.parse(Buffer.from(relay.msg.botForwardedMessage.message.richResponseMessage.unifiedResponse.data, "base64").toString("utf-8")).sections[0].view_model.primitive.payload;

// ═══ 1. esc ═══
w("\n— esc —");
t("  tag & quote di-escape",
  esc('<script>alert("x")</script>') === "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");

// ═══ 2. fmtViews ═══
w("\n— fmtViews —");
t("  1.5jt → 1,5 jt x ditonton", fmtViews(1500000) === "1,5 jt x ditonton");
t("  2jt → 2 jt (tanpa ,0)", fmtViews(2000000) === "2 jt x ditonton");
t("  250rb → 250 rb", fmtViews(250000) === "250 rb x ditonton");
t("  0/invalid → kosong", fmtViews(0) === "" && fmtViews(NaN) === "");

// ═══ 3. ytRichSearch — normalisasi + thumb + strict ═══
w("\n— ytRichSearch —");
_setYtRichHttpForTest({ search: async () => [
  { title: "Rendang Padang Asli <Enak>", author: { name: "Dapur <Minang>" }, views: 1500000, ago: "2 minggu lalu", duration: { timestamp: "3:45" }, url: "https://www.youtube.com/watch?v=abc123XYZ" },
] });
const res = await ytRichSearch("resep rendang");
t("  hasil ke-normalisasi (judul dipotong 100)", /Rendang Padang Asli/.test(res[0].title) && res[0].title.length <= 100);
t("  thumb dari videoId (?v=)", res[0].thumb === "https://i.ytimg.com/vi/abc123XYZ/hqdefault.jpg");
t("  viewsTxt format + durasi", res[0].viewsTxt === "1,5 jt x ditonton" && res[0].dur === "3:45");
_setYtRichHttpForTest({ search: async () => [] });
let sErr = "";
try { await ytRichSearch("x"); } catch (e) { sErr = e.message; }
t("  hasil kosong → throw ramah", /gak nemu video/.test(sErr));

// ═══ 4. buildYtHtml — skin ala YouTube app ═══
w("\n— buildYtHtml —");
const noQ = buildYtHtml({ query: null, results: [] });
t("  homepage tanpa query: logo + search bar + hint command",
  noQ.includes("YouTube") && noQ.includes("Ketik: .youtubeairich &lt;query&gt;") && noQ.includes("AI Rich Response"));
const withQ = buildYtHtml({ query: "resep rendang", results: res });
t("  hasil: thumb + durasi badge + judul + channel · views · ago",
  withQ.includes("i.ytimg.com/vi/abc123XYZ/hqdefault.jpg") && withQ.includes("3:45") && withQ.includes("Dapur &lt;Minang&gt;") && withQ.includes("1,5 jt x ditonton"));
t("  data internet di-escape (judul & channel)",
  withQ.includes("Rendang Padang Asli &lt;Enak&gt;") && !/<Enak>/.test(withQ));
t("  animasi ngetik: query raw escape \\u003c",
  /var full = "resep rendang"/.test(withQ) && /VIDS = \[/.test(withQ));
t("  player: halaman watch + progress bar + back + chips",
  withQ.includes('id="watch"') && withQ.includes('id="pfill"') && withQ.includes('id="back"') && withQ.includes("Subscribe"));
t("  VIDS data di-escape \\u003c biar gak bisa break </script>",
  withQ.includes("\\u003cEnak\\u003e") || !/<Enak>/.test(withQ));

// ═══ 4b. buildYtHtml tanpa videoUrl → mode simulasi ═══
w("\n— buildYtHtml tanpa video —");
const noVid = buildYtHtml({ query: "resep rendang", results: res });
t("  tanpa videoUrl → REAL=0, gak ada badge VIDEO ASLI",
  /var REAL = 0;/.test(noVid) && !noVid.includes('">VIDEO ASLI</span>'));

// ═══ 5. handler — relay + polish ═══
w("\n— handler —");
_setYtRichHttpForTest({ search: async () => [
  { title: "Rendang Padang Asli", author: { name: "Dapur Minang" }, views: 1500000, ago: "2 minggu lalu", duration: { timestamp: "3:45" }, url: "https://www.youtube.com/watch?v=abc123XYZ" },
], video: async () => "https://cdn.savetube.test/v/abc123XYZ.mp4" });
mkM.replyed.length = 0; relays.length = 0;
await plugin.handler(mkM("resep rendang"), { sock });
t("  relay 1x ke chat, payload ke-polish bottom sheet",
  relays.length === 1 && relays[0].chat === "g@test" && decodePayload(relays[0]).includes("data-nova-bottomsheet"));
t("  hasil asli dalam payload + viewport meta",
  decodePayload(relays[0]).includes("abc123XYZ") && decodePayload(relays[0]).includes("<meta name=\"viewport\""));
t("  title submessage = YouTube ▶️ <query>",
  relays[0].msg.botForwardedMessage.message.richResponseMessage.submessages[0].messageText === "YouTube ▶️ resep rendang");
t("  gak ada reply error", mkM.replyed.length === 0, JSON.stringify(mkM.replyed));

// ═══ 5b. video asli di payload ═══
w("\n— video asli —");
const pl = decodePayload(relays[0]);
t("  video asli: elemen <video> + REALSRC cdn + badge VIDEO ASLI",
  pl.includes('id="wvid"') && pl.includes("REALSRC") && pl.includes("cdn.savetube.test") && pl.includes('">VIDEO ASLI</span>'));
t("  video asli: REAL=1 (mode play beneran aktif)", /var REAL = 1;/.test(pl));

mkM.replyed.length = 0; relays.length = 0;
await plugin.handler(mkM(""), { sock });
t("  tanpa query → homepage YouTube polos di relay",
  relays.length === 1 && decodePayload(relays[0]).includes("Ketik: .youtubeairich"));

_setYtRichHttpForTest({ search: async () => [] });
mkM.replyed.length = 0; relays.length = 0;
await plugin.handler(mkM("query mati"), { sock });
t("  search gagal → relay gak jalan + error asli (fromSC)",
  relays.length === 0 && mkM.replyed.length === 1 && /buka youtube di chat: gak nemu video/.test(plain(mkM.replyed[0])));

_resetYtRichHttpForTest();

// ═══ 6. live chromium search ═══
w("\n— live YouTube search —");
try {
  const live = await ytRichSearch("resep rendang padang");
  t("  live: hasil asli YouTube ≥1 (judul + thumb + dur)",
    live.length >= 1 && live[0].title.length > 3 && /i\.ytimg\.com/.test(live[0].thumb), JSON.stringify(live[0]).slice(0, 120));
} catch (e) {
  t("  live search (skip kalau offline)", false, e.message);
}

// ═══ 7. registrasi ═══
w("\n— registrasi —");
t("  command + alias (ytairich/bukayoutube/yrich) + kategori airich",
  plugin.command === "youtubeairich" && plugin.pluginConfig.alias.includes("ytairich") && plugin.pluginConfig.alias.includes("bukayoutube") && plugin.pluginConfig.category === "airich");
t("  cd 30 / energi 2 / enabled", plugin.pluginConfig.cooldown === 30 && plugin.pluginConfig.energi === 2 && plugin.pluginConfig.isEnabled);

w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
