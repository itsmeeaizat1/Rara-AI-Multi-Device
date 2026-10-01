// E2E .sdxl (16 Sep 2026, owner report ".sdxl gagal") — validasi scraper baru:
// magic byte, tolak HTML, retry chain flux→turbo→flux, error informatif,
// fallback ZelAPI di plugin.
const R = process.cwd();
const sd = await import(R + "/src/scraper/stable-diffusion.js");
const zel = await import(R + "/src/scraper/zelapi.js");

let pass = 0, fail = 0;
const out = (s) => console.log(s);
function t(label, cond, extra) {
  if (cond) { pass++; out("✅ " + label); }
  else { fail++; out("❌ " + label + (extra ? " — " + extra : "")); }
}

// PNG minimal valid (magic byte 89 50 4E 47) > 1000 byte
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(1500, 0x11)]);
const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe1]), Buffer.alloc(1500, 0x22)]);

out("— scraper: validasi & retry —");

// 1. gambar valid → langsung sukses attempt pertama
sd._setSdHttpForTest(async () => ({ status: 200, data: png }));
let r = await sd.stableDiffusion("kucing pink");
t("1a. PNG valid → status true", r.status === true, JSON.stringify(r));
t("1b. model tercatat pollinations-flux", r.model === "pollinations-flux");

// 2. HTML error page → DITOLAK, terus ke attempt berikut (turbo) yang sukses
let calls = 0;
sd._setSdHttpForTest(async (url) => {
  calls++;
  if (calls === 1) return { status: 200, data: Buffer.from("<!doctype html><html><body>rate limited</body></html>" + "x".repeat(2000)) };
  return { status: 200, data: jpg };
});
r = await sd.stableDiffusion("kucing pink");
t("2a. HTML ditolak → attempt-2 (turbo) sukses", r.status === true && calls === 2, "calls=" + calls);
t("2b. model jadi pollinations-turbo", r.model === "pollinations-turbo", r.model);

// 3. 429 dua kali → attempt ke-3 sukses
calls = 0;
sd._setSdHttpForTest(async () => {
  calls++;
  if (calls <= 2) return { status: 429, data: Buffer.from("too many requests") };
  return { status: 200, data: png };
});
r = await sd.stableDiffusion("kucing pink");
t("3a. 429 dua kali → retry ke attempt-3 sukses", r.status === true && calls === 3, "calls=" + calls);

// 4. semua attempt gagal → error informatif terakhir
sd._setSdHttpForTest(async () => ({ status: 500, data: Buffer.from("err") }));
r = await sd.stableDiffusion("kucing pink");
t("4a. total gagal → status false + penyebab HTTP 500", r.status === false && /HTTP 500/.test(r.error || ""), JSON.stringify(r));

// 5. timeout → pesan timeout jelas (bukan "network error" polos)
sd._setSdHttpForTest(async () => { const e = new Error("timeout of 45000ms exceeded"); e.code = "ECONNABORTED"; throw e; });
r = await sd.stableDiffusion("kucing pink");
t("5a. timeout → pesan 'antrean pollinations sibuk'", r.status === false && /antrean pollinations sibuk/.test(r.error || ""), JSON.stringify(r));

out("\n— plugin: fallback ZelAPI —");
const mod = await import(R + "/plugins/ai-image/sdxl.js");
t("6a. plugin re-export seam _setSdHttpForTest", typeof mod._setSdHttpForTest === "function");

const replies = [];
const sent = [];
let reacts = [];
const mkM = (args) => ({
  args, chat: "628999@s.whatsapp.net", sender: "628999@s.whatsapp.net",
  prefix: ".", command: "sdxl", pushName: "Tes",
  reply: async (txt) => { replies.push(String(txt)); return { handled: true }; },
  react: async (e) => { reacts.push(e); return {}; },
});

// pollinations gagal total + zelapi sukses → gambar tetap terkirim
mod._setSdHttpForTest(async () => ({ status: 500, data: Buffer.from("err") }));
zel._setZelHttpForTest(async () => ({ status: 200, headers: { get: () => "image/png" }, arrayBuffer: async () => png }));
zel._setZelKeyForTest("TESTKEY");
await mod.handler(mkM(["kucing", "pink"]), { sock: { sendMedia: async (chat, buf, x, m, o) => { sent.push({ buf, o }); return { handled: true }; } } });
t("7a. pollinations mati → fallback zelapi sukses kirim gambar", sent.length === 1 && sent[0].buf.equals(png), "sent=" + sent.length);
t("7b. caption engine = zelapi-sdxl", (sent[0]?.o?.caption || "").includes("zelapi-sdxl"), sent[0]?.o?.caption);

// pollinations gagal + zelapi gak ada key → error reply berisi penyebab
zel._setZelKeyForTest(null);
await mod.handler(mkM(["kucing", "pink"]), { sock: { sendMedia: async () => { sent.push({}); return {}; } } });
// GOTCHA: novaWrap → smallcaps, asersi jangan andalkan huruf kecil normal
const r8 = replies.at(-1) || "";
t("8a. dua-duanya gagal → reply error + penyebab HTTP 500", /ɢᴀɢᴀʟ|[Gg]agal/.test(r8) && /500/.test(r8), r8.slice(0, 90));

out("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
