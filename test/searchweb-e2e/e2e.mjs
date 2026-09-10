// E2E .googlesearch (request owner 10 Sep: nyari web — list 1..N, ketik nomor
// buka halaman → preview thumbnail + plain text isi halaman + readmore).
// Semua HTTP di-inject (offline). Reaksi 🕒→🐣 wajib.
import { initDatabase } from "../../src/lib/nova-database.js";
import { smallcapsText } from "../../src/lib/styler.js";
import { setWebSearchHttp, setPreviewHttp, resetWebSearchDeps } from "../../src/lib/nova-websearch.js";

await initDatabase("/tmp/searchweb-e2e-db.json");

// ── HTML mock ala hasil asli (bing live verified 10 Sep) ──
const BING_HTML = `<!DOCTYPE html><html><body>
<li class="b_algo"><h2><a href="https://www.facebook.com/login.php">Log into Facebook</a></h2>
<div class="b_caption"><p>Log in to Facebook to start sharing.</p></div></li>
<li class="b_algo"><h2><a href="https://bing.com/ck/a?u=a1aHR0cHM6Ly9pZC53aWtpcGVkaWEub3JnL3dpa2kvS3VjaW5n&ntb=1">Kucing - Wikipedia</a></h2>
<div class="b_caption"><p>Kucing adalah hewan mamalia karnivora.</p></div></li>
<li class="b_algo"><h2><a href="https://www.detik.com/berita">Berita detikcom</a></h2><div class="b_caption"><p>Portal berita Indonesia.</p></div></li>
</body></html>`;

const DDG_HTML = `<!DOCTYPE html><html><body><table>
<tr><td><a rel="nofollow" href="https://www.kompas.com/artikel">Artikel Kompas</a></td></tr>
<tr><td><a rel="nofollow" href="https://id.wikipedia.org/wiki/Kucing">More at <q>Wikipedia</q></a></td></tr>
</table></body></html>`;

const PAGE_HTML = `<!DOCTYPE html><html><head>
<title>Kucing - Wikipedia</title>
<meta property="og:title" content="Kucing - Wikipedia bahasa Indonesia">
<meta property="og:description" content="Kucing adalah hewan mamalia dari keluarga Felidae.">
<meta property="og:image" content="https://upload.wikimedia.org/kucing.jpg">
</head><body>
<nav>Menu Lompat ke isi</nav>
<script>var x = "noise";</script>
<h1>Kucing</h1>
<p>Kucing adalah hewan mamalia karnivora dari keluarga Felidae. Kucing domestik sering disebut kucing rumahan untuk membedakannya dengan kucing liar.</p>
<footer>© 2026</footer>
</body></html>`;

// inject: bing sukses, ddg cuma dipakai kalau bing error
setWebSearchHttp(async (url, opts = {}) => {
  const u = String(url);
  const q = decodeURIComponent((u.match(/[?&]q=([^&]+)/) || [])[1] || (opts.body || "").replace(/.*q=([^&]*).*/, "$1"));
  if (u.includes("bing.com")) {
    if (q.includes("mati")) throw new Error("HTTP 503");
    if (q.includes("kosong")) return "<html><body>tanpa hasil</body></html>";
    return BING_HTML;
  }
  // ddg lite
  if (String(url).includes("duckduckgo")) return DDG_HTML;
  throw new Error("unknown");
});
setPreviewHttp(async (url) => {
  if (url.includes("wikipedia")) return PAGE_HTML;
  if (url.includes("detik")) throw new Error("HTTP 403");
  return "<html><head><title>Biasa</title></head><body><p>Isi halaman biasa aja tanpa og.</p></body></html>";
});

const { config, handler } = await import("../../plugins/browser/search.js");

const replies = [];
const sent = [];
const reacts = [];
const buttons = [];
function mockM(args) {
  return {
    args, text: args.join(" "), prefix: ".", command: "googlesearch",
    pushName: "Tester", chat: "62899@c.us", sender: "62899",
    reply: async (t) => { replies.push(String(t)); },
    react: async (e) => { reacts.push(e); },
  };
}
const mockSock = {
  sendMessage: async (chat, payload) => { sent.push({ chat, payload }); },
  sendButton: async (chat, _, text, m, opts) => { buttons.push(opts); sent.push({ chat, payload: { text } }); },
};

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok) => { w((ok ? "  ✅" : "  ❌") + " " + name); ok ? pass++ : fail++; };

// 1. config — RENAME .googlesearch → .search (request owner 10 Sep)
check("config: nama search", config.name === "search");
check("config: alias owner (serach typo + searchweb + googlesearch backward-compat)", (config.alias || []).includes("serach") && (config.alias || []).includes("searchweb") && (config.alias || []).includes("googlesearch"));
check("config: kategori browser", config.category === "browser");

// 1b. no-arg → usage menyebut mesin engine
replies.length = 0; sent.length = 0;
await handler(mockM([]), { sock: mockSock });
check("no-arg: usage sebut engine bing/brave/duckduckgo", replies.length === 1 && replies[0].includes(smallcapsText("bing")) && replies[0].includes(smallcapsText("brave")) && replies[0].includes(smallcapsText("duckduckgo")));

// 1c. .search list → daftar mesin
replies.length = 0; sent.length = 0;
await handler(mockM(["list"]), { sock: mockSock });
check("search list: daftar mesin search", replies.length === 1 && replies[0].length > 60);

// 2. no-arg → usage guide
replies.length = 0; sent.length = 0;
await handler(mockM([]), { sock: mockSock });
check("no-arg: usage guide", replies.length === 1 && replies[0].length > 50);

// 3. search ".search bing facebook login" → list 1..N + popup tap + session
replies.length = 0; sent.length = 0; reacts.length = 0; buttons.length = 0;
await handler(mockM(["bing", "facebook", "login"]), { sock: mockSock });
const listText = String(sent[0]?.payload?.text || "");
check("search engine arg: list muncul", listText.includes("1.") && listText.includes("3."));
check("search: list nomor 1..3", listText.includes("1.") && listText.includes("3."));
check("search: judul hasil ke-list", listText.includes(smallcapsText("Log into Facebook")));
check("search: domain hasil ke-list", listText.includes(smallcapsText("facebook.com")));
check("search: popup tap single_select", buttons.length === 1 && buttons[0]?.buttons?.[0]?.name === "single_select");
const rows = buttons[0]?.buttons?.[0] ? JSON.parse(buttons[0].buttons[0].buttonParamsJson).sections[0].rows : [];
check("search: row id = command buka", rows.length === 3 && rows[1]?.id === ".search buka 2");
check("search: reaksi 🐣 terakhir", reacts[reacts.length - 1] === "🐣");

// 4. buka halaman 2 → preview thumbnail + readmore + isi plain text
replies.length = 0; sent.length = 0; reacts.length = 0;
await handler(mockM(["2"]), { sock: mockSock });
const prev = sent[0]?.payload || {};
check("buka: kirim preview text", !!prev.text);
check("buka: judul halaman", String(prev.text || "").includes("Kucing - Wikipedia"));
check("buka: link sumber", String(prev.text || "").includes("https://id.wikipedia.org/wiki/Kucing"));
check("buka: og-description ikut", String(prev.text || "").includes("hewan mamalia dari keluarga Felidae"));
check("buka: readmore sebelum isi halaman", String(prev.text || "").includes("\u200E".repeat(4001)));
check("buka: isi plain text (script & nav dibuang)", String(prev.text || "").includes("karnivora dari keluarga Felidae") && !String(prev.text || "").includes("noise"));
check("buka: banner thumbnail og:image", prev.contextInfo?.externalAdReply?.thumbnailUrl === "https://upload.wikimedia.org/kucing.jpg");
check("buka: renderLargerThumbnail true", prev.contextInfo?.externalAdReply?.renderLargerThumbnail === true);
check("buka: sourceUrl = link hasil", prev.contextInfo?.externalAdReply?.sourceUrl === "https://id.wikipedia.org/wiki/Kucing");
check("buka: reaksi 🐣 terakhir", reacts[reacts.length - 1] === "🐣");

// 5. buka 99 → nomor gak ada → error jelas
replies.length = 0; sent.length = 0;
await handler(mockM(["99"]), { sock: mockSock });
check("buka 99: nomor gak ada", replies.length === 1 && replies[0].includes("❌"));

// 6. halaman yang blok bot (detik 403) → error + link tetap dikasih
replies.length = 0; sent.length = 0;
await handler(mockM(["buka", "3"]), { sock: mockSock });
check("buka 3: halaman error → pesan + link", replies.length === 1 && replies[0].includes("❌") && replies[0].includes("detik.com"));

// 6b. engine brave dipilih → hasil brave (mock: url search.brave.com)
setWebSearchHttp(async (url, opts = {}) => {
  const u = String(url);
  if (u.includes("brave.com")) {
    return `<!DOCTYPE html><html><body>
    <a href="https://www.bravehasil.com/hp"><div class="title search-snippet-title" title="Hasil Brave HP">Hasil Brave HP</div></a>
    <a href="https://www.bravehasil.com/hp2"><div class="title search-snippet-title" title="Hasil Brave Kedua">Hasil Brave Kedua</div></a>
    </body></html>`;
  }
  throw new Error("unknown url");
});
replies.length = 0; sent.length = 0;
await handler(mockM(["brave", "hp", "terkenal"]), { sock: mockSock });
const braveText = String(sent[0]?.payload?.text || "");
check("engine brave: hasil brave ke-list", braveText.includes(smallcapsText("Hasil Brave HP")));

// 6c. engine google → auto-dialihkan bing + note
setWebSearchHttp(async (url) => {
  if (String(url).includes("bing.com")) return BING_HTML;
  throw new Error("unknown url");
});
replies.length = 0; sent.length = 0;
await handler(mockM(["google", "kucing"]), { sock: mockSock });
const gText = String(sent[0]?.payload?.text || "");
check("engine google: dialihkan bing + note", gText.includes(smallcapsText("Log into Facebook")) && gText.includes(smallcapsText("google dialihkan")));

// 6d. engine gak dikenal di args[0] → dianggap query default bing
replies.length = 0; sent.length = 0;
await handler(mockM(["facebook", "login"]), { sock: mockSock });
check("engine tak dikenal: jadi query default bing", String(sent[0]?.payload?.text || "").includes(smallcapsText("Log into Facebook")));

// 6e. engine dikenal TAPI tanpa query (".search bing" doang) → jangan dianggap engine mode
//     (args.length < 2 → jadi query "bing" → hasil list muncul, gak crash)
replies.length = 0; sent.length = 0;
await handler(mockM(["bing"]), { sock: mockSock });
check("engine tanpa query: tetep jalan sebagai query", String(sent[0]?.payload?.text || "").includes("1."));

// 7. bing mati → fallback DDG lite sukses (restore injector lengkap dulu)
setWebSearchHttp(async (url, opts = {}) => {
  const u = String(url);
  const q = decodeURIComponent((u.match(/[?&]q=([^&]+)/) || [])[1] || (opts.body || "").replace(/.*q=([^&]*).*/, "$1"));
  if (u.includes("bing.com")) {
    if (q.includes("mati")) throw new Error("HTTP 503");
    if (q.includes("kosong")) return "<html><body>tanpa hasil</body></html>";
    return BING_HTML;
  }
  if (u.includes("brave.com")) throw new Error("HTTP 429");
  if (u.includes("duckduckgo")) return DDG_HTML;
  throw new Error("unknown");
});
replies.length = 0; sent.length = 0; reacts.length = 0;
await handler(mockM(["mati"]), { sock: mockSock });
const ddgText = String(sent[0]?.payload?.text || "");
check("fallback ddg: hasil ke-list", ddgText.includes(smallcapsText("Artikel Kompas")));
check("fallback ddg: skip More at link", !ddgText.includes("More at"));

// 8. bing kosong hasil + ddg juga → error sibuk
setWebSearchHttp(async () => { throw new Error("HTTP 503"); });
replies.length = 0; sent.length = 0;
await handler(mockM(["apapun"]), { sock: mockSock });
check("semua sumber mati: pesan error", replies.length === 1 && replies[0].includes("❌"));
resetWebSearchDeps();

// 9. session kedaluwarsa → suruh cari ulang (inject: hapus manual gak bisa — pakai chat baru)
replies.length = 0; sent.length = 0;
const m9 = mockM(["2"]);
m9.chat = "62877@c.us"; // chat lain = gak ada session
await handler(m9, { sock: mockSock });
check("session beda chat: suruh cari ulang", replies.length === 1 && replies[0].includes("❌") && replies[0].includes(smallcapsText("search")));

w(`\n${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
