// E2E Shopping Spy AI (ide fitur no 6, 12 Sep 2026).
// Deps vision/AI/search di-inject via seam — gak nyamber AI/search live.
import path from "node:path";
import fs from "node:fs";

const out = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) { pass++; out("✅ " + label); }
  else { fail++; out("❌ " + label + (extra ? " — " + extra : "")); }
}
const norm = (s) => String(s || "").toLowerCase();

const R = path.resolve(".");
fs.rmSync("/tmp/spy-e2e-db", { recursive: true, force: true });
const { initDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase("/tmp/spy-e2e-db/rara.json");

const { config, handler, parseJson, parseVerdict, _setSpyDepsForTest } = await import(R + "/plugins/ai/spybelanja.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const low = (s) => fromSC(norm(s));

t("1a. plugin spybelanja kategori ai", config.name === "spybelanja" && config.category === "ai" && config.alias.includes("shopspy"));

// ═══ 2. parser unit ═══
out("\n— parser —");
const pj = parseJson('```json\n{"produk":"Redmi Note 13 128GB","harga":149000,"toko":"Mi Official Store","rating":4.9,"ulasan":1200,"catatan":"gratis ongkir"}\n```');
t("2a. parse produk foto + code fence", pj && pj.produk === "Redmi Note 13 128GB" && pj.harga === 149000 && pj.rating === 4.9 && pj.ulasan === 1200);
t("2b. BUKAN_PRODUK → null", parseJson('{"produk":"BUKAN_PRODUK"}') === null);
const pv = parseVerdict('teks ngambang {"hargaMin":140000,"hargaMax":160000,"verdict":"worth it","analisis":"Harga 149rb di tengah range pasar.","tips":"Pakai voucher gratis ongkir.","alternatif":"tidak ada, produk ini udah oke"}');
t("2c. parse verdict robust + verdict dinormalisasi kapital", pv && pv.verdict === "WORTH IT" && pv.hargaMin === 140000 && pv.hargaMax === 160000);
t("2d. verdict gak dikenal → WAJAR + hargaMax >= hargaMin", parseVerdict('{"hargaMin":100000,"hargaMax":90000,"verdict":"ASAL","analisis":"x"}').verdict === "WAJAR" && parseVerdict('{"hargaMin":100000,"hargaMax":90000,"verdict":"ASAL"}').hargaMax === 100000);
t("2e. bukan JSON → null", parseVerdict("maaf gak bisa") === null);

// ═══ 3. handler flow ═══
out("\n— handler —");
const replies = [];
function mockM(args, opts = {}) {
  return {
    command: "spybelanja", args, text: args.join(" "), prefix: ".",
    chat: "6287770@s.whatsapp.net", sender: "6287770@s.whatsapp.net", pushName: "Buyer",
    isGroup: false, isOwner: false, isImage: !!opts.isImage,
    quoted: opts.quoted || null,
    react: async () => {},
    reply: async (txt) => { replies.push(String(txt)); return { key: { id: "r" } }; },
  };
}
const sockMock = { sendMessage: async () => {}, sendMedia: async () => {} };

const FAKE_PRODUCT = '{"produk":"Redmi Note 13 128GB","harga":149000,"toko":"Mi Official Store","rating":4.9,"ulasan":1200,"catatan":"gratis ongkir"}';
const FAKE_SEARCH = {
  items: Array.from({ length: 10 }, (_, i) => ({ title: `Harga Redmi Note 13 toko ${i + 1}`, snippet: `Rp${140000 + i * 2000} dengan voucher`, url: `https://toko${i}.example.com` })),
};
const FAKE_VERDICT = '{"hargaMin":140000,"hargaMax":165000,"verdict":"WORTH IT","analisis":"Harga 149rb masih di tengah range pasar 140-165rb. Rating toko bagus.","tips":"Cek gratis ongkir dan voucher toko sebelum checkout.","alternatif":"gak ada, produk ini udah oke"}';

let visionCalls = 0, searchCalls = 0, aiCalls = 0;
_setSpyDepsForTest({
  vision: async () => { visionCalls++; return { status: true, text: FAKE_PRODUCT }; },
  search: async (q, opts) => { searchCalls++; t("search dipanggil limit 10", opts?.limit === 10, JSON.stringify(opts)); return FAKE_SEARCH; },
  ai: async (p) => { aiCalls++; return FAKE_VERDICT; },
});

// foto flow
await handler(mockM([], { isImage: true, quoted: { isImage: true, download: async () => Buffer.from("shot") } }), { sock: sockMock, config: { command: { prefix: "." } } });
const r1 = low(replies.at(-1) || "");
t("3a. kartu: produk + harga screenshot + toko", r1.includes("redmi note 13") && r1.includes("149.000") && r1.includes("mi official store"), r1.slice(0, 120));
t("3b. harga pasar + verdict WORTH IT", r1.includes("140.000") && r1.includes("worth it"), r1.slice(0, 200));
t("3c. analisis + tips + jumlah sumber", r1.includes("rating toko bagus") && r1.includes("10 hasil pencarian"), r1.slice(0, 260));
t("3d. flow vision → search → ai (1x masing-masing)", visionCalls === 1 && searchCalls === 1 && aiCalls === 1, `v=${visionCalls} s=${searchCalls} ai=${aiCalls}`);

// teks flow
replies.length = 0;
await handler(mockM(["minyak", "goreng", "2", "liter"]), { sock: sockMock, config: { command: { prefix: "." } } });
const r2 = low(replies.at(-1) || "");
t("3e. mode teks: tanpa blok screenshot, tetap harga pasar + verdict", !r2.includes("dari screenshot") && r2.includes("verdict"), r2.slice(0, 120));

// bukan produk → error jelas
_setSpyDepsForTest({
  vision: async () => ({ status: true, text: '{"produk":"BUKAN_PRODUK","harga":0}' }),
  search: async () => FAKE_SEARCH,
  ai: async () => FAKE_VERDICT,
});
replies.length = 0;
await handler(mockM([], { isImage: true, quoted: { isImage: true, download: async () => Buffer.from("meme") } }), { sock: sockMock, config: { command: { prefix: "." } } });
t("3f. bukan screenshot produk → error jelas", /gak kedeteksi produk/.test(low(replies.at(-1) || "")), low(replies.at(-1) || "").slice(0, 80));

// vision down → error
_setSpyDepsForTest({
  vision: async () => ({ status: false, error: "vision down" }),
  search: async () => FAKE_SEARCH,
  ai: async () => FAKE_VERDICT,
});
replies.length = 0;
await handler(mockM([], { isImage: true, quoted: { isImage: true, download: async () => Buffer.from("x") } }), { sock: sockMock, config: { command: { prefix: "." } } });
t("3g. vision down → error engine", /vision down/.test(low(replies.at(-1) || "")));

// search gagal → verdict AI tetap + catatan harga gak keverifikasi
_setSpyDepsForTest({
  vision: async () => ({ status: true, text: FAKE_PRODUCT }),
  search: async () => ({ error: "semua mesin sibuk" }),
  ai: async (p) => { aiCalls++; return FAKE_VERDICT; },
});
replies.length = 0;
await handler(mockM([], { isImage: true, quoted: { isImage: true, download: async () => Buffer.from("y") } }), { sock: sockMock, config: { command: { prefix: "." } } });
const r3 = low(replies.at(-1) || "");
t("3h. search gagal → verdict tetap + warning estimasi", r3.includes("worth it") && r3.includes("gak keverifikasi"), r3.slice(0, 200));

// AI gagal + search hidup → digest lokal
_setSpyDepsForTest({
  vision: async () => ({ status: true, text: FAKE_PRODUCT }),
  search: async () => FAKE_SEARCH,
  ai: async () => { throw new Error("ai down"); },
});
replies.length = 0;
await handler(mockM([], { isImage: true, quoted: { isImage: true, download: async () => Buffer.from("z") } }), { sock: sockMock, config: { command: { prefix: "." } } });
const r4 = low(replies.at(-1) || "");
t("3i. AI gagal → digest lokal list hasil search", r4.includes("harga pasar dari pencarian") && r4.includes("toko 1"), r4.slice(0, 150));

// AI + search dua-duanya gagal → error sopan
_setSpyDepsForTest({
  vision: async () => ({ status: true, text: FAKE_PRODUCT }),
  search: async () => ({ error: "mati" }),
  ai: async () => { throw new Error("ai down"); },
});
replies.length = 0;
await handler(mockM([], { isImage: true, quoted: { isImage: true, download: async () => Buffer.from("w") } }), { sock: sockMock, config: { command: { prefix: "." } } });
t("3j. search+AI mati barengan → error sopan (gak crash)", /sibuk barengan|coba lagi/.test(low(replies.at(-1) || "")));

// guide
replies.length = 0;
await handler(mockM([]), { sock: sockMock, config: { command: { prefix: "." } } });
t("3k. no-arg → guide", /spybelanja/.test(low(replies.at(-1) || "")) && /screenshot/.test(low(replies.at(-1) || "")));

out(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
