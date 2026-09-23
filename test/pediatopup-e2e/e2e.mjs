// NOVA AI WHATSAPP BOT — E2E: AUTO ORDER TOPUP PANELPEDIA (panelpediatopup.com)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const R = path.resolve(".");
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => {
  if (cond) pass++;
  else { fail++; console.log(`  ❌ ${name}${extra ? " → " + String(extra).slice(0, 260) : ""}`); }
};
process.on("unhandledRejection", (e) => { console.log("UNHANDLED:", e?.stack || e); process.exit(1); });

const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "pediatopup-e2e-"));
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(path.join(dbDir, "db"));

const lib = await import(R + "/src/lib/nova-auto-order.js");
const plug = await import(R + "/plugins/panel/ordertopup.js");
const cfgPlug = await import(R + "/plugins/owner/autoorder.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();

// ─── seams: timing cepat ───
plug._setOrderTimingsForTest(5, 300);   // poll bayar 5ms, timeout 300ms
plug._setStatusTimingsForTest(5, 300);  // poll status 5ms, timeout 300ms

const sent = [];
const mkSock = () => ({
  sendMessage: async (jid, payload, opts) => { sent.push({ jid, payload, opts }); return { key: { id: "m1", remoteJid: jid } }; },
});
const mkM = (over = {}) => ({
  text: "", args: [], command: "ordertopup", prefix: ".", chat: "62812buyer@s.whatsapp.net",
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
    return { order_id: orderId, amount, total_payment: amount, status: "pending", payment_number: "QRIS12345TEST", payment_url: "https://app.pakasir.com/pay/x" };
  },
  detailPayment: async (orderId, amount) => ({ order_id: orderId, amount, status: fakeTrxStatus }),
};
plug._setPakasirFactoryForTest(() => fakePakasir);

// ─── fake http PanelPedia ───
const API_ID = "e2eid01";
const API_KEY = "e2ekeysecret123";
const SIGN = crypto.createHash("md5").update(API_ID + API_KEY).digest("hex");
const pediaCalls = [];
let orderFailMsg = null;               // set non-null → endpoint order gagal
let statusSeq = ["Sukses"];            // antrian status endpoint /api/status
const SERVICES = [
  { status: true, msg: "ok", data: { id: "12", game: "Mobile Legends", nama_layanan: "14 Diamonds ( 13 + 1 Bonus )", harga: { basic: 3310, gold: 3250, platinum: 3120 }, status: "aktif" } },
  { status: true, msg: "ok", data: { id: "99", game: "Instagram SMM", nama_layanan: "100 Followers IG", harga: { basic: 5000, gold: 4900, platinum: 4800 }, status: "aktif" } },
];
const fakeHttp = {
  post: async (url, body) => {
    pediaCalls.push({ url, body: { ...body } });
    // signature WAJIB md5(api_id + api_key)
    if (body.signature !== SIGN) return { status: 200, data: { status: false, msg: "Signature Tidak Valid. Silakan periksa kredensial API Anda" } };
    if (url.endsWith("/api/profile")) {
      return { status: 200, data: { status: true, msg: "ok", data: { full_name: "E2E", username: "e2e", balance: 100000, role: "Platinum", created_at: "2026-01-01" } } };
    }
    if (url.endsWith("/api/service")) return { status: 200, data: SERVICES };
    if (url.endsWith("/api/order")) {
      if (orderFailMsg) return { status: 200, data: { status: false, msg: orderFailMsg } };
      return { status: 200, data: { status: true, msg: "Pesanan berhasil! Pesanan sedang diproses", data: { order_id: body.order_id, nama_layanan: "14 Diamonds ( 13 + 1 Bonus )", service_id: body.service_id, target_id: body.target_id, target_server: body.target_server || "", status: "Proses", note: "" } } };
    }
    if (url.endsWith("/api/status")) {
      const st = statusSeq.length > 1 ? statusSeq.shift() : statusSeq[0];
      return { status: 200, data: { status: true, msg: "Detail transaksi berhasil didapatkan", data: { order_id: body.order_id, data_id: String(body.target_id || "98765432 (2147)"), service: "14 Diamonds ( 13 + 1 Bonus )", status: st, note: "", price: 3120 } } };
    }
    return { status: 200, data: { status: false, msg: "endpoint gak dikenal" } };
  },
};
plug._setPediaHttpForTest(fakeHttp);

// ─── config dasar ───
const db = getDatabase();
const cfg = lib.ensureOrderCfg(db);
cfg.on = true;
cfg.pakasir.slug = "e2e-slug";
cfg.pakasir.apikey = "e2e-pakasir-key";
cfg.pediatopup.apiId = API_ID;
cfg.pediatopup.apiKey = API_KEY;
db.save();

const run = (over = {}) => plug.handler(mkM(over), { sock: mkSock(), db });
const replies = () => sent.filter((s) => s.jid === "reply").map((s) => sc(s.payload.text));
const dms = () => sent.filter((s) => s.jid !== "reply").map((s) => ({ jid: s.jid, text: sc(s.payload?.text || s.payload?.caption || "") }));
const lastReply = () => replies()[replies().length - 1] || "";

console.log("— section 1: guard & config —");
{
  cfg.on = false;
  await run({ text: "12|987654321" });
  t("1a. autoorder mati → ditolak", lastReply().includes("tidak aktif"), lastReply());
  cfg.on = true;
  const savedApi = cfg.pediatopup.apiKey; cfg.pediatopup.apiKey = "";
  await run({ text: "12|987654321" });
  t("1b. API PanelPedia belum di-set → ditolak", lastReply().includes("belum set"), lastReply());
  cfg.pediatopup.apiKey = savedApi;
  // owner sub: pediatopup + markuptopup
  await cfgPlug.handler(mkM({ command: "autoorder", args: ["pediatopup", "newid", "newkey123456"], sender: "owner@x", text: "pediatopup newid newkey123456" }), { sock: mkSock(), db });
  t("1c. owner: .autoorder pediatopup tersimpan (apikey dimasker)", lastReply().includes("newid") && !lastReply().includes("newkey123456") && cfg.pediatopup.apiId === "newid", lastReply());
  cfg.pediatopup.apiId = API_ID; cfg.pediatopup.apiKey = API_KEY; db.save();
  await cfgPlug.handler(mkM({ command: "autoorder", args: ["markuptopup", "500"], sender: "owner@x", text: "markuptopup 500" }), { sock: mkSock(), db });
  t("1d. owner: .autoorder markuptopup 500", cfg.pediatopup.markup === 500, cfg.pediatopup.markup);
}

console.log("— section 2: daftar layanan —");
{
  sent.length = 0;
  await run({ command: "topuplist", text: "" });
  t("2a. topuplist: 2 layanan aktif tampil", lastReply().includes("total layanan aktif: 2"), lastReply());
  t("2b. harga pakai level akun (platinum) + markup 500", lastReply().includes("rp3.620") && lastReply().includes("rp5.300"), lastReply());
  sent.length = 0;
  await run({ command: "topuplist", text: "followers" });
  t("2c. keyword filter narik 1 layanan", lastReply().includes("100 followers ig") && !lastReply().includes("14 diamonds"), lastReply());
}

console.log("— section 3: flow order lunas → API → sukses —");
{
  sent.length = 0; pediaCalls.length = 0; pakasirPayments.length = 0; statusSeq = ["Sukses"];
  fakeTrxStatus = "completed";
  await run({ text: "12|987654321|2147" });
  const ordCall = pediaCalls.find((c) => c.url.endsWith("/api/order"));
  t("3a. order dikirim ke /api/order dengan signature md5 benar", !!ordCall && ordCall.body.signature === SIGN && ordCall.body.service_id === "12" && ordCall.body.target_id === "987654321" && ordCall.body.target_server === "2147", ordCall?.body);
  t("3b. order_id unik prefiks TOP- (gak dipakai ulang)", /^TOP-/.test(ordCall?.body?.order_id || ""), ordCall?.body?.order_id);
  t("3c. harga bayar = platinum 3120 + markup 500", pakasirPayments.length === 1 && pakasirPayments[0].amount === 3620, pakasirPayments[0]?.amount);
  t("3d. order tercatat di db (buat .topupstatus)", Object.values(cfg.topupOrders).some((o) => o.serviceId === "12" && o.price === 3620), JSON.stringify(Object.keys(cfg.topupOrders)));
  t("3e. struk SUKSES dikirim ke DM buyer", dms().some((d) => d.jid === "62812buyer@s.whatsapp.net" && d.text.includes("sukses")), JSON.stringify(dms()));
  t("3f. owner dapat laporan sukses", dms().some((d) => d.jid !== "62812buyer@s.whatsapp.net" && d.jid !== "reply" && d.text.includes("sukses")), JSON.stringify(dms().map((d) => d.jid)));
}

console.log("— section 4: gagal API setelah lunas → manual owner —");
{
  sent.length = 0; orderFailMsg = "Stok produk sedang habis, silakan coba beberapa saat lagi.";
  await run({ text: "12|987654321" });
  orderFailMsg = null;
  t("4a. buyer dapat pesan gagal + proses manual", lastReply().includes("stok produk sedang habis") && lastReply().includes("manual"), lastReply());
  t("4b. owner di-DM buat proses manual/refund", dms().some((d) => d.jid !== "62812buyer@s.whatsapp.net" && d.jid !== "reply" && d.text.includes("manual")), JSON.stringify(dms().map((d) => d.jid)));
}

console.log("— section 5: pembayaran batal/kedaluwarsa —");
{
  fakeTrxStatus = "canceled"; sent.length = 0; pediaCalls.length = 0;
  await run({ text: "12|987654321" });
  t("5a. pembayaran dicancel → order gak dikirim ke API", lastReply().includes("dibatalkan") && !pediaCalls.some((c) => c.url.endsWith("/api/order")), lastReply());
  fakeTrxStatus = "pending"; sent.length = 0; pediaCalls.length = 0;
  await run({ text: "12|987654321" });
  t("5b. kedaluwarsa → pesanan tidak dibuat", lastReply().includes("kedaluwarsa") && !pediaCalls.some((c) => c.url.endsWith("/api/order")), lastReply());
  fakeTrxStatus = "completed";
}

console.log("— section 6: topupstatus —");
{
  const ordId = Object.keys(cfg.topupOrders)[0];
  sent.length = 0; statusSeq = ["Proses", "Sukses"];
  await run({ command: "topupstatus", text: ordId });
  t("6a. buyer cek order sendiri → status", lastReply().includes("order id: " + sc(ordId)), lastReply());
  sent.length = 0;
  await run({ command: "topupstatus", text: "TOP-NONEXIST" });
  t("6b. order asing gak ketemu → ditolak", lastReply().includes("gak ketemu"), lastReply());
  sent.length = 0;
  await run({ command: "topupstatus", sender: "62899other@s.whatsapp.net", text: ordId });
  t("6c. orang lain cek order bukan miliknya → ditolak", lastReply().includes("bukan punya kamu"), lastReply());
}

console.log("— section 7: validasi input —");
{
  sent.length = 0;
  await run({ text: "" });
  t("7a. tanpa argumen → guide format", lastReply().includes("ordertopup"), lastReply());
  sent.length = 0;
  await run({ text: "777|987654321" });
  t("7b. layanan gak ada → error jelas", lastReply().includes("gak ketemu"), lastReply());
  sent.length = 0;
  await run({ text: "12|ab" });
  t("7c. target pendek/invalid → ditolak", lastReply().includes("minimal 4"), lastReply());
  sent.length = 0;
  await run({ text: '12|<script>alert(1)</script>' });
  t("7d. karakter berbahaya dibersihin (API anti-XSS)", (() => {
    const call = pediaCalls.find((c) => c.url.endsWith("/api/order") && c.body.order_id);
    return lastReply().length > 0 && (!call || !String(call.body.target_id).includes("<"));
  })(), lastReply());
}

console.log("— section 8: status Proses lama → info cek manual —");
{
  sent.length = 0; statusSeq = ["Proses"];
  fakeTrxStatus = "completed";
  await run({ text: "12|987654321|2147" });
  t("8a. masih proses → arahkan .topupstatus", lastReply().includes("diproses") && lastReply().includes("topupstatus"), lastReply());
  statusSeq = ["Sukses"];
}

plug._resetPakasirFactoryForTest();
plug._resetPediaHttpForTest();
plug._resetOrderTimingsForTest();
plug._resetStatusTimingsForTest();
fs.rmSync(dbDir, { recursive: true, force: true });
console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
