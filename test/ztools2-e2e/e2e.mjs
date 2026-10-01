// E2E — ztools2 (backup z-variant: zqr/zreadqr/zmorse/zkurs/zshortlink/ztinyurl/zepho/zwhatanime/zimg2prompt/zgist/zpastebin)
import fs from "node:fs";
fs.rmSync(new URL("./e2e-db.json", import.meta.url), { recursive: true, force: true });
const { initDatabase } = await import("../../src/lib/rara-database.js");
await initDatabase(new URL("./e2e-db.json", import.meta.url).pathname);

const { ZEL_EPHOTO_EFFECTS, _setZelToolsHttpForTest, _setZelToolsKeyForTest } = await import("../../src/scraper/zeltools.js");
const plugin = (await import("../../plugins/tools/ztools2.js")).default;
const { fromSC } = await import("../../src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra) => { w((ok ? "✅ " : "❌ ") + name + (ok ? "" : " — " + (extra || ""))); ok ? pass++ : fail++; };

function mkM(command, args, opts = {}) {
  const o = {
    args: (args || []).map(String), command, prefix: ".", chat: "1203630@g.us",
    quoted: opts.quoted || null, isImage: !!opts.isImage,
    replyed: [], reacts: [], sends: [],
    reply: async (s) => { o.replyed.push(s); return o; },
    react: async (e) => { o.reacts.push(e); return o; },
    download: opts.download || (async () => Buffer.alloc(2048, 7)),
  };
  o.sock = { sendMessage: async (c, x) => { o.sends.push(x); return { key: { id: "x" } }; } };
  return o;
}

// ═══ 1. CONFIG ═══
w("\n— config ztools2 —");
const cfg = plugin.pluginConfig;
t("  kategori tools, cd 15, energi 2, enabled", cfg.category === "tools" && cfg.cooldown === 15 && cfg.energi === 2 && cfg.isEnabled === true);
t("  13 alias (zqr..zpastebin)", cfg.alias.length === 13 && ["zqr","zreadqr","zmorse","zkurs","zshortlink","ztinyurl","zepho","zwhatanime","zimg2prompt","zgist","zpastebin"].every(a => cfg.alias.includes(a)));
t("  30 efek ephoto", ZEL_EPHOTO_EFFECTS.length === 30 && ZEL_EPHOTO_EFFECTS.includes("glitch") && ZEL_EPHOTO_EFFECTS.includes("lighteffects"));
t("  default export utuh", typeof plugin.handler === "function" && plugin.command === "ztools2");

// ═══ 2. FLOW ═══
w("\n— flow —");
_setZelToolsKeyForTest("zel-e2e-key");
let lastUrl = "";
_setZelToolsHttpForTest(async (u) => { lastUrl = u; return { status: 200, json: async () => ({ status: true, result: {} }) }; });

let m = mkM("ztools2", []);
await plugin.handler(m, { sock: m.sock });
t("  .ztools2 → usage 11 backup", m.replyed.length === 1 && sc(m.replyed[0]).includes("backup") && sc(m.replyed[0]).includes("zqr") && sc(m.replyed[0]).includes("zpastebin"));

// zqr — binary png
_setZelToolsHttpForTest(async (u) => { lastUrl = u; return { status: 200, headers: { "content-type": "image/png" }, json: async () => { throw new Error("bukan json"); }, arrayBuffer: async () => new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4, 5, 6]).buffer }; });
m = mkM("zqr", ["halo", "dari", "rara"]);
await plugin.handler(m, { sock: m.sock });
t("  zqr → /tools/text2qr?text= + image terkirim", lastUrl.includes("/tools/text2qr?") && lastUrl.includes("text=") && m.sends.length === 1 && m.sends[0].image);

// zreadqr — reply image → uguu → qr2text
_setZelToolsHttpForTest(async (u) => { lastUrl = u; return { status: 200, json: async () => ({ status: true, data: { text: "halo-rara" } }) }; });
m = mkM("zreadqr", [], { quoted: { isImage: true, download: async () => Buffer.alloc(2048, 7) } });
await plugin.handler(m, { sock: m.sock });
t("  zreadqr reply foto → decode teks", lastUrl.includes("/tools/qr2text?") && lastUrl.includes("uguu") && m.replyed.length === 1 && sc(m.replyed[0]).includes("halo-rara"));

// zreadqr tanpa gambar → petunjuk
m = mkM("zreadqr", []);
await plugin.handler(m, { sock: m.sock });
t("  zreadqr tanpa reply → petunjuk + ❌", m.reacts.includes("❌") && sc(m.replyed[0]).includes("reply gambar qr"));

// zmorse
_setZelToolsHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, text: "halo", morse: "•••• •- •-•• ---", chart: "• H = ••••" }) }));
m = mkM("zmorse", ["halo"]);
await plugin.handler(m, { sock: m.sock });
t("  zmorse → kode + chart", m.replyed.length === 1 && sc(m.replyed[0]).includes("••••") && m.reacts.includes("🐣"));

// zkurs
_setZelToolsHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, message: "5 USD = 88300 IDR", originalAmount: 5, convertedAmount: 88300, rate: 17660, date: "2026-09-14" }) }));
m = mkM("zkurs", ["5"]);
await plugin.handler(m, { sock: m.sock });
t("  zkurs → 5 USD = 88300 IDR + rate", m.replyed.length === 1 && sc(m.replyed[0]).includes("88300") && sc(m.replyed[0]).includes("17.660"));

// zshortlink + TTL
_setZelToolsHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, result: "https://cdn.zelapi.eu.cc/r/o2IJ7R", expired_at: "2 jam (TTL)" }) }));
m = mkM("zshortlink", ["https://example.com/panjang"]);
await plugin.handler(m, { sock: m.sock });
t("  zshortlink → link pendek + TTL", m.replyed.length === 1 && sc(m.replyed[0]).includes("cdn.zelapi.eu.cc") && sc(m.replyed[0]).includes("2 jam"));

// ztinyurl
_setZelToolsHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, result: "https://tinyurl.com/2d8kuapy" }) }));
m = mkM("ztinyurl", ["https://example.com/panjang"]);
await plugin.handler(m, { sock: m.sock });
t("  ztinyurl → link", m.replyed.length === 1 && sc(m.replyed[0]).includes("tinyurl.com"));

// zepho list
m = mkM("zepho", ["list"]);
await plugin.handler(m, { sock: m.sock });
t("  zepho list → 30 efek", m.replyed.length === 1 && sc(m.replyed[0]).includes("30 efek") && sc(m.replyed[0]).includes("blackpinkstyle"));

// zepho efek valid → image
_setZelToolsHttpForTest(async (u) => { lastUrl = u; return { status: 200, json: async () => ({ status: true, result: "https://e2.yotools.net/images/hasil.jpg" }) }; });
// mock fetchImg via global? — fetchImg pakai fetch asli; uguu/yotools gak bisa. Seam: skip fetch — cek url build aja via ephoto error path:
m = mkM("zepho", ["glitch", "RARA"]);
try { await plugin.handler(m, { sock: m.sock }); } catch {}
const lu = decodeURIComponent(lastUrl).toLowerCase();
t("  zepho → /tools/ephoto?effect=glitch&text=RARA", lu.includes("/tools/ephoto?") && lu.includes("effect=glitch") && lu.includes("text=rara"));

// zepho efek invalid → EFFECT_INVALID
m = mkM("zepho", ["bogus", "x"]);
await plugin.handler(m, { sock: m.sock });
t("  zepho efek bogus → hint .zepho list + ❌", m.reacts.includes("❌") && sc(m.replyed[0]).includes("effect_invalid"));

// zwhatanime
_setZelToolsHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, result: { results: [
  { anilist: { id: 21407, title: { romaji: "Yowamushi Pedal" } }, episode: 3, similarity: 0.87 },
] } }) }));
m = mkM("zwhatanime", [], { quoted: { isImage: true, download: async () => Buffer.alloc(2048, 7) } });
await plugin.handler(m, { sock: m.sock });
t("  zwhatanime → judul + ep + % cocok", m.replyed.length === 1 && sc(m.replyed[0]).includes("yowamushi pedal") && sc(m.replyed[0]).includes("ep 3") && sc(m.replyed[0]).includes("87%"));

// zimg2prompt
_setZelToolsHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, result: { prompt: "A minimalist QR code rendered in black and white" } }) }));
m = mkM("zimg2prompt", [], { quoted: { isImage: true, download: async () => Buffer.alloc(2048, 7) } });
await plugin.handler(m, { sock: m.sock });
t("  zimg2prompt → prompt kebaca", m.replyed.length === 1 && sc(m.replyed[0]).includes("minimalist qr code"));

// zgist multi-file
_setZelToolsHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, gist_id: "abc", files: { "a.sh": "echo 1", "b.py": "print(2)" } }) }));
m = mkM("zgist", ["https://gist.github.com/x/abc"]);
await plugin.handler(m, { sock: m.sock });
t("  zgist → 2 file + isi inline", m.replyed.length === 1 && sc(m.replyed[0]).includes("2 file") && sc(m.replyed[0]).includes("echo 1"));

// zgist konten gede → document
_setZelToolsHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, files: { "big.txt": "x".repeat(5000) } }) }));
m = mkM("zgist", ["https://gist.github.com/x/big"]);
await plugin.handler(m, { sock: m.sock });
t("  zgist gede → kartu + document .txt", m.replyed.length === 1 && m.sends.length === 1 && m.sends[0].document && m.sends[0].fileName === "big.txt");

// zpastebin plain content
_setZelToolsHttpForTest(async () => ({ status: 200, json: async () => ({ status: true, content: "isi paste pendek" }) }));
m = mkM("zpastebin", ["https://pastebin.com/abc12345"]);
await plugin.handler(m, { sock: m.sock });
t("  zpastebin → isi inline", m.replyed.length === 1 && sc(m.replyed[0]).includes("isi paste pendek"));

// error strict
_setZelToolsHttpForTest(async () => ({ status: 200, json: async () => ({ status: false, message: "Gagal mendapatkan hasil terjemahan" }) }));
m = mkM("zkurs", ["1"]);
await plugin.handler(m, { sock: m.sock });
t("  endpoint down → error asli + ❌", m.reacts.includes("❌") && sc(m.replyed[0]).includes("gagal mendapatkan"));

w(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exitCode = fail > 0 ? 1 : 0;
