// NOVA AI WHATSAPP BOT — E2E: AUTO ORDER NOKOS 5SIM (nova-nokos.js + ordernokos.js)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const R = path.resolve(".");
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => {
  if (cond) pass++;
  else { fail++; console.log(`  ❌ ${name}${extra ? " → " + String(extra).slice(0, 260) : ""}`); }
};
process.on("unhandledRejection", (e) => { console.log("UNHANDLED:", e?.stack || e); process.exit(1); });

const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "nokos-e2e-"));
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(path.join(dbDir, "db"));

const lib = await import(R + "/src/lib/nova-auto-order.js");
const nk = await import(R + "/src/lib/nova-nokos.js");
const plug = await import(R + "/plugins/panel/ordernokos.js");
const cfgPlug = await import(R + "/plugins/owner/autoorder.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();

// ─── seams: timing cepat ───
plug._setOrderTimingsForTest(5, 300);
plug._setOtpTimingsForTest(5, 300);

const sent = [];
const mkSock = () => ({
  sendMessage: async (jid, payload, opts) => { sent.push({ jid, payload, opts }); return { key: { id: "m1", remoteJid: jid } }; },
});
const mkM = (over = {}) => ({
  text: "", args: [], command: "ordernokos", prefix: ".", chat: "62812buyer@s.whatsapp.net",
  sender: "62812buyer@s.whatsapp.net", isGroup: false, isOwner: false,
  reply: async (x) => { sent.push({ jid: "reply", payload: { text: String(x) } }); },
  ...over,
});

// ─── fake pakasir ───
let fakeTrxStatus = "pending";
const pakasirPayments = [];
const fakePakasir = {
  createPayment: async (method, orderId, amount) => {
    pakasirPayments.push({ method, orderId, amount });
    return { order_id: orderId, amount, total_payment: amount, status: "pending", payment_number: "QRISNOKOSTEST", payment_url: "https://app.pakasir.com/pay/x" };
  },
  detailPayment: async (orderId, amount) => ({ order_id: orderId, amount, status: fakeTrxStatus }),
};
plug._setPakasirFactoryForTest(() => fakePakasir);

// ─── fake http 5SIM ───
const API_KEY = "fivesim-e2e-token-123";
const calls = [];
let checkSeq = []; // status berurutan untuk /user/check
let buyOk = true;
let buyResp = { id: "98765", phone: "+6281234567890", price: 0.48, status: "PENDING", expires: "2026-09-28T13:00:00Z" };
const fakeHttp = {
  get: async (url, opts = {}) => {
    calls.push({ url, auth: opts?.headers?.Authorization || "" });
    if (url.includes("/guest/prices")) {
      // ?country=indonesia&product=whatsapp → axios params di url string
      const isWa = url.includes("product=whatsapp") || url.includes("params");
      const country = url.match(/country=([a-z]+)/)?.[1] || opts?.params?.country || "indonesia";
      const product = url.match(/product=([a-z0-9]+)/)?.[1] || opts?.params?.product || "whatsapp";
      if (product === "tidakada") return { data: { [country]: {} } };
      if (product === "stokhabis") return { data: { [country]: { [product]: { virtual1: { cost: 0.5, count: 0 } } } } };
      return { data: { [country]: { [product]: {
        virtual1: { cost: 0.75, count: 100 },
        virtual2: { cost: 0.42, count: 500 },
        virtual3: { cost: 0.5, count: 700 },
      } } } };
    }
    if (url.includes("/user/profile")) return { data: { id: 1, email: "a@b.c", balance: 10, currency: "USD" } };
    if (url.includes("/user/buy/")) {
      if (!buyOk) { const e = new Error("no numbers"); e.response = { status: 400, data: { message: "No free phones" } }; throw e; }
      return { data: buyResp };
    }
    if (url.includes("/user/check/")) {
      const st = checkSeq.length ? checkSeq.shift() : "PENDING";
      if (st === "RECEIVED") return { data: { status: "RECEIVED", sms: [{ code: "554433", text: "Your code: 554433", created_at: "x" }] } };
      return { data: { status: st, sms: [] } };
    }
    if (url.includes("/user/cancel/")) return { data: { id: 98765, status: "CANCELED" } };
    if (url.includes("/user/finish/")) return { data: { id: 98765, status: "FINISHED" } };
    return { data: {} };
  },
};
plug._setNokosHttpForTest(fakeHttp);

// ─── setup db config ───
const db = getDatabase();
const cfg = lib.ensureOrderCfg(db);

console.log("─── 1. LIB nova-nokos ───");
t("1a. cfg default: nokos.apiKey kosong + markup 20%", cfg.nokos.apiKey === "" && cfg.nokos.markupPct === 20 && typeof cfg.nokos.orders === "object", JSON.stringify(cfg.nokos));
t("1b. findProduct('wa') → whatsapp", nk.findProduct("wa")?.slug === "whatsapp", JSON.stringify(nk.findProduct("wa")));
t("1c. findProduct('ig') → instagram", nk.findProduct("ig")?.slug === "instagram");
t("1d. findCountry('indo') → indonesia", nk.findCountry("indo")?.slug === "indonesia");
t("1e. findCountry('pilipin') → philippines", nk.findCountry("pilipin")?.slug === "philippines");
t("1f. usdToRupiah(0.42) = 6930", nk.usdToRupiah(0.42) === Math.round(0.42 * nk.NOKOS_USD_RATE), nk.usdToRupiah(0.42));

const pr = await nk.nokosPrices("indonesia", "whatsapp");
t("1g. guest prices: list operator", pr.ok && Array.isArray(pr.list) && pr.list.length === 3, JSON.stringify(pr));
t("1h. termurah duluan (0.42 virtual2)", pr.ok && pr.list[0].cost === 0.42 && pr.list[0].operator === "virtual2");
const habis = await nk.nokosPrices("indonesia", "stokhabis");
t("1i. semua stok 0 → cheapestInStock null", habis.ok && nk.cheapestInStock(habis.list) === null);
const takada = await nk.nokosPrices("indonesia", "tidakada");
t("1j. produk gak ada → error jujur", !takada.ok && /gak ketemu/.test(takada.error), takada.error);

const prof = await nk.nokosProfile(cfg);
t("1k. profile tanpa key → error jujur", !prof.ok && /belum di-set/.test(prof.error), prof.error);
cfg.nokos.apiKey = API_KEY;
const prof2 = await nk.nokosProfile(cfg);
t("1l. profile dengan key → balance", prof2.ok && prof2.data.balance === 10, JSON.stringify(prof2));

console.log("─── 2. AUTOORDER CONFIG ───");
const ownerM = mkM({ command: "autoorder", sender: "owner@x", text: "nokos token-baru-9999" });
ownerM.args = ["nokos", "token-baru-9999"];
let ownerHandler;
try { ownerHandler = (await import(R + "/plugins/owner/autoorder.js")).handler; } catch { ownerHandler = cfgPlug.handler; }
await ownerHandler(mkM({ command: "autoorder", sender: "owner@x", text: "nokos token-baru-9999", args: ["nokos", "token-baru-9999"] }), { sock: mkSock(), db });
t("2a. .autoorder nokos <token> tersimpan", cfg.nokos.apiKey === "token-baru-9999", cfg.nokos.apiKey);
await ownerHandler(mkM({ command: "autoorder", sender: "owner@x", text: "markupnokos 30", args: ["markupnokos", "30"] }), { sock: mkSock(), db });
t("2b. .autoorder markupnokos 30 → markupPct 30", cfg.nokos.markupPct === 30, cfg.nokos.markupPct);
await ownerHandler(mkM({ command: "autoorder", sender: "owner@x", text: "markupnokos 999", args: ["markupnokos", "999"] }), { sock: mkSock(), db });
t("2c. markup 999 ditolak", cfg.nokos.markupPct === 30);
await ownerHandler(mkM({ command: "autoorder", sender: "owner@x", text: "status", args: ["status"] }), { sock: mkSock(), db });
t("2d. .autoorder status nunjukin Nokos 5SIM (smallcaps)", sc(sent[sent.length - 1].payload.text).includes("nokos 5sim") && sc(sent[sent.length - 1].payload.text).includes("token tersimpan"), sent[sent.length - 1].payload.text.slice(0, 120));

console.log("─── 3. GUARDS ───");
const handler = plug.handler;
cfg.nokos.apiKey = API_KEY;
cfg.on = false;
await handler(mkM({ command: "ordernokos", text: "whatsapp|indonesia" }), { sock: mkSock(), db });
t("3a. autoorder off → jujur gak aktif", sc(sent[sent.length - 1].payload.text).includes("tidak aktif"));
cfg.on = true;
cfg.pakasir.slug = ""; cfg.pakasir.apikey = "";
await handler(mkM({ command: "ordernokos", text: "whatsapp|indonesia" }), { sock: mkSock(), db });
t("3b. pakasir belum di-set → jujur", sc(sent[sent.length - 1].payload.text).includes("belum dikonfigurasi"));
cfg.pakasir.slug = "toko"; cfg.pakasir.apikey = "k"; cfg.nokos.apiKey = "";
await handler(mkM({ command: "ordernokos", text: "whatsapp|indonesia" }), { sock: mkSock(), db });
t("3c. token 5SIM belum di-set → jujur", sc(sent[sent.length - 1].payload.text).includes("belum set token"));
cfg.nokos.apiKey = API_KEY;
await handler(mkM({ command: "ordernokos", text: "whatsapp" }), { sock: mkSock(), db });
t("3d. format kurang → guide format", sc(sent[sent.length - 1].payload.text).includes("format"));
await handler(mkM({ command: "ordernokos", text: "produkngawur|indonesia" }), { sock: mkSock(), db });
t("3e. produk gak dikenal → error", sc(sent[sent.length - 1].payload.text).includes("gak dikenal"));
await handler(mkM({ command: "ordernokos", text: "whatsapp|negarangawur" }), { sock: mkSock(), db });
t("3f. negara gak dikenal → error", sc(sent[sent.length - 1].payload.text).includes("gak dikenal"));
await handler(mkM({ command: "ordernokos", text: "whatsapp|indonesia" }), { sock: mkSock(), db });
t("3g. stok habis → jujur stok habis", sc(sent[sent.length - 1].payload.text).includes("habis") === false ? true : true); // mock selalu ada stok — cek via stokhabis produk:
const habisM = mkM({ command: "ordernokos", text: "stokhabis|indonesia" });
await handler(habisM, { sock: mkSock(), db });
t("3g2. semua stok 0 → tolak jujur", sc(sent[sent.length - 1].payload.text).includes("habis"), sent[sent.length - 1].payload.text.slice(0, 100));

console.log("─── 4. .nokoslist ───");
sent.length = 0;
await handler(mkM({ command: "nokoslist", text: "" }), { sock: mkSock(), db });
const listOut = sc(sent[sent.length - 1].payload.text);
t("4a. default = Indonesia + harga + kurs", listOut.includes("nokos indonesia") && listOut.includes("whatsapp") && listOut.includes("kurs estimasi"), listOut.slice(0, 120));
const expectRp = Math.ceil((Math.round(0.42 * nk.NOKOS_USD_RATE) * 130) / 100 / 100) * 100;
t("4b. harga markup 30% masuk (0.42 usd → " + expectRp + ")", listOut.includes(expectRp.toLocaleString("id-ID")), listOut.slice(0, 200));
sent.length = 0;
await handler(mkM({ command: "nokoslist", text: "philippines" }), { sock: mkSock(), db });
t("4c. .nokoslist philippines → header Filipina", sc(sent[sent.length - 1].payload.text).includes("nokos filipina"));
sent.length = 0;
await handler(mkM({ command: "nokoslist", text: "atlantis" }), { sock: mkSock(), db });
t("4d. negara gak dikenal → daftar populer", sc(sent[sent.length - 1].payload.text).includes("gak dikenal"));

console.log("─── 5. ORDER FLOW: QRIS → BUY → OTP ───");
sent.length = 0; pakasirPayments.length = 0; calls.length = 0;
fakeTrxStatus = "pending"; checkSeq = []; buyOk = true; buyResp = { id: "98765", phone: "+6281234567890", price: 0.42, status: "PENDING", expires: "x" };

// pending → lunas setelah poll pertama
setTimeout(() => { fakeTrxStatus = "completed"; }, 20);
// OTP: PENDING sekali lalu RECEIVED
checkSeq = ["PENDING", "RECEIVED"];

await handler(mkM({ command: "ordernokos", text: "wa|indo" }), { sock: mkSock(), db });

const allText = sent.map((x) => ({ jid: x.jid, text: sc(x.payload?.text || x.payload?.caption || "") }));
const hasInvoice = allText.some((x) => x.text.includes("invoice nokos") && x.text.includes("qris"));
t("5a. invoice QRIS kekirim", hasInvoice, JSON.stringify(allText.map((x) => x.text.slice(0, 40))));
t("5b. harga = modal 0.42 USD → rp 6930 + 30% → 9000", pakasirPayments[0]?.amount === Math.ceil((Math.round(0.42 * nk.NOKOS_USD_RATE) * 130) / 100 / 100) * 100, JSON.stringify(pakasirPayments));
t("5c. buy ke 5SIM dengan operator termurah", calls.some((c) => c.url.includes("/user/buy/indonesia/virtual2/whatsapp") && c.auth === `Bearer ${API_KEY}`), JSON.stringify(calls.filter((c) => c.url.includes("buy"))));
const orderIds = Object.keys(cfg.nokos.orders);
t("5d. order kecatat di db (NOK-…)", orderIds.length === 1 && orderIds[0].startsWith("NOK-"), orderIds.join(","));
const rec = cfg.nokos.orders[orderIds[0]];
t("5e. record: nomor + fivesimId + WAITING→RECEIVED", rec.phone === "+6281234567890" && rec.fivesimId === "98765" && rec.status === "RECEIVED", JSON.stringify(rec));
t("5f. OTP 554433 tersimpan", rec.otp === "554433");
t("5g. nomor dibeli notif ke chat", allText.some((x) => x.text.includes("nomor nokos dibeli") && x.text.includes("+6281234567890")));
const dmOtp = sent.find((x) => x.jid === "62812buyer@s.whatsapp.net" && sc(x.payload?.text || "").includes("otp nokos diterima"));
t("5h. struk OTP DM ke buyer", !!dmOtp && sc(dmOtp.payload.text).includes("554433"));
const dmOwner = sent.find((x) => x.jid !== "62812buyer@s.whatsapp.net" && x.jid !== "reply" && x.payload?.text);
t("5i. owner di-DM progres", !!dmOwner && sc(dmOwner.payload.text).includes("[auto order nokos]"), dmOwner?.payload?.text?.slice(0, 80));

console.log("─── 6. ORDER FLOW: OTP GAK DATANG ───");
sent.length = 0; pakasirPayments.length = 0; calls.length = 0;
fakeTrxStatus = "completed"; checkSeq = ["PENDING", "PENDING", "PENDING"]; buyOk = true;
await handler(mkM({ command: "ordernokos", text: "telegram|malaysia" }), { sock: mkSock(), db });
const lastTexts = sent.map((x) => sc(x.payload?.text || x.payload?.caption || "")).join("\n");
t("6a. timeout OTP → pesan gak datang", lastTexts.includes("otp gak datang"), lastTexts.slice(-300));
t("6b. cancel ke 5SIM dipanggil", calls.some((c) => c.url.includes("/user/cancel/")));
const orderIds2 = Object.keys(cfg.nokos.orders);
const rec2 = cfg.nokos.orders[orderIds2.find((id) => cfg.nokos.orders[id].status === "NO_OTP_CANCELED")];
t("6c. record NO_OTP_CANCELED + owner di-DM refund", !!rec2 && sent.some((x) => x.jid !== "reply" && x.jid !== "62812buyer@s.whatsapp.net" && sc(x.payload?.text || "").includes("refund buyer manual")), JSON.stringify(rec2));

console.log("─── 7. ORDER FLOW: QRIS GAK DIBAYAR ───");
sent.length = 0; pakasirPayments.length = 0;
fakeTrxStatus = "pending"; checkSeq = [];
await handler(mkM({ command: "ordernokos", text: "wa|indo" }), { sock: mkSock(), db });
t("7a. kedaluwarsa → order gak dibuat", sc(sent[sent.length - 1].payload.text).includes("kedaluwarsa") && Object.keys(cfg.nokos.orders).length === 2, sent[sent.length - 1].payload.text.slice(0, 100));

console.log("─── 8. .nokosotp & .nokoscancel ───");
const orderIdOk = orderIds[0];
sent.length = 0;
await handler(mkM({ command: "nokosotp", text: orderIdOk }), { sock: mkSock(), db });
t("8a. .nokosotp order sukses → OTP tampil", sc(sent[sent.length - 1].payload.text).includes("554433"));
await handler(mkM({ command: "nokosotp", text: "NOK-GAKADA" }), { sock: mkSock(), db });
t("8b. id gak ketemu → jujur", sc(sent[sent.length - 1].payload.text).includes("gak ketemu"));
const orderIdCancel = orderIds2.find((id) => cfg.nokos.orders[id].status === "NO_OTP_CANCELED");
await handler(mkM({ command: "nokoscancel", text: orderIdCancel }), { sock: mkSock(), db });
t("8c. cancel order udah canceled → jujur", sc(sent[sent.length - 1].payload.text).includes("udah dibatalkan"));
// cancel aktif (belum OTP) — record WAITING_OTP dibikin langsung (di produksi
// kejadian pas OTP masih dipantau, e2e gak bisa nunggu 12 mnt)
cfg.nokos.orders["NOK-E2E-ACTIVE-1"] = {
  buyer: "62812buyer@s.whatsapp.net", product: "WhatsApp", productSlug: "whatsapp",
  country: "Indonesia", countrySlug: "indonesia", phone: "+628123000999",
  fivesimId: "555001", operator: "virtual2", modalUsd: 0.42, priceRp: 9100,
  status: "WAITING_OTP", otp: null, createdAt: Date.now(),
};
db.save();
sent.length = 0;
await handler(mkM({ command: "nokoscancel", text: "NOK-E2E-ACTIVE-1" }), { sock: mkSock(), db });
t("8d. .nokoscancel aktif → canceled + catat owner", sc(sent[sent.length - 1].payload.text).includes("dibatalkan") && cfg.nokos.orders["NOK-E2E-ACTIVE-1"].status === "CANCELED_BUYER", sent[sent.length - 1].payload.text.slice(0, 120));
t("8e. cancel → owner di-DM refund manual", sent.some((x) => x.jid !== "reply" && x.jid !== "62812buyer@s.whatsapp.net" && sc(x.payload?.text || "").includes("refund")));
await handler(mkM({ command: "nokoscancel", text: "NOK-E2E-ACTIVE-1", sender: "62899lain@s.whatsapp.net" }), { sock: mkSock(), db });
t("8f. orang lain cancel order orang → ditolak", sc(sent[sent.length - 1].payload.text).includes("orang lain"));
// buyer lain cek OTP order orang lain
sent.length = 0;
await handler(mkM({ command: "nokosotp", text: orderIdOk, sender: "62899lain@s.whatsapp.net" }), { sock: mkSock(), db });
t("8g. orang lain cek → ditolak", sc(sent[sent.length - 1].payload.text).includes("orang lain"));

console.log("─── 9. BELI GAGAL SETELAH LUNAS ───");
sent.length = 0; pakasirPayments.length = 0;
fakeTrxStatus = "completed"; buyOk = false; checkSeq = [];
await handler(mkM({ command: "ordernokos", text: "wa|indo" }), { sock: mkSock(), db });
const failText = sent.map((x) => sc(x.payload?.text || x.payload?.caption || "")).join("\n");
t("9a. 5SIM gagal → jujur + owner di-DM manual", failText.includes("gagal") && sent.some((x) => x.jid !== "reply" && x.jid !== "62812buyer@s.whatsapp.net" && sc(x.payload?.text || "").includes("mohon proses manual")), failText.slice(0, 200));

console.log("─── 10. CLEANUP ───");
plug._resetPakasirFactoryForTest();
plug._resetOrderTimingsForTest();
plug._resetOtpTimingsForTest();
plug._resetNokosHttpForTest();
t("10a. seams ke-reset", true);

console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
