// RARA AI - MULTI DEVICE — E2E: .cpanel <tipe> client/admin + disk/ram/cpu custom
// (owner 6 Okt 2026): .cpanel client, 1gb 5gb, 200, aizat,628xxx,1
// client = akun biasa tanpa akses admin (root_admin false), admin = root_admin true
// (level PTLA). Mock HTTP panel lokal (127.0.0.1) → verifikasi payload root_admin
// + limits + notif saluran via seam.
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const R = path.resolve(__dirname, "../..");
process.chdir(R);

let pass = 0, fail = 0;
function t(name, cond, info) {
  if (cond) { pass++; console.log("  ✅ " + name); }
  else { fail++; console.error("  ❌ " + name, info !== undefined ? JSON.stringify(info)?.slice(0, 220) : ""); }
}
const section = (x) => console.log("\n— " + x + " —");

const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(path.join(os.tmpdir(), "cpanel-role-e2e-db-" + Date.now()));

const { handler, parseRoleSpec, config, _setTgClientForTest, resolveCreateTarget } = await import(R + "/plugins/panel/cpanel.js");
// seam izin create (owner 6 Okt): .cpanel create butuh .addaksescpanel dulu
const { _setAllowFileForTest, allowCreate: allowCreateFor } = await import(R + "/src/lib/rara-cpanel-allow.js");
_setAllowFileForTest(path.join(os.tmpdir(), "cpanel-role-e2e-allow-" + Date.now() + ".json"));
const { setNotifyEnabled, _setBroadcastSendForTest, _resetBroadcastSendForTest } =
  await import(R + "/src/lib/rara-saluran-broadcast.js");

// ═══ SECTION 1: unit parser parseRoleSpec ═══
section("1. parser .cpanel <tipe>, <disk> <ram>, <cpu>, ...");

const a = parseRoleSpec("client, 1gb 5gb, 200, aizat, 628174887770, 1");
t("1a. client, 1gb 5gb, 200 → disk 1024 ram 5120 cpu 200", a && a.role === "client" && a.diskMB === 1024 && a.ramMB === 5120 && a.cpuPct === 200, a);
const b = parseRoleSpec("admin, unli unli, unli, budi, 628123, 2");
t("1b. admin unli semua → 0/0/0 + panelId 2", b && b.role === "admin" && b.diskMB === 0 && b.ramMB === 0 && b.cpuPct === 0 && b.panelId === 2, b);
const c = parseRoleSpec("Admin, 2gb 8gb, 400, Nico_Shop,628xxx,1".replace("628xxx","62812345678"));
t("1c. kapital + underscore jalan (lowercase otomatis)", c && c.role === "admin" && c.username === "nico_shop" && c.ramMB === 8192, c);
t("1d. nomor kosong → default sender (nomor null)", parseRoleSpec("client, 1gb 1gb, 100, aizat")?.nomor === null);
t("1e. idpanel kosong → null (default v1 di handler)", parseRoleSpec("client, 1gb 1gb, 100, aizat, 628123")?.panelId === null);
t("1f. idpanel invalid (v999) → ditolak", parseRoleSpec("client, 1gb 1gb, 100, aizat, 628123, v999") === null);
t("1g. role gak dikenal → null", parseRoleSpec("reseller, 1gb 5gb, 200, aizat, 628123, 1") === null);
t("1h. disk/ram kebalik (tanpa spasi) → null", parseRoleSpec("client, 1gb5gb, 200, aizat, 628123, 1") === null);
t("1i. cpu > 1000 ditolak", parseRoleSpec("client, 1gb 5gb, 2000, aizat, 628123, 1") === null);
t("1j. ram > 100gb ditolak", parseRoleSpec("client, 1gb 200gb, 200, aizat, 628123, 1") === null);
t("1k. username < 3 char → null", parseRoleSpec("client, 1gb 5gb, 200, ab, 628123, 1") === null);
t("1l. format lama (login) gak kesenggol", parseRoleSpec("aizat aizat123, 1") === null && parseRoleSpec("start namaserver 1") === null);

// ═══ SECTION 2: mock panel + full flow ═══
section("2. full flow ke mock panel");
const users = [];   // payload user create
const servers = []; // payload server create
const srv = http.createServer((req, res) => {
  let body = "";
  req.on("data", (ch) => (body += ch));
  req.on("end", () => {
    const json = body ? JSON.parse(body) : {};
    res.setHeader("content-type", "application/json");
    if (req.url.startsWith("/api/application/users") && req.method === "POST") {
      users.push(json);
      res.end(JSON.stringify({ attributes: { id: 201, username: json.username, first_name: json.first_name } }));
    } else if (req.url.startsWith("/api/application/servers") && req.method === "POST") {
      servers.push(json);
      res.end(JSON.stringify({ attributes: { id: 777, name: json.name } }));
    } else if (req.url.startsWith("/api/application/servers")) {
      res.end(JSON.stringify({ meta: { pagination: { total: 7 } } }));
    } else if (req.url.includes("/eggs/")) {
      res.end(JSON.stringify({ attributes: { startup: "npm start" } }));
    } else { res.statusCode = 404; res.end("{}"); }
  });
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const PORT = srv.address().port;
globalThis.__NOVA_PTERO_CONFIG__ = {
  server1: { domain: "http://127.0.0.1:" + PORT, apikey: "ptla_mock", capikey: "", egg: "15", nestid: "5", location: "1" },
};

const db = getDatabase();
db.setting("panelCreateJeda", 0);
function resetJeda() { db.setting("panelCreateLastUsed", 0); }

const replies = [], dms = [], reacted = [];
const sock = {
  onWhatsApp: async () => [{ exists: true }],
  sendMessage: async (to, msg) => { dms.push({ to, text: msg?.text || "" }); },
};
function mkM(text, opts = {}) {
  resetJeda();
  return {
    command: "cpanel", args: text.split(/\s+/), text, prefix: ".",
    sender: opts.sender || "628000111222@s.whatsapp.net", chat: opts.chat || "628000111222@s.whatsapp.net",
    isOwner: opts.isOwner ?? true, isGroup: false,
    mentionedJid: null, quoted: null,
    react: async (e) => reacted.push(e),
    reply: async (x) => replies.push(String(x)),
  };
}
const replyTxt = () => replies.join("\n");

// saluran notif seam ON
const saluranCaptured = [];
_setBroadcastSendForTest((message) => saluranCaptured.push(message));
setNotifyEnabled("serverCreated", true);

// 2a. client flow: root_admin FALSE + limits persis
await handler(mkM("client, 1gb 5gb, 200, aizat, 628174887770, 1"), { sock });
t("2a. user client: root_admin false", users[0]?.root_admin === false, users[0]);
t("2b. server client: memory 5120 / disk 1024 / cpu 200",
  servers[0]?.limits?.memory === 5120 && servers[0]?.limits?.disk === 1024 && servers[0]?.limits?.cpu === 200, servers[0]?.limits);
t("2c. kredensial ke target: Tipe Akun Client", /Tipe Akun: Client/.test(dms[0]?.text || "") && dms[0]?.to === "628174887770@s.whatsapp.net", dms[0]?.text?.slice(0, 160));
t("2d. label RAM/Disk/CPU di DM", /RAM: 5 GB \| Disk: 1 GB \| CPU: 200%/.test(dms[0]?.text || ""), dms[0]?.text?.slice(0, 200));
t("2e. react 🕒 → 🐣", reacted[0] === "🕒" && reacted.at(-1) === "🐣", reacted);

// 2b. admin flow (owner): root_admin TRUE
await handler(mkM("admin, unli unli, unli, aizatpro, 628174887770, 1"), { sock });
t("2f. user admin: root_admin true", users[1]?.root_admin === true, users[1]);
t("2g. admin unli: limits 0/0/0", servers[1]?.limits?.memory === 0 && servers[1]?.limits?.disk === 0 && servers[1]?.limits?.cpu === 0, servers[1]?.limits);
t("2h. Tipe Akun Admin di DM", /Tipe Akun: Admin/.test(dms[1]?.text || ""), dms[1]?.text?.slice(0, 160));
t("2i. deskripsi server ditandai [ADMIN]/[CLIENT]", /\[ADMIN\]/.test(servers[1]?.description || "") && /\[CLIENT\]/.test(servers[0]?.description || ""));

// 2c. admin oleh non-owner TANPA izin → ditolak gate .addaksescpanel, gak ada create baru
const userCountBefore = users.length;
await handler(mkM("admin, 1gb 1gb, 100, hacker, 628999, 1", { isOwner: false }), { sock });
t("2j. admin oleh non-owner tanpa izin ditolak (gate .addaksescpanel)",
  users.length === userCountBefore && /butuh izin dari owner atau reseller/i.test(replyTxt()), replyTxt().slice(-160));

// 2c2. (revisi owner 7 Okt) owner .addaksescpanel tipe ADMIN → user create tipe admin
allowCreateFor("628999000111", 7 * 864e5, "admin");
await handler(mkM("admin, 5gb 5gb, 200, aizat2, 628174887770, 1", { isOwner: false, sender: "628999000111@s.whatsapp.net" }), { sock });
t("2j2. izin tipe admin → create admin root_admin true",
  users.at(-1)?.username === "aizat2" && users.at(-1)?.root_admin === true, users.at(-1));
t("2j3. spec admin: memory 5120 / disk 5120 / cpu 200",
  servers.at(-1)?.limits?.memory === 5120 && servers.at(-1)?.limits?.disk === 5120 && servers.at(-1)?.limits?.cpu === 200, servers.at(-1)?.limits);
t("2j4. kartu DM tipe Admin ke target", /Tipe Akun: Admin/.test(dms.at(-1)?.text || ""), dms.at(-1)?.text?.slice(0, 160));

// 2c3. izin tipe client coba create admin → ditolak, arahkan format client
allowCreateFor("628910000111", 7 * 864e5); // tanpa tipe = client
const cntMismatch = users.length;
await handler(mkM("admin, 1gb 1gb, 100, sneaky, 628174887770, 1", { isOwner: false, sender: "628910000111@s.whatsapp.net" }), { sock });
t("2j5. izin client create admin → ditolak tipe (gak nembus)",
  users.length === cntMismatch && /cuma tipe \*client\*/.test(replyTxt()), replyTxt().slice(-160));

// 2d. client oleh non-owner tanpa izin → ditolak (gate .addaksescpanel, owner 6 Okt)
const count2k = users.length; // re-baseline (2j2 udah create user admin)
await handler(mkM("client, 1gb 1gb, 100, freeload, 628999, 1", { isOwner: false }), { sock });
t("2k. non-owner tanpa izin create → ditolak (gate .addaksescpanel)", users.length === count2k && /butuh izin dari owner atau reseller/i.test(replyTxt()), replyTxt().slice(-160));

// 2e. role panel SAJA gak cukup lagi (owner 6 Okt) — butuh .addaksescpanel
const { addRole } = await import(R + "/src/lib/rara-roles-cpanel.js");
addRole("628555000111@s.whatsapp.net", "v1", "reseller");
await handler(mkM("client, 1gb 2gb, 100, sellerserver, 628555000111, 1", { isOwner: false, sender: "628555000111@s.whatsapp.net" }), { sock });
t("2l. role panel TANPA .addaksescpanel → ditolak",
  users.length === count2k && /butuh izin dari owner atau reseller/i.test(replyTxt()), replyTxt().slice(-160));
// baru setelah .addaksescpanel (izin owner) → create jalan
allowCreateFor("628555000111", 7 * 864e5);
await handler(mkM("client, 1gb 2gb, 100, sellerserver, 628555000111, 1", { isOwner: false, sender: "628555000111@s.whatsapp.net" }), { sock });
t("2l2. role panel + izin .addaksescpanel → create jalan",
  users.at(-1)?.username === "sellerserver" && servers.at(-1)?.limits?.memory === 2048, users.at(-1));

// 2f. idpanel default v1 (nomor tanpa idpanel)
await handler(mkM("client, 1gb 1gb, 100, simpel, 628174887770"), { sock });
t("2m. tanpa idpanel → default v1 sukses", users.at(-1)?.username === "simpel" && servers.at(-1)?.limits?.memory === 1024, users.at(-1));

// 2g. notif saluran: client + admin + tipe + total server
t("2n. notif saluran: kartu Server Baru Dibuat ke-kirim", saluranCaptured.length >= 2 && saluranCaptured[0].includes("「 ✦ Server Baru Dibuat ✦ 」"), saluranCaptured.length);
t("2o. Tipe Akun di kartu saluran (Client lalu Admin)", /🛡 Tipe Akun: Client/.test(saluranCaptured[0] || "") && /🛡 Tipe Akun: Admin/.test(saluranCaptured[1] || ""), (saluranCaptured[0] || "").slice(0, 160));
t("2p. Total server terbuat dari meta pagination", /🧩 Total server terbuat: 7/.test(saluranCaptured[0] || ""), (saluranCaptured[0] || "").slice(-120));

// 2h. path RAM lama juga notif saluran (tipe Client)
saluranCaptured.length = 0;
await handler(mkM("1gb aizat2,628174887770,1"), { sock });
t("2q. path RAM lama → akun tetap kebuat + notif saluran", servers.at(-1)?.limits?.memory === 1024 && saluranCaptured[0]?.includes("🛡 Tipe Akun: Client"), saluranCaptured[0]?.slice(0, 140));

// 2i2. panduan (revisi owner 7 Okt): harus jelas soal .addaksescpanel + client & admin
replies.length = 0;
await handler(mkM("", { isOwner: true }), { sock });
const guideTxt = replyTxt();
t("2r0. panduan: role basic/reseller + tipe + durasi baru", /\.addaksescpanel basic, 628xxx, 7d/.test(guideTxt) && /\.addaksescpanel reseller, @user, 17\/05\/2026/.test(guideTxt) && /reseller.*nambahin user lain sebagai basic/i.test(guideTxt) && /\.listaksescpanel/.test(guideTxt), guideTxt.slice(0, 400));
t("2r1. panduan: contoh client & admin create + catatan client gak bisa ubah spec",
  /\.cpanel client, 5gb 5gb, 200, aizat2, 628174887770, 1/.test(guideTxt) && /\.cpanel admin, 5gb 5gb, 200, aizat2, 628174887770, 1/.test(guideTxt) && /Client gak bisa ubah ram\/cpu sendiri/.test(guideTxt), guideTxt.slice(0, 200));

// 2i. panel gak dikonfigurasi → pesan jelas (v9 kosong)
replies.length = 0;
await handler(mkM("client, 1gb 1gb, 100, aizat, 628123, 9"), { sock });
t("2r. panel kosong → pesan belum dikonfigurasi", /belum dikonfigurasi/i.test(replyTxt()), replyTxt().slice(0, 140));

setNotifyEnabled("serverCreated", false);

// ═══ SECTION 4: kredensial ke DM TELEGRAM (owner 7 Okt) ═══
section("4. create → DM Telegram");
const tgDms = [];
const tgClientMock = {
  sendMessage: async (id, text) => { tgDms.push({ id: String(id), text }); },
};
const origOnWa = sock.onWhatsApp;

// 4a. prefix tg:<id> → akun jadi + kredensial ke DM Telegram
_setTgClientForTest(tgClientMock);
await handler(mkM("client, 5gb 5gb, 200, aizat2, tg:4436252, 1", { isOwner: true }), { sock });
t("4a. .cpanel client, 5gb 5gb, 200, aizat2, tg:4436252, 1 → akun jadi",
  users.at(-1)?.username === "aizat2", users.at(-1));
t("4b. kredensial ke DM Telegram 4436252 (bukan WA DM)",
  tgDms.length === 1 && tgDms[0].id === "4436252" && /Username: aizat2/.test(tgDms[0].text), tgDms[0]);
t("4c. gak ada DM WhatsApp nyasar ke jid tg_", !dms.some((d) => String(d.to).includes("tg_")), dms.map((d) => d.to));
t("4d. reply creator nunjukin DM Telegram", /DM Telegram 4436252/.test(replyTxt()), replyTxt().slice(-200));

// 4e. fallback: angka gak terdaftar WA + bridge TG nyala → anggap id TG
sock.onWhatsApp = async (n) => [{ exists: !/^443/.test(String(n)) }];
tgDms.length = 0;
await handler(mkM("client, 1gb 1gb, 100, tgplain, 4436252, 1", { isOwner: true }), { sock });
t("4e. nomor gak terdaftar WA (7 digit) → fallback DM Telegram",
  users.at(-1)?.username === "tgplain" && tgDms[0]?.id === "4436252", { u: users.at(-1)?.username, tg: tgDms[0]?.id });
sock.onWhatsApp = origOnWa;

// 4f. tg: target tapi bridge Telegram mati → ditolak SEBELUM create
_setTgClientForTest(null);
const cntBeforeTgOff = users.length;
await handler(mkM("client, 1gb 1gb, 100, tgoff, tg:4436252, 1", { isOwner: true }), { sock });
t("4f. bridge TG mati + tg: target → ditolak, akun gak jadi",
  users.length === cntBeforeTgOff && /Bridge Telegram belum nyala/.test(replyTxt()), replyTxt().slice(-160));

// 4g. nomor gak terdaftar WA + bridge mati → error + hint tg:
sock.onWhatsApp = async () => [{ exists: false }]; // 12 digit: bukan WA, kepanjangan utk id TG
const cntBeforeHint = users.length;
await handler(mkM("client, 1gb 1gb, 100, ngawur, 443999999999, 1", { isOwner: true }), { sock });
sock.onWhatsApp = origOnWa;
t("4g. nomor salah panjang → hint format tg:",
  users.length === cntBeforeHint && /tidak terdaftar di WhatsApp/.test(replyTxt()) && /tg:<id_tele>/.test(replyTxt()), replyTxt().slice(-200));

// 4h. DM TG gagal kirim (user belum pernah chat bot) → akun tetap jadi + kredensial manual
_setTgClientForTest({ sendMessage: async () => { throw new Error("Forbidden: bot can't initiate conversation"); } });
await handler(mkM("client, 1gb 1gb, 100, tgfail, tg:4436252, 1", { isOwner: true }), { sock });
t("4h. kirim TG gagal → akun jadi + kredensial manual di reply",
  users.at(-1)?.username === "tgfail" && /BERHASIL dibuat/.test(replyTxt()) && /Password:/.test(replyTxt()), replyTxt().slice(-260));

// 4i. jalur RAM lama juga support tg:
_setTgClientForTest(tgClientMock);
tgDms.length = 0;
await handler(mkM("1gb legacytg,tg:4436252,1"), { sock });
t("4i. .cpanel 1gb user,tg:4436252,1 (path RAM) → DM Telegram",
  users.at(-1)?.username === "legacytg" && tgDms[0]?.id === "4436252" && /Username: legacytg/.test(tgDms[0]?.text || ""), { u: users.at(-1)?.username, tg: tgDms[0]?.id });

// 4j. resolveCreateTarget unit: jid bridge tg_ → tg
const rt = await resolveCreateTarget("tg_4436252", { onWhatsApp: async () => [{ exists: true }] });
t("4j. jid bridge tg_<id> → kind tg", rt.kind === "tg" && rt.tgId === "4436252", rt);
const rt2 = await resolveCreateTarget("628174887770", { onWhatsApp: async () => [{ exists: true }] });
t("4k. nomor WA valid → kind wa", rt2.kind === "wa" && rt2.display === "628174887770", rt2);

_setTgClientForTest(undefined);
_resetBroadcastSendForTest();
srv.close();

console.log("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exitCode = fail > 0 ? 1 : 0;
