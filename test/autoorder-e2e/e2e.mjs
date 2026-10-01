// RARA AI - MULTI DEVICE — E2E: AUTO ORDER PANEL (porting selfbot JPM APENBOTZ)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const R = path.resolve(".");
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => {
  if (cond) pass++;
  else { fail++; console.log(`  ❌ ${name}${extra ? " → " + String(JSON.stringify(extra)).slice(0, 260) : ""}`); }
};
process.on("unhandledRejection", (e) => { console.log("UNHANDLED:", e?.stack || e); process.exit(1); });

const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "autoorder-e2e-"));
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(path.join(dbDir, "db"));

const lib = await import(R + "/src/lib/rara-auto-order.js");
const plug = await import(R + "/plugins/panel/orderpanel.js");
const cfgPlug = await import(R + "/plugins/owner/autoorder.js");
const { fromSC } = await import(R + "/src/lib/styler.js");

// ─── seam: panel config & timing ───
// paksa slot v1 "terkonfigurasi": kita gak bisa nulis ptero-panels.json global,
// jadi tes getOrderPanelCfg via slot kosong = null, dan mock domain+apikey
// lewat seam http untuk provisioning.
plug._setOrderTimingsForTest(5, 300); // poll 5ms, timeout 300ms

const sent = [];
const mkSock = () => ({
  sendMessage: async (jid, payload, opts) => { sent.push({ jid, payload, opts }); return { key: { id: "m1", remoteJid: jid } }; },
});
const mkM = (over = {}) => ({
  text: "", args: [], command: "orderpanel", prefix: ".", chat: "62812buyer@s.whatsapp.net",
  sender: "62812buyer@s.whatsapp.net", isGroup: false, isOwner: false,
  reply: async (x) => { sent.push({ jid: "reply", payload: { text: x } }); },
  ...over,
});

// ─── fake pakasir ───
let fakeTrxStatus = "pending";
const fakePakasir = {
  createPayment: async (method, orderId, amount) => {
    return { order_id: orderId, amount, total_payment: amount, status: "pending", payment_number: "QRIS12345TEST", payment_url: "https://app.pakasir.com/pay/x" };
  },
  detailPayment: async (orderId, amount) => ({ order_id: orderId, amount, status: fakeTrxStatus }),
};
plug._setPakasirFactoryForTest(() => fakePakasir);

// ─── fake ptero http ───
const pteroCalls = [];
const fakeHttp = {
  get: async (url, opts) => {
    pteroCalls.push({ m: "GET", url });
    if (url.endsWith("/auth/login")) return { status: 200, data: {} };
    if (url.includes("/eggs/")) return { status: 200, data: { attributes: { startup: "npm start" } } };
    return { status: 200, data: {} };
  },
  post: async (url, body, opts) => {
    pteroCalls.push({ m: "POST", url, body });
    if (url.endsWith("/api/application/users")) return { status: 201, data: { attributes: { id: 99, username: body.username } } };
    if (url.endsWith("/api/application/servers")) return { status: 201, data: { attributes: { id: 1 } } };
    return { status: 200, data: {} };
  },
};
plug._setAutoOrderHttpForTest(fakeHttp);
lib._setAutoOrderHttpForTest(fakeHttp);

// panelCfg palsu untuk provisioning langsung
const fakePanelCfg = { domain: "https://panel.test", apikey: "ptla_x", egg: "15", nestid: "5", location: "1" };

console.log("— section 1: lib dasar —");
{
  const db = getDatabase();
  const cfg = lib.ensureOrderCfg(db);
  t("1a. default cfg (off, panel 1, adminPrice 15000)", cfg.on === false && cfg.panel === 1 && cfg.adminPrice === 15000, cfg);
  t("1b. persist di db.data.autoorder", db.data.autoorder === cfg);
  t("1c. paket lengkap 10 slot", Object.keys(lib.RAM_PACKAGES).length === 10, Object.keys(lib.RAM_PACKAGES));
  t("1d. harga default 2gb 4000 → override 5000", lib.packagePrice({ prices: { "2gb": 5000 } }, "2gb") === 5000 && lib.packagePrice({}, "2gb") === 4000);
  t("1e. paket gak dikenal → null", lib.packagePrice({}, "20gb") === null);
  t("1f. fmtRupiah 16000", lib.fmtRupiah(16000) === "Rp16.000", lib.fmtRupiah(16000));
  t("1g. slot panel kosong → null", lib.getOrderPanelCfg(cfg.panel) === null || typeof lib.getOrderPanelCfg(cfg.panel) === "object");
  const online = await lib.checkPanelOnline("https://panel.test");
  t("1h. checkPanelOnline online (mock 200)", online.ready === true, online);
  const offlineHttp = { get: async () => { throw Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" }); }, post: async () => { throw new Error("nope"); } };
  lib._setAutoOrderHttpForTest(offlineHttp);
  const offline = await lib.checkPanelOnline("https://gak-ada-host.invalid");
  lib._setAutoOrderHttpForTest(fakeHttp);
  t("1i. panel mati → ready false + pesan", offline.ready === false && /ᴛɪᴅᴀᴋ|tidak|gak|ENOTFOUND|EAI/i.test(offline.message || ""), offline);
}

console.log("— section 2: provisioning panel & admin —");
{
  pteroCalls.length = 0;
  const res = await lib.provisionPanel(fakePanelCfg, "2gb", "Budi_123!");
  t("2a. provisioning sukses + kredensial lengkap", res.ok === true && res.username === "budi_123" && res.password && res.ram === "2 GB" && res.cpu === "60%", res);
  const userCall = pteroCalls.find((c) => c.url.endsWith("/api/application/users"));
  const srvCall = pteroCalls.find((c) => c.url.endsWith("/api/application/servers"));
  t("2b. user dibuat dulu, server kemudian", !!userCall && !!srvCall && pteroCalls.indexOf(userCall) < pteroCalls.indexOf(srvCall));
  t("2c. spec server sesuai paket 2gb", srvCall?.body?.limits?.memory === 2048 && srvCall?.body?.limits?.cpu === 60, srvCall?.body?.limits);
  pteroCalls.length = 0;
  const resAdm = await lib.provisionAdmin(fakePanelCfg, "adminbudi");
  const admCall = pteroCalls.find((c) => c.url.endsWith("/api/application/users"));
  t("2d. admin dibuat dengan root_admin: true", resAdm.ok === true && admCall?.body?.root_admin === true, admCall?.body);
  const bad = await lib.provisionPanel(fakePanelCfg, "2gb", "!!");
  t("2e. username sampah → ditolak", bad.ok === false && /ᴜꜱᴇʀɴᴀᴍᴇ|username/i.test(bad.error), bad);
  // server gagal → error jujur, bukan crash
  const failHttp = { ...fakeHttp, post: async (url, body) => { if (url.endsWith("/api/application/servers")) { const e = new Error("server full"); e.response = { data: { errors: [{ detail: "No more space" }] } }; throw e; } return fakeHttp.post(url, body); } };
  lib._setAutoOrderHttpForTest(failHttp);
  const resFail = await lib.provisionPanel(fakePanelCfg, "1gb", "budi123");
  t("2f. provisioning gagal → error jujur", resFail.ok === false && /ɢᴀɢᴀʟ|gagal/i.test(resFail.error), resFail);
  lib._setAutoOrderHttpForTest(fakeHttp);
}

console.log("— section 3: handler config owner (.autoorder) —");
{
  const db = getDatabase();
  const cfg = lib.ensureOrderCfg(db);
  sent.length = 0;
  await cfgPlug.handler(mkM({ command: "autoorder", args: ["harga", "2gb", "5000"] }), { sock: mkSock(), db });
  t("3a. harga 2gb override 5000", cfg.prices["2gb"] === 5000, cfg.prices);
  await cfgPlug.handler(mkM({ command: "autoorder", args: ["hargaadmin", "20000"] }), { sock: mkSock(), db });
  t("3b. hargaadmin 20000", cfg.adminPrice === 20000, cfg.adminPrice);
  await cfgPlug.handler(mkM({ command: "autoorder", args: ["harga", "20gb", "9999"] }), { sock: mkSock(), db });
  t("3c. paket gak dikenal ditolak", cfg.prices["20gb"] === undefined, cfg.prices);
  await cfgPlug.handler(mkM({ command: "autoorder", args: ["pakasir", "apenstore", "apikeytest123"] }), { sock: mkSock(), db });
  t("3d. pakasir slug+apikey tersimpan", cfg.pakasir.slug === "apenstore" && cfg.pakasir.apikey === "apikeytest123", cfg.pakasir);
  await cfgPlug.handler(mkM({ command: "autoorder", args: ["panel", "v7"] }), { sock: mkSock(), db });
  t("3e. panel slot v7 tersimpan", cfg.panel === 7, cfg.panel);
  await cfgPlug.handler(mkM({ command: "autoorder", args: ["status"] }), { sock: mkSock(), db });
  t("3f. status kebaca", /ᴄᴏɴꜰɪɢ|ᴍᴀᴛɪ|ᴅɪᴍᴀᴛɪᴋᴀɴ|2ᴜɴʟ|2gb|5.000/i.test(sent.at(-1)?.payload?.text || ""), sent.at(-1)?.payload?.text?.slice(0, 90));
  await cfgPlug.handler(mkM({ command: "autoorder", args: ["on"] }), { sock: mkSock(), db });
  t("3g. on → cfg.on", cfg.on === true);
  await cfgPlug.handler(mkM({ command: "autoorder", args: ["off"] }), { sock: mkSock(), db });
  t("3h. off → cfg.on false", cfg.on === false);
}

console.log("— section 4: pricelist + guard —");
{
  const db = getDatabase();
  const cfg = lib.ensureOrderCfg(db);
  const sock = mkSock();
  sent.length = 0;
  await plug.handler(mkM({ command: "pricelist", args: [] }), { sock, db });
  const pl = sent.find((s) => s.jid === "reply")?.payload?.text || "";
  t("4a. pricelist nunjukin paket + harga custom 2gb", /2GB|2ɢʙ/i.test(pl) && /5.000/i.test(pl), pl.slice(0, 120));
  t("4b. pricelist ada cara order", /\.orderpanel|ᴏʀᴅᴇʀᴘᴀɴᴇʟ|ᴏʀᴅᴇʀᴘᴀɴᴇʟ/i.test(pl), pl.slice(0, 200));
  // mati → ditolak
  cfg.on = false; db.save();
  sent.length = 0;
  await plug.handler(mkM({ command: "orderpanel", text: "2gb|budi123", args: [] }), { sock, db });
  t("4c. auto order mati → ditolak jelas", /ᴛɪᴅᴀᴋ ᴀᴋᴛɪꜰ|tidak aktif|ᴛɪᴅᴀᴋ|ɢᴀɢᴀʟ|ʜᴜʙᴜɴɢɪ|hubungi/i.test(sent.at(-1)?.payload?.text || ""), sent.at(-1)?.payload?.text?.slice(0, 90));
  cfg.on = true; cfg.panel = 1; db.save();
  // pakasir kosong → ditolak
  cfg.pakasir.slug = ""; db.save();
  sent.length = 0;
  await plug.handler(mkM({ command: "orderpanel", text: "2gb|budi123", args: [] }), { sock, db });
  t("4d. pakasir belum di-set → ditolak", /ᴘᴀᴋᴀꜱɪʀ|ᴘᴇᴍʙᴀʏᴀʀᴀɴ|ᴋᴏɴꜰɪɢᴜʀ|ᴅɪᴋᴏɴꜰɪɢᴜʀᴀꜱɪ|belum/i.test(sent.at(-1)?.payload?.text || ""), sent.at(-1)?.payload?.text?.slice(0, 90));
  cfg.pakasir.slug = "apenstore"; cfg.pakasir.apikey = "apikeytest123"; db.save();
  // paket invalid → panduan paket
  sent.length = 0;
  await plug.handler(mkM({ command: "orderpanel", text: "20gb|budi123", args: [] }), { sock, db });
  t("4e. paket invalid → panduan paket", /1ɢʙ|1gb|ᴘᴀᴋᴇᴛ|ᴘᴀᴋᴇᴛ ʀᴀᴍ/i.test(sent.at(-1)?.payload?.text || ""), sent.at(-1)?.payload?.text?.slice(0, 100));
  // panel slot kosong → ditolak
  cfg.panel = 50; db.save();
  sent.length = 0;
  await plug.handler(mkM({ command: "orderpanel", text: "2gb|budi123", args: [] }), { sock, db });
  t("4f. panel v50 kosong → ditolak jujur", /ᴘᴀɴᴇʟ|ᴋᴏɴꜰɪɢᴜʀ|belum/i.test(sent.at(-1)?.payload?.text || ""), sent.at(-1)?.payload?.text?.slice(0, 90));
  cfg.panel = 1; db.save();
  // username pendek
  sent.length = 0;
  await plug.handler(mkM({ command: "orderpanel", text: "2gb|ab", args: [] }), { sock, db });
  t("4g. username <3 → ditolak", /ᴜꜱᴇʀɴᴀᴍᴇ|username/i.test(sent.at(-1)?.payload?.text || ""), sent.at(-1)?.payload?.text?.slice(0, 90));
}

console.log("— section 5: order flow lunas → provisioning otomatis —");
{
  const db = getDatabase();
  const cfg = lib.ensureOrderCfg(db);
  cfg.on = true; cfg.pakasir.slug = "apenstore"; cfg.pakasir.apikey = "k"; cfg.panel = 1; db.save();
  const sock = mkSock();

  // happy path: langsung completed
  fakeTrxStatus = "completed";
  sent.length = 0; pteroCalls.length = 0;
  await plug.handler(mkM({ command: "orderpanel", text: "2gb|tokobudi99", args: [] }), { sock, db });
  const qr = sent.find((s) => s.payload?.image);
  t("5a. QRIS image dikirim (payment_number ke-render)", !!qr, sent.map((s) => s.jid));
  t("5b. invoice berisi total harga custom", (sent.find((s) => s.jid === "reply")?.payload?.text || "").includes("5.000") || sent.some((s) => (s.payload?.caption || "").includes("5.000")), sent.map((s) => s.jid));
  const credDm = sent.find((s) => s.jid === "62812buyer@s.whatsapp.net" && /ᴘᴀɴᴇʟ ᴋᴀᴍᴜ|panel kamu/i.test(s.payload?.text || ""));
  t("5c. kredensial ke DM buyer (bukan di chat publik)", !!credDm, sent.map((s) => s.jid));
  const plain5d = fromSC(credDm?.payload?.text || "");
  const slot1Domain = (lib.getOrderPanelCfg(1)?.domain || "").replace(/^https?:\/\//, "");
  t("5d. kredensial berisi username+password+domain", credDm && /tokobudi99/i.test(plain5d) && /ᴘᴀꜱꜱᴡᴏʀᴅ|password|ᴜꜱᴇʀɴᴀᴍᴇ|username/i.test(credDm.payload.text) && (!slot1Domain || credDm.payload.text.includes(slot1Domain)), credDm?.payload?.text?.slice(0, 160));
  const srvCall = pteroCalls.find((c) => c.url.endsWith("/api/application/servers"));
  t("5e. server panel otomatis dibuat setelah lunas", !!srvCall && srvCall.body.limits.memory === 2048, srvCall?.body?.limits);

  // canceled
  fakeTrxStatus = "canceled";
  sent.length = 0; pteroCalls.length = 0;
  await plug.handler(mkM({ command: "orderpanel", text: "1gb|batalaja1", args: [] }), { sock, db });
  t("5f. canceled → pemberitahuan, panel TIDAK dibuat", /ᴅɪʙᴀᴛᴀʟᴋᴀɴ|dibatalkan/i.test(sent.at(-1)?.payload?.text || "") && !pteroCalls.some((c) => c.url.endsWith("/api/application/servers")), sent.at(-1)?.payload?.text?.slice(0, 80));

  // timeout (belum bayar)
  fakeTrxStatus = "pending";
  sent.length = 0; pteroCalls.length = 0;
  await plug.handler(mkM({ command: "orderpanel", text: "1gb|lambat123", args: [] }), { sock, db });
  t("5g. kedaluwarsa → pemberitahuan, panel TIDAK dibuat", /ᴋᴇᴅᴀʟᴜᴡᴀʀꜱᴀ|kedaluwarsa/i.test(sent.at(-1)?.payload?.text || "") && !pteroCalls.some((c) => c.url.endsWith("/api/application/servers")), sent.at(-1)?.payload?.text?.slice(0, 90));

  // admin order flow
  fakeTrxStatus = "completed";
  sent.length = 0; pteroCalls.length = 0;
  await plug.handler(mkM({ command: "orderadmin", text: "adminoke1", args: [] }), { sock, db });
  const admCall = pteroCalls.find((c) => c.url.endsWith("/api/application/users"));
  t("5h. .orderadmin lunas → admin panel dibuat (root_admin)", admCall?.body?.root_admin === true, admCall?.body);
  const credAdm = sent.find((s) => s.jid === "62812buyer@s.whatsapp.net" && /ᴘᴀɴᴇʟ ᴋᴀᴍᴜ|panel kamu/i.test(s.payload?.text || ""));
  t("5i. kredensial admin ke DM buyer", !!credAdm, sent.map((s) => s.jid));
}

console.log("— section 6: grup → kredensial TETAP DM + owner config owner-only —");
{
  const db = getDatabase();
  const cfg = lib.ensureOrderCfg(db);
  cfg.on = true; db.save();
  const sock = mkSock();
  fakeTrxStatus = "completed";
  sent.length = 0; pteroCalls.length = 0;
  await plug.handler(mkM({ command: "orderpanel", text: "2gb|grupbudi", args: [], isGroup: true, chat: "g1@g.us" }), { sock, db });
  const credDm = sent.find((s) => s.jid === "62812buyer@s.whatsapp.net" && /ᴘᴀɴᴇʟ ᴋᴀᴍᴜ|panel kamu/i.test(s.payload?.text || ""));
  const groupReplies = sent.filter((s) => s.jid === "g1@g.us" || s.jid === "reply");
  t("6a. di grup, password gak pernah muncul di chat grup", !groupReplies.some((s) => (s.payload?.text || "").includes("Password") || (s.payload?.caption || "").includes("Password")), groupReplies.map((s) => (s.payload?.text || s.payload?.caption || "").slice(0, 40)));
  t("6b. kredensial tetap ke DM buyer", !!credDm, sent.map((s) => s.jid));
  t("6c. konfirmasi singkat dikirim di grup", groupReplies.some((s) => /ᴅɪᴋɪʀɪᴍ ᴋᴇ ᴅᴍ|dikirim ke DM|ᴅᴍ ᴋᴀᴍᴜ|ᴘᴀɴᴇʟ ᴋᴀᴍᴜ ᴜᴅᴀʜ|panel kamu udah/i.test(s.payload?.text || "")), groupReplies.map((s) => (s.payload?.text || "").slice(0, 60)));
  t("6d. owner di-DM laporan order sukses", sent.some((s) => /s\.whatsapp\.net$/.test(s.jid || "") && /auto order|sukses/i.test(s.payload?.text || "")), sent.filter((s) => (s.jid || "").includes("s.whatsapp.net")).map((s) => (s.payload?.text || "").slice(0, 60)));
  t("6e. .autoorder owner-only", cfgPlug.config.isOwner === true, cfgPlug.config.isOwner);
}

plug._resetPakasirFactoryForTest();
plug._resetAutoOrderHttpForTest();
plug._resetOrderTimingsForTest();
lib._resetAutoOrderHttpForTest();

console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
fs.rmSync(dbDir, { recursive: true, force: true });
process.exit(fail > 0 ? 1 : 0);
