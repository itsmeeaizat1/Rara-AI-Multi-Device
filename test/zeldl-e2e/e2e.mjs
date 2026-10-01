// E2E — zeldl (.zeldl downloader zelapi) + zeldlnsfw (disabled) — offline via seam
import fs from "node:fs";
fs.rmSync(new URL("./e2e-db.json", import.meta.url), { recursive: true, force: true });
const { initDatabase } = await import("../../src/lib/rara-database.js");
await initDatabase(new URL("./e2e-db.json", import.meta.url).pathname);

const {
  zeldlDownload, ZEL_DL_KINDS, ZEL_DL_NSFW_KINDS, detectZelDlKind, collectLinks, pickDirectLink, mediaTypeOf,
  _setZelDlHttpForTest, _setZelDlKeyForTest,
} = await import("../../src/scraper/zeldl.js");
const zeldlMod = await import("../../plugins/download/zeldl.js");
const plugin = zeldlMod.default;
const nsfwMod = await import("../../plugins/nsfw/zeldlnsfw.js");
const nsfw = nsfwMod.default;
const { fromSC } = await import("../../src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra) => { w((ok ? "✅ " : "❌ ") + name + (ok ? "" : " — " + (extra || ""))); ok ? pass++ : fail++; };

function mkM(text, command, args) {
  const sends = [];
  const o = {
    args: (args || []).map(String), command, prefix: ".", text, chat: "1203630@g.us",
    replyed: [], reacts: [],
    reply: async (s) => { o.replyed.push(s); return o; },
    react: async (e) => { o.reacts.push(e); return o; },
  };
  o.sock = {
    sendMessage: async (chat, content, opts) => { sends.push({ chat, content }); return { key: { id: "x" } }; },
  };
  o.sends = sends;
  return o;
}

// ═══ 1. REGISTRY ═══
w("\n— registry —");
t("  3 kind hidup: all/spotify/scribd", Object.keys(ZEL_DL_KINDS).length === 3 && ["all","spotify","scribd"].every(k => ZEL_DL_KINDS[k]));
t("  6 kind nsfw: missav/nekopoi/eporner/kingbokep/pixhentai/tokyomotion",
  Object.keys(ZEL_DL_NSFW_KINDS).length === 6 && ["missav","nekopoi","eporner","kingbokep","pixhentai","tokyomotion"].every(k => ZEL_DL_NSFW_KINDS[k]));
t("  detect: scribd.com → scribd", detectZelDlKind("https://www.scribd.com/document/123/X") === "scribd");
t("  detect: open.spotify.com → spotify", detectZelDlKind("https://open.spotify.com/track/abc") === "spotify");
t("  detect: lainnya → all", detectZelDlKind("https://x.com/user/status/1") === "all");

// ═══ 2. SCRAPER ═══
w("\n— scraper zeldlDownload —");
_setZelDlKeyForTest("zel-e2e-key");
let lastUrl = "";
_setZelDlHttpForTest(async (u) => { lastUrl = u; return { status: 200, json: async () => ({ status: true, result: {} }) }; });
let r = await zeldlDownload("all", "https://x.com/user/status/1");
t("  url build: /download/all?url=&apikey=", r.ok && lastUrl.includes("/download/all?") && lastUrl.includes("url=") && lastUrl.includes("apikey="));
r = await zeldlDownload("scribd", "https://www.scribd.com/document/1/X");
t("  scribd path bener", r.ok && lastUrl.includes("/download/scribd?"));
r = await zeldlDownload("missav", "https://missav.ws/x");
t("  kind nsfw diterima lewat registry nsfw", r.ok && lastUrl.includes("/download/missav?"));
r = await zeldlDownload("bogus", "https://x.com/1");
t("  kind invalid → KIND_INVALID + daftar", !r.ok && /KIND_INVALID/.test(r.error) && r.error.includes("scribd") && r.error.includes("nekopoi"));
r = await zeldlDownload("all", "bukan-url");
t("  url gak valid → URL_INVALID", !r.ok && /URL_INVALID/.test(r.error));
_setZelDlKeyForTest("");
r = await zeldlDownload("all", "https://x.com/1");
t("  key kosong → API_KEY", !r.ok && r.error === "API_KEY");
_setZelDlKeyForTest("zel-e2e-key");
_setZelDlHttpForTest(async () => ({ status: 200, json: async () => ({ status: false, error: "Gagal fetch page: 404" }) }));
r = await zeldlDownload("scribd", "https://www.scribd.com/document/1/X");
t("  status:false → error asli strict", !r.ok && /404/.test(r.error));
_setZelDlHttpForTest(async () => ({ status: 401, json: async () => ({}) }));
r = await zeldlDownload("all", "https://x.com/1");
t("  401 → API_KEY_INVALID", !r.ok && /API_KEY_INVALID/.test(r.error));

// ═══ 3. LINK HELPERS ═══
w("\n— collectLinks + pickDirectLink —");
const links = collectLinks({
  result: {
    download_links: [
      "https://cdn.example.com/video.mp4",
      { url: "https://cdn.example.com/audio.mp3", quality: "128kbps" },
      "https://playback.example.com/stream/playlist.m3u8?sig=1",
      "https://cdn.example.com/video.mp4", // dup — harus ke-dedup
    ],
  },
});
t("  link string + objek kekumpul, dup ke-dedup, m3u8 ikut (buat display)", links.length === 3);
const direct = pickDirectLink(links);
t("  pickDirectLink: mp4 diutamakan, m3u8 dibuang", direct && direct.url.endsWith(".mp4"));
t("  mediaTypeOf: mp4 → video, mp3 → audio, pdf → document",
  mediaTypeOf("https://x/v.mp4") === "video" && mediaTypeOf("https://x/a.mp3") === "audio" && mediaTypeOf("https://x/d.pdf") === "document");
t("  pickDirectLink null kalau cuma m3u8", pickDirectLink([{ url: "https://x/a.m3u8", label: "" }]) === null);

// ═══ 4. PLUGIN .zeldl ═══
w("\n— plugin .zeldl —");
zeldlMod._setFetchBufferForTest(async () => Buffer.alloc(2048, 7));
_setZelDlHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, result: {
  title: "Judul Media Tes", author: "Pembuat",
  download_links: ["https://cdn.example.com/video.mp4"],
} }) }));

let m = mkM("", "zeldl", []);
await plugin.handler(m, { sock: m.sock });
t("  tanpa url → usage 3 engine", m.replyed.length === 1 && sc(m.replyed[0]).includes("3 engine hidup") && sc(m.replyed[0]).includes("zspotify") && sc(m.replyed[0]).includes("zscribd"));

m = mkM("https://x.com/user/status/1", "zeldl", ["https://x.com/user/status/1"]);
await plugin.handler(m, { sock: m.sock });
t("  generic: kartu judul + link + media terkirim",
  m.replyed.length === 1 && sc(m.replyed[0]).includes("judul media tes") && m.sends.length === 1 && m.sends[0].content?.video);
t("  react 🧠 → 🐣", m.reacts[0] === "🧠" && m.reacts.includes("🐣"));

m = mkM("https://open.spotify.com/track/abc", "zspotify", ["https://open.spotify.com/track/abc"]);
_setZelDlHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, result: {
  title: "Lagu Tes", artists: ["Penyanyi A", "Penyanyi B"], duration: "3:33", release_year: "2026",
  audio_preview: "https://p.scdn.co/preview.mp3",
} }) }));
await plugin.handler(m, { sock: m.sock });
t("  spotify: kartu + preview audio dikirim",
  m.replyed.length === 1 && sc(m.replyed[0]).includes("lagu tes") && sc(m.replyed[0]).includes("penyanyi a, penyanyi b")
  && m.sends.some((s) => s.content?.audio));

m = mkM("https://www.scribd.com/document/1/X", "zscribd", ["https://www.scribd.com/document/1/X"]);
_setZelDlHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, document: {
  title: "Dokumen Tes", author: { name: "Penulis" }, page_count: 12, language: "id",
  download: { is_available: true, formats: ["pdf", "txt"] },
} }) }));
await plugin.handler(m, { sock: m.sock });
t("  scribd: kartu dokumen + formats kebaca",
  m.replyed.length === 1 && sc(m.replyed[0]).includes("dokumen tes") && sc(m.replyed[0]).includes("pdf, txt"));

m = mkM("https://www.scribd.com/document/1/X", "zscribd", ["https://www.scribd.com/document/1/X"]);
_setZelDlHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, document: { title: "Client Challenge" } }) }));
await plugin.handler(m, { sock: m.sock });
t("  scribd ke-block → pesan Client Challenge + react ❌", m.reacts.includes("❌") && sc(m.replyed[0]).includes("client challenge"));

// m3u8 only → links card, gak ada media
m = mkM("https://soundcloud.com/x", "zeldl", ["https://soundcloud.com/x"]);
_setZelDlHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, result: {
  download_links: ["https://playback.example.com/playlist.m3u8"],
} }) }));
await plugin.handler(m, { sock: m.sock });
t("  m3u8 doang → kartu link aja tanpa media", m.replyed.length === 1 && m.sends.length === 0 && m.reacts.includes("🐣"));

// error strict endpoint
m = mkM("https://lk21.lol/x", "zeldl", ["https://lk21.lol/x"]);
_setZelDlHttpForTest(async () => ({ status: 200, json: async () => ({ status: false, error: "Request failed with status code 407" }) }));
await plugin.handler(m, { sock: m.sock });
t("  endpoint down → error asli + react ❌", m.reacts.includes("❌") && sc(m.replyed[0]).includes("407"));

// media gagal diunduh → fallback pesan
m = mkM("https://x.com/1", "zeldl", ["https://x.com/1"]);
_setZelDlHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, result: { title: "T", download_links: ["https://cdn.example.com/video.mp4"] } }) }));
zeldlMod._setFetchBufferForTest(async () => { throw new Error("unduh gagal"); });
await plugin.handler(m, { sock: m.sock });
t("  media gagal diunduh → pesan link manual", m.replyed.length === 2 && sc(m.replyed[1]).includes("link di atas masih bisa dipakai manual"));
zeldlMod._setFetchBufferForTest(async () => Buffer.alloc(2048, 7));

// ═══ 5. PLUGIN NSFW (default disabled) ═══
w("\n— plugin .zeldlnsfw —");
const ncfg = nsfw.pluginConfig;
t("  isEnabled FALSE by default (aturan owner)", ncfg.isEnabled === false);
t("  kategori nsfw + 6 alias", ncfg.category === "nsfw" && ["zmissav","znekopoi","zeporner","zkingbokep","zpixhentai","ztokyomotion"].every(a => ncfg.alias.includes(a)));
nsfwMod._setFetchBufferForTest(async () => Buffer.alloc(2048, 7));
m = mkM("", "zeldlnsfw", []);
await nsfw.handler(m, { sock: m.sock });
t("  usage → 6 engine + info nonaktif", m.replyed.length === 1 && sc(m.replyed[0]).includes("zmissav") && sc(m.replyed[0]).includes("nonaktif"));
m = mkM("https://missav.ws/x", "zmissav", ["https://missav.ws/x"]);
_setZelDlHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, result: { download_links: ["https://cdn.example.com/video.mp4"] } }) }));
await nsfw.handler(m, { sock: m.sock });
t("  alias .zmissav → kartu link + media", m.replyed.length === 1 && sc(m.replyed[0]).includes("missav") && m.sends.length === 1);

// ═══ 6. CONFIG ═══
w("\n— config .zeldl —");
const cfg = plugin.pluginConfig;
t("  kategori download, cd 15, energi 2, enabled", cfg.category === "download" && cfg.cooldown === 15 && cfg.energi === 2 && cfg.isEnabled === true);
t("  5 alias", cfg.alias.length === 5 && ["zscribd","zspotify","zalldl"].every(a => cfg.alias.includes(a)));
t("  default export { pluginConfig, handler, command }", typeof plugin.handler === "function" && plugin.command === "zeldl");

w(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exitCode = fail > 0 ? 1 : 0;
