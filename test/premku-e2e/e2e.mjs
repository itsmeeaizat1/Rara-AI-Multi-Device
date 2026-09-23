// NOVA AI WHATSAPP BOT — E2E: AUTO ORDER APP PREMIUM PREMKU (premku.com)
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

const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "premku-e2e-"));
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(path.join(dbDir, "db"));

const lib = await import(R + "/src/lib/nova-auto-order.js");
const plug = await import(R + "/plugins/panel/orderprem.js");
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
  text: "", args: [], command: "orderprem", prefix: ".", chat: "62812buyer@s.whatsapp.net",
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

// ─── fake http Premku (JSON) ───
const API_KEY = "premku-e2e-key-12345678";
const premCalls = [];
let orderFailMsg = null;
const PRODUCTS = [
  { id: 4, name: "Capcut Pro 1 Minggu Private", description: "PRO PLAN", product_type: "Capcut Pro", price: 4000, original_price: 100000, status: "available", stock: 7, image: "https://cdn.premku.com/img/capcut.png" },
  { id: 9, name: "Netflix Sharing 1 Bulan", description: "SHARING PLAN", product_type: "Netflix", price: 25000, original_price: 120000, status: "available", stock: 3, image: "https://cdn.premku.com/img/netflix.png" },
  { id: 11, name: "Stok Habis Test", description: "-", product_type: "Test", price: 1000, original_price: 2000, status: "available", stock: 0, image: "" },
];
let statusDetail = { invoice: "PRM-TEST-001", status: "Sukses", akun: "email:test@x.com|pass:secret123" };
const fakeHttp = {
  post: async (url, body) => {
    premCalls.push({ url, body: { ...body } });
    if (body.api_key !== API_KEY) return { status: 200, data: { success: false, message: "API Key is required." } };
    if (url.endsWith("/profile")) return { status: 200, data: { success: true, data: { username: "e2e", whatsapp: "62", saldo: 50000, registered_at: "2026-01-01" } } };
    if (url.endsWith("/products")) return { status: 200, data: { success: true, products: PRODUCTS } };
    if (url.endsWith("/order")) {
      if (orderFailMsg) return { status: 400, data: { success: false, message: orderFailMsg } };
      const p = PRODUCTS.find((x) => String(x.id) === String(body.product_id));
      return { status: 200, data: { success: true, data: { invoice: "PRM-TEST-001", product: p?.name, qty: body.qty, total: (p?.price || 0) * body.qty, status: "Pending" } } };
    }
    if (url.endsWith("/status")) {
      if (String(body.invoice) === "PRM-TEST-001") return { status: 200, data: { success: true, data: statusDetail } };
      return { status: 200, data: { success: false, message: "Order tidak ditemukan" } };
    }
    return { status: 200, data: { success: false, message: "endpoint gak dikenal" } };
  },
};
plug._setPremkuHttpForTest(fakeHttp);

// ─── config dasar ───
const db = getDatabase();
const cfg = lib.ensureOrderCfg(db);
cfg.on = true;
cfg.pakasir.slug = "e2e-slug";
cfg.pakasir.apikey = "e2e-pakasir-key";
cfg.premku.apiKey = API_KEY;
cfg.premku.markup = 2000;
db.save();

const run = (over = {}) => plug.handler(mkM(over), { sock: mkSock(), db });
const replies = () => sent.filter((s) => s.jid === "reply").map((s) => sc(s.payload.text));
const dms = () => sent.filter((s) => s.jid !== "reply").map((s) => ({ jid: s.jid, text: sc(s.payload?.text || s.payload?.caption || "") }));
const lastReply = () => replies()[replies().length - 1] || "";

console.log("— section 1: guard & config owner —");
{
  cfg.on = false;
  await run({ text: "4|1" });
  t("1a. autoorder mati → ditolak", lastReply().includes("tidak aktif"), lastReply());
  cfg.on = true;
  const savedKey = cfg.premku.apiKey; cfg.premku.apiKey = "";
  await run({ text: "4|1" });
  t("1b. API Premku belum di-set → ditolak", lastReply().includes("belum set"), lastReply());
  cfg.premku.apiKey = savedKey;
  await cfgPlug.handler(mkM({ command: "autoorder", args: ["premku", "newkey987654321"], sender: "owner@x", text: "premku newkey987654321" }), { sock: mkSock(), db });
  t("1c. owner: .autoorder premku tersimpan (apikey dimasker, kunci penuh gak bocor)", lastReply().includes("apikey") && !lastReply().includes("newkey987654321") && cfg.premku.apiKey === "newkey987654321", lastReply());
  cfg.premku.apiKey = API_KEY; db.save();
  await cfgPlug.handler(mkM({ command: "autoorder", args: ["markupprem", "2000"], sender: "owner@x", text: "markupprem 2000" }), { sock: mkSock(), db });
  t("1d. owner: .autoorder markupprem 2000", cfg.premku.markup === 2000, cfg.premku.markup);
}

console.log("— section 2: daftar produk —");
{
  sent.length = 0;
  await run({ command: "premkulist", text: "" });
  t("2a. premkulist: produk available+stok>0 tampil (2), stok 0 disembunyiin", lastReply().includes("total produk aktif: 2") && !lastReply().includes("stok habis test"), lastReply());
  t("2b. harga = produk + markup 2000 (4000→rp6.000, 25000→rp27.000)", lastReply().includes("rp6.000") && lastReply().includes("rp27.000"), lastReply());
  sent.length = 0;
  await run({ command: "premkulist", text: "netflix" });
  t("2c. keyword filter narik produk netflix", lastReply().includes("netflix sharing 1 bulan") && !lastReply().includes("capcut"), lastReply());
}

console.log("— section 3: flow order lunas → API → struk —");
{
  sent.length = 0; premCalls.length = 0; pakasirPayments.length = 0;
  fakeTrxStatus = "completed";
  await run({ text: "4|2" });
  const ordCall = premCalls.find((c) => c.url.endsWith("/order"));
  t("3a. order dikirim JSON product_id + qty benar", !!ordCall && Number(ordCall.body.product_id) === 4 && ordCall.body.qty === 2 && ordCall.body.api_key === API_KEY, JSON.stringify(ordCall?.body));
  t("3b. harga bayar = 4000×2 + markup 2000 = 10000", pakasirPayments.length === 1 && pakasirPayments[0].amount === 10000, pakasirPayments[0]?.amount);
  const recKey = Object.keys(cfg.premOrders)[0];
  t("3c. order tercatat (order_id PREM-…, invoice PRM-TEST-001)", recKey?.startsWith("PREM-") && cfg.premOrders[recKey].invoice === "PRM-TEST-001", JSON.stringify(cfg.premOrders));
  t("3d. struk ke DM buyer + detail akun provider ikut", dms().some((d) => d.jid === "62812buyer@s.whatsapp.net" && d.text.includes("akun:")), JSON.stringify(dms().map((d) => d.jid)));
  t("3e. owner dapat laporan", dms().some((d) => d.jid !== "62812buyer@s.whatsapp.net" && d.jid !== "reply" && d.text.includes("order pre")), JSON.stringify(dms().map((d) => d.jid)));
  // qty default 1 tanpa |qty
  sent.length = 0; pakasirPayments.length = 0;
  await run({ text: "9" });
  t("3f. qty kosong = 1 (harga 25000+2000=27000)", pakasirPayments.length === 1 && pakasirPayments[0].amount === 27000, pakasirPayments[0]?.amount);
}

console.log("— section 4: stok & qty validasi —");
{
  sent.length = 0;
  await run({ text: "11|1" });
  t("4a. stok 0 → ditolak", lastReply().includes("stok") && lastReply().includes("tinggal 0"), lastReply());
  sent.length = 0;
  await run({ text: "9|5" });
  t("4b. qty melebihi stok → ditolak", lastReply().includes("stok") && lastReply().includes("kurangi qty"), lastReply());
  sent.length = 0;
  await run({ text: "4|0" });
  t("4c. qty 0 → ditolak", lastReply().includes("qty antara 1-10"), lastReply());
  sent.length = 0;
  await run({ text: "999|1" });
  t("4d. produk gak ada → error jelas", lastReply().includes("gak ketemu"), lastReply());
}

console.log("— section 5: gagal API setelah lunas → manual owner —");
{
  sent.length = 0; orderFailMsg = "Saldo tidak mencukupi.";
  await run({ text: "4|1" });
  orderFailMsg = null;
  t("5a. buyer dapat pesan gagal + proses manual", lastReply().includes("saldo tidak mencukupi") && lastReply().includes("manual"), lastReply());
  t("5b. owner di-DM buat proses manual/refund", dms().some((d) => d.jid !== "62812buyer@s.whatsapp.net" && d.jid !== "reply" && d.text.includes("manual")), JSON.stringify(dms().map((d) => d.jid)));
}

console.log("— section 6: pembayaran batal/kedaluwarsa —");
{
  fakeTrxStatus = "canceled"; sent.length = 0; premCalls.length = 0;
  await run({ text: "4|1" });
  t("6a. pembayaran dicancel → order gak dikirim ke API", lastReply().includes("dibatalkan") && !premCalls.some((c) => c.url.endsWith("/order")), lastReply());
  fakeTrxStatus = "pending"; sent.length = 0; premCalls.length = 0;
  await run({ text: "4|1" });
  t("6b. kedaluwarsa → pesanan tidak dibuat", lastReply().includes("kedaluwarsa") && !premCalls.some((c) => c.url.endsWith("/order")), lastReply());
  fakeTrxStatus = "completed";
}

console.log("— section 7: premstatus —");
{
  const recKey = Object.keys(cfg.premOrders)[0];
  sent.length = 0;
  await run({ command: "premstatus", text: recKey });
  t("7a. buyer cek order sendiri → status + detail generik", lastReply().includes("order id: " + sc(recKey)) && lastReply().includes("akun: email"), lastReply());
  sent.length = 0;
  await run({ command: "premstatus", text: "PRM-TEST-001" });
  t("7b. cek pakai invoice Premku juga bisa", lastReply().includes("order id: " + sc(recKey)), lastReply());
  sent.length = 0;
  await run({ command: "premstatus", sender: "62899other@s.whatsapp.net", text: recKey });
  t("7c. orang lain cek order bukan miliknya → ditolak", lastReply().includes("bukan punya kamu"), lastReply());
  sent.length = 0;
  await run({ command: "premstatus", text: "PREM-NONEXIST" });
  t("7d. order asing → gak ketemu", lastReply().includes("gak ketemu"), lastReply());
}

console.log("— section 8: invoice gak kebaca di respon order ─");
{
  sent.length = 0;
  const origPost = fakeHttp.post;
  fakeHttp.post = async (url, body) => {
    if (url.endsWith("/order") && body.api_key === API_KEY && !orderFailMsg) {
      return { status: 200, data: { success: true, data: { product: "X", qty: body.qty } } }; // tanpa invoice
    }
    return origPost(url, body);
  };
  await run({ text: "4|1" });
  fakeHttp.post = origPost;
  t("8a. respon tanpa invoice → jujur ke buyer + owner disuruh cek dashboard", lastReply().includes("invoice-nya belum kebaca") || lastReply().includes("belum kebaca"), lastReply());
  t("8b. owner di-DM raw respon", dms().some((d) => d.jid !== "62812buyer@s.whatsapp.net" && d.jid !== "reply" && d.text.includes("raw")), JSON.stringify(dms().map((d) => d.jid)));
}

plug._resetPakasirFactoryForTest();
plug._resetPremkuHttpForTest();
plug._resetOrderTimingsForTest();
plug._resetStatusTimingsForTest();
fs.rmSync(dbDir, { recursive: true, force: true });
console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
