// RARA AI WHATSAPP BOT — E2E: AUTO ORDER SMM PACIFIC (api.pacific-pedia.co.id)
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

const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "pacific-e2e-"));
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(path.join(dbDir, "db"));

const lib = await import(R + "/src/lib/rara-auto-order.js");
const pac = await import(R + "/src/lib/rara-pacific.js");
const plug = await import(R + "/plugins/panel/ordersmm.js");
const cfgPlug = await import(R + "/plugins/owner/autoorder.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();

// ─── seams: timing cepat ───
plug._setOrderTimingsForTest(5, 300);
plug._setStatusTimingsForTest(5, 300);

const sent = [];
const mkSock = () => ({
  sendMessage: async (jid, payload, opts) => { sent.push({ jid, payload, opts }); return { key: { id: "m1", remoteJid: jid } }; },
});
const mkM = (over = {}) => ({
  text: "", args: [], command: "ordersmm", prefix: ".", chat: "62812buyer@s.whatsapp.net",
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

// ─── fake http Pacific (form-urlencoded via URLSearchParams) ───
const API_KEY = "pacific-e2e-key-123";
const pacCalls = [];
let orderFailMsg = null;
let statusSeq = ["Success"];
const SERVICES = [
  { sid: "1", kategori: "Instagram Followers", layanan: "Instagram Followers [Max 5K]", catatan: "instan", min: "100", max: "5000", harga: "3500", tipe: "Default", refill: true, cancel: false, rate: "1000" },
  { sid: "2", kategori: "Instagram Followers Indonesia", layanan: "Paket 500 Followers Indonesia [Real]", catatan: "paket", min: "1", max: "1", harga: "45000", tipe: "Package", refill: false, cancel: false, rate: "1" },
];
const fakeHttp = {
  post: async (url, form) => {
    pacCalls.push({ url, action: form.get("action"), form: Object.fromEntries(form.entries()) });
    if (form.get("api_key") !== API_KEY) return { status: 200, data: { status: false, data: { pesan: "API Key Salah" } } };
    const act = form.get("action");
    if (url.includes("/profile") && act === "profile") {
      return { status: 200, data: { status: true, data: { nama: "E2E", username: "e2e", saldo_sosmed: "150000" } } };
    }
    if (act === "layanan") return { status: 200, data: { status: true, data: SERVICES } };
    if (act === "pemesanan") {
      if (orderFailMsg) return { status: 200, data: { status: false, data: { pesan: orderFailMsg } } };
      return { status: 200, data: { status: true, data: { id: "1992837", layanan: "Instagram Followers", target: form.get("target"), harga: "3500", jumlah: form.get("jumlah"), status: "Pending", start_count: "0" } } };
    }
    if (act === "status") {
      const st = statusSeq.length > 1 ? statusSeq.shift() : statusSeq[0];
      return { status: 200, data: { status: true, data: { id: form.get("id"), status: st, start_count: "500", remains: "0" } } };
    }
    if (act === "refill") {
      return { status: 200, data: { status: true, data: { id: "88273", pesan: "Refill berhasil diajukan" } } };
    }
    return { status: 200, data: { status: false, data: { pesan: "action gak dikenal" } } };
  },
};
plug._setPacificHttpForTest(fakeHttp);

// ─── config dasar ───
const db = getDatabase();
const cfg = lib.ensureOrderCfg(db);
cfg.on = true;
cfg.pakasir.slug = "e2e-slug";
cfg.pakasir.apikey = "e2e-pakasir-key";
cfg.pacific.apiKey = API_KEY;
cfg.pacific.markupPct = 20;
db.save();

const run = (over = {}) => plug.handler(mkM(over), { sock: mkSock(), db });
const replies = () => sent.filter((s) => s.jid === "reply").map((s) => sc(s.payload.text));
const dms = () => sent.filter((s) => s.jid !== "reply").map((s) => ({ jid: s.jid, text: sc(s.payload?.text || s.payload?.caption || "") }));
const lastReply = () => replies()[replies().length - 1] || "";

console.log("— section 1: guard & config owner —");
{
  cfg.on = false;
  await run({ text: "1|username_ig|1000" });
  t("1a. autoorder mati → ditolak", lastReply().includes("tidak aktif"), lastReply());
  cfg.on = true;
  const savedKey = cfg.pacific.apiKey; cfg.pacific.apiKey = "";
  await run({ text: "1|username_ig|1000" });
  t("1b. API Pacific belum di-set → ditolak", lastReply().includes("belum set"), lastReply());
  cfg.pacific.apiKey = savedKey;
  await cfgPlug.handler(mkM({ command: "autoorder", args: ["pacific", "newkey987654321"], sender: "owner@x", text: "pacific newkey987654321" }), { sock: mkSock(), db });
  t("1c. owner: .autoorder pacific tersimpan (apikey dimasker, kunci penuh gak bocor)", lastReply().includes("apikey") && !lastReply().includes("newkey987654321") && cfg.pacific.apiKey === "newkey987654321", lastReply());
  cfg.pacific.apiKey = API_KEY; db.save();
  await cfgPlug.handler(mkM({ command: "autoorder", args: ["markupsmm", "20"], sender: "owner@x", text: "markupsmm 20" }), { sock: mkSock(), db });
  t("1d. owner: .autoorder markupsmm 20", cfg.pacific.markupPct === 20, cfg.pacific.markupPct);
}

console.log("— section 2: daftar layanan —");
{
  sent.length = 0;
  await run({ command: "smmlist", text: "" });
  t("2a. smmlist: 2 layanan aktif tampil", lastReply().includes("total layanan aktif: 2"), lastReply());
  t("2b. harga jual pakai markup +20% (3500→rp4.200, paket 45000→rp54.000)", lastReply().includes("rp4.200") && lastReply().includes("rp54.000"), lastReply());
  t("2c. badge refill hanya di layanan refill:true (tepat 1x)", (lastReply().match(/🔁 refill/g) || []).length === 1, (lastReply().match(/🔁 refill/g) || []).length);
  sent.length = 0;
  await run({ command: "smmlist", text: "followers indonesia" });
  t("2d. keyword filter narik layanan paket", lastReply().includes("paket 500 followers indonesia") && !lastReply().includes("max 5k"), lastReply());
}

console.log("— section 3: flow order lunas → API → sukses —");
{
  sent.length = 0; pacCalls.length = 0; pakasirPayments.length = 0; statusSeq = ["Success"];
  fakeTrxStatus = "completed";
  await run({ text: "1|username_ig|1000" });
  const ordCall = pacCalls.find((c) => c.action === "pemesanan");
  t("3a. order dikirim action=pemesanan + form api_key/sid/target/jumlah benar", !!ordCall && ordCall.form.layanan === "1" && ordCall.form.target === "username_ig" && ordCall.form.jumlah === "1000" && ordCall.form.api_key === API_KEY, ordCall?.form);
  t("3b. harga bayar = modal 3500 (rate 1000 × 1000) + 20% = 4200", pakasirPayments.length === 1 && pakasirPayments[0].amount === 4200, pakasirPayments[0]?.amount);
  const recKey = Object.keys(cfg.smmOrders)[0];
  t("3c. order tercatat (order_id SMM-…, pacificId 1992837, refill true)", recKey?.startsWith("SMM-") && cfg.smmOrders[recKey].pacificId === "1992837" && cfg.smmOrders[recKey].refill === true, JSON.stringify(cfg.smmOrders));
  t("3d. struk SUKSES ke DM buyer", dms().some((d) => d.jid === "62812buyer@s.whatsapp.net" && d.text.includes("sukses")), JSON.stringify(dms().map((d) => d.jid)));
  t("3e. owner dapat laporan sukses", dms().some((d) => d.jid !== "62812buyer@s.whatsapp.net" && d.jid !== "reply" && d.text.includes("sukses")), JSON.stringify(dms().map((d) => d.jid)));
}

console.log("— section 4: rate '1' paket + jumlah validasi —");
{
  sent.length = 0; pakasirPayments.length = 0; fakeTrxStatus = "completed"; statusSeq = ["Success"];
  await run({ text: "2|akun_ig|1" });
  t("4a. paket rate 1: harga = 45000 + 20% = 54000", pakasirPayments.length === 1 && pakasirPayments[0].amount === 54000, pakasirPayments[0]?.amount);
  sent.length = 0;
  await run({ text: "1|username_ig|50" });
  t("4b. jumlah di bawah min (100) → ditolak", lastReply().includes("antara 100"), lastReply());
  sent.length = 0;
  await run({ text: "1|username_ig|99999" });
  t("4c. jumlah di atas maks (5000) → ditolak", lastReply().includes("antara 100"), lastReply());
}

console.log("— section 5: gagal API setelah lunas → manual owner —");
{
  sent.length = 0; orderFailMsg = "Saldo tidak mencukupi";
  await run({ text: "1|username_ig|1000" });
  orderFailMsg = null;
  t("5a. buyer dapat pesan gagal + proses manual", lastReply().includes("saldo tidak mencukupi") && lastReply().includes("manual"), lastReply());
  t("5b. owner di-DM buat proses manual/refund", dms().some((d) => d.jid !== "62812buyer@s.whatsapp.net" && d.jid !== "reply" && d.text.includes("manual")), JSON.stringify(dms().map((d) => d.jid)));
}

console.log("— section 6: pembayaran batal/kedaluwarsa —");
{
  fakeTrxStatus = "canceled"; sent.length = 0; pacCalls.length = 0;
  await run({ text: "1|username_ig|1000" });
  t("6a. pembayaran dicancel → order gak dikirim ke API", lastReply().includes("dibatalkan") && !pacCalls.some((c) => c.action === "pemesanan"), lastReply());
  fakeTrxStatus = "pending"; sent.length = 0; pacCalls.length = 0;
  await run({ text: "1|username_ig|1000" });
  t("6b. kedaluwarsa → pesanan tidak dibuat", lastReply().includes("kedaluwarsa") && !pacCalls.some((c) => c.action === "pemesanan"), lastReply());
  fakeTrxStatus = "completed";
}

console.log("— section 7: smmstatus & smmrefill —");
{
  const recKey = Object.keys(cfg.smmOrders)[0];
  sent.length = 0; statusSeq = ["Pending", "Success"];
  await run({ command: "smmstatus", text: recKey });
  t("7a. buyer cek order sendiri → status + id pacific", lastReply().includes("order id: " + sc(recKey)) && lastReply().includes("id pacific: 1992837"), lastReply());
  sent.length = 0;
  await run({ command: "smmstatus", text: "1992837" });
  t("7b. cek pakai ID pacific juga bisa", lastReply().includes("order id: " + sc(recKey)), lastReply());
  sent.length = 0;
  await run({ command: "smmstatus", sender: "62899other@s.whatsapp.net", text: recKey });
  t("7c. orang lain cek order bukan miliknya → ditolak", lastReply().includes("bukan punya kamu"), lastReply());
  sent.length = 0;
  await run({ command: "smmrefill", text: recKey });
  t("7d. refill layanan refill:true → diajukan + id refill tercatat", lastReply().includes("refill") && cfg.smmOrders[recKey].refillId === "88273", lastReply());
  // order paket (refill:false)
  sent.length = 0; statusSeq = ["Success"];
  await run({ text: "2|akun_ig|1" });
  const paketKey = Object.keys(cfg.smmOrders).find((k) => cfg.smmOrders[k].sid === "2");
  sent.length = 0;
  await run({ command: "smmrefill", text: paketKey });
  t("7e. refill layanan tanpa garansi → ditolak", lastReply().includes("gak bergaransi"), lastReply());
}

console.log("— section 8: validasi input & status lama —");
{
  sent.length = 0;
  await run({ text: "" });
  t("8a. tanpa argumen → guide format", lastReply().includes("ordersmm"), lastReply());
  sent.length = 0;
  await run({ text: "777|user|1000" });
  t("8b. sid gak ada → error jelas", lastReply().includes("gak ketemu"), lastReply());
  sent.length = 0; statusSeq = ["Processing"];
  await run({ text: "1|username_ig|1000" });
  t("8c. masih diproses → arahkan .smmstatus", lastReply().includes("diproses") && lastReply().includes("smmstatus"), lastReply());
  statusSeq = ["Success"];
}

plug._resetPakasirFactoryForTest();
plug._resetPacificHttpForTest();
plug._resetOrderTimingsForTest();
plug._resetStatusTimingsForTest();
fs.rmSync(dbDir, { recursive: true, force: true });
console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
