// RARA AI WHATSAPP BOT — E2E: APPROVE PREMIUM (buyprem pending → .approveprem)
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

const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "approveprem-e2e-"));
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(path.join(dbDir, "db"));

const buyPlug = await import(R + "/plugins/sewa-premium/buyprem.js");
const apPlug = await import(R + "/plugins/owner/approveprem.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();

const sent = [];
const mkSock = () => ({
  sendMessage: async (jid, payload, opts) => { sent.push({ jid, payload, opts }); return { key: { id: "m1", remoteJid: jid } }; },
});
const mkM = (over = {}) => ({
  text: "", args: [], command: "approveprem", prefix: ".", chat: "owner@x",
  sender: "owner@x", isGroup: false, isOwner: true, pushName: "Owner",
  reply: async (x) => { sent.push({ jid: "reply", payload: { text: String(x) } }); },
  react: async () => {},
  ...over,
});
const buyerM = (over = {}) => mkM({
  command: "buyprem", chat: "6281211111111@s.whatsapp.net", sender: "6281211111111@s.whatsapp.net",
  isOwner: false, pushName: "Buyer Satu", ...over,
});

const db = getDatabase();
const BUYER = "6281211111111";
const BUYER_JID = BUYER + "@s.whatsapp.net";

console.log("─── 1. BUYPREM CATAT PENDING ───");
sent.length = 0;
await buyPlug.handler(buyerM({ text: "30d" }), { sock: mkSock() });

const ord = db.data.premiumOrders?.pending?.[BUYER_JID];
t("1a. pesanan 30d kecatat pending", !!ord && ord.status === "pending" && ord.days === 30, JSON.stringify(ord));
t("1b. data pesanan lengkap (nomor/nama/label/harga)", ord?.phoneNumber === BUYER && ord?.name === "Buyer Satu" && ord?.label === "Bulanan" && !!ord?.price, JSON.stringify(ord));
const ownerNotif = sent.find((x) => x.jid === BUYER_JID ? false : x.payload?.text && sc(x.payload.text).includes("menunggu konfirmasi"));
t("1c. owner dinotif + arahan .approveprem", !!ownerNotif && sc(ownerNotif.payload.text).includes("approveprem " + BUYER), sc(ownerNotif?.payload?.text).slice(0, 150));

sent.length = 0;
await buyPlug.handler(buyerM({ text: "lifetime" }), { sock: mkSock() });

const ord2 = db.data.premiumOrders.pending[BUYER_JID];
t("1d. ganti paket → pending ke-update (bukan numpuk)", ord2?.days === 0 && ord2?.duration === "lifetime", JSON.stringify(ord2));

console.log("─── 2. .approveprem LIST ───");
sent.length = 0;
await apPlug.handler(mkM({ text: "", args: [] }), { sock: mkSock() });
const listTxt = sc(sent[sent.length - 1].payload.text);

t("2a. list pending nunjukin BUYER + paket", listTxt.includes("pesanan premium pending") && listTxt.includes(BUYER) && listTxt.includes("permanent"), sent[sent.length - 1].payload.text.slice(0, 150));

console.log("─── 3. APPROVE LIFETIME ───");
sent.length = 0;
await apPlug.handler(mkM({ text: BUYER + " ", args: [BUYER] }), { sock: mkSock() });
const apTxt = sc(sent.find((x) => x.jid === "reply")?.payload?.text || "");

t("3a. approve sukses + status permanent", apTxt.includes("berhasil") && apTxt.includes("permanent"), apTxt.slice(0, 150));
const prem = (db.data.premium || []).find((p) => (typeof p === "string" ? p : p.id) === BUYER);
t("3b. masuk db.data.premium TANPA expired (permanent)", !!prem && typeof prem === "object" && !("expired" in prem), JSON.stringify(prem));
t("3c. pending bersih setelah approve", !db.data.premiumOrders.pending[BUYER_JID]);
const buyerNotif = sent.find((x) => x.jid === BUYER_JID && sc(x.payload?.text || "").includes("premium berhasil"));
t("3d. BUYER dinotif aktif", !!buyerNotif && sc(buyerNotif.payload.text).includes("seumur hidup"), sc(buyerNotif?.payload?.text).slice(0, 120));
t("3e. masuk history approved", (db.data.premiumOrders.history || []).some((h) => h.status === "approved" && h.phoneNumber === BUYER));

console.log("─── 4. APPROVE 30d USER BARU ───");
sent.length = 0;
await buyPlug.handler(mkM({ command: "buyprem", chat: "6281322222222@s.whatsapp.net", sender: "6281322222222@s.whatsapp.net", isOwner: false, pushName: "Buyer Dua", text: "30d" }), { sock: mkSock() });
await apPlug.handler(mkM({ text: "6281322222222 ", args: ["6281322222222"] }), { sock: mkSock() });

const prem2 = (db.data.premium || []).find((p) => typeof p !== "string" && p.id === "6281322222222");
t("4a. premium baru + expired ≈ 30 hari", !!prem2 && typeof prem2.expired === "number" && prem2.expired > Date.now() + 29 * 864e5, JSON.stringify(prem2));
const ap2Txt = sc(sent.find((x) => x.jid === "reply" && sc(x.payload?.text || "").includes("berhasil"))?.payload?.text || "");
t("4b. struk owner nunjukin 30 hari + expired date", ap2Txt.includes("30 hari") && ap2Txt.includes("expired"), ap2Txt.slice(0, 150));

console.log("─── 5. APPROVE = EXTEND USER LAMA ───");
const before = prem2.expired;
sent.length = 0;
await buyPlug.handler(mkM({ command: "buyprem", chat: "6281322222222@s.whatsapp.net", sender: "6281322222222@s.whatsapp.net", isOwner: false, pushName: "Buyer Dua", text: "7d" }), { sock: mkSock() });
await apPlug.handler(mkM({ text: "6281322222222 ", args: ["6281322222222"] }), { sock: mkSock() });

const prem2b = (db.data.premium || []).find((p) => typeof p !== "string" && p.id === "6281322222222");
t("5a. extend: expired nambah 7 hari dari sebelumnya", prem2b.expired === before + 7 * 864e5, `${before} → ${prem2b?.expired}`);
const ap3Txt = sc(sent.filter((x) => x.jid === "reply" && sc(x.payload?.text || "").includes("berhasil")).pop()?.payload?.text || "");
t("5b. struk bilang perpanjang (isExtend di broadcast)", ap3Txt.includes("7 hari"));

console.log("─── 6. TOLAK ───");
sent.length = 0;
await buyPlug.handler(mkM({ command: "buyprem", chat: "6281433333333@s.whatsapp.net", sender: "6281433333333@s.whatsapp.net", isOwner: false, pushName: "Buyer Tiga", text: "30d" }), { sock: mkSock() });
await apPlug.handler(mkM({ text: "6281433333333 tolak bukti transfer gak jelas", args: ["6281433333333", "tolak", "bukti", "transfer", "gak", "jelas"] }), { sock: mkSock() });

const rejReplies = sent.filter((x) => x.jid === "reply");
const rejTxt = sc(rejReplies[rejReplies.length - 1]?.payload?.text || "");
t("6a. tolak → status ditolak", rejTxt.includes("ditolak"), rejTxt.slice(0, 120));
const rejBuyerMsgs = sent.filter((x) => x.jid === "6281433333333@s.whatsapp.net" && x.payload?.text);
const rejNotif = rejBuyerMsgs[rejBuyerMsgs.length - 1];
t("6b. BUYER dinotif tolak + alasan", !!rejNotif && sc(rejNotif.payload.text).includes("ditolak") && sc(rejNotif.payload.text).includes("bukti transfer gak jelas"), sc(rejNotif?.payload?.text).slice(0, 120));
t("6c. gak masuk premium list", !(db.data.premium || []).some((p) => (typeof p === "string" ? p : p.id) === "6281433333333"));
t("6d. masuk history rejected", (db.data.premiumOrders.history || []).some((h) => h.status === "rejected" && h.rejectReason?.includes("bukti transfer")));

console.log("─── 7. EDGE CASES ───");
sent.length = 0;
await apPlug.handler(mkM({ text: "", args: [] }), { sock: mkSock() });
t("7a. semua selesai → list kosong jujur", sc(sent[sent.length - 1].payload.text).includes("tidak ada pesanan premium"));

await apPlug.handler(mkM({ text: "6289999999999 gakada ", args: ["6289999999999"] }), { sock: mkSock() });
t("7b. nomor gak ada pending → jujur", sc(sent[sent.length - 1].payload.text).includes("tidak ada pesanan"));

await apPlug.handler(mkM({ text: "12345 ", args: ["12345"] }), { sock: mkSock() });
t("7c. nomor kependekan → jujur", sc(sent[sent.length - 1].payload.text).includes("tidak valid"));


console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
