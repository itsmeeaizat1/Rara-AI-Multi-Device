// RARA AI - MULTI DEVICE — E2E: izin create panel (owner 6 Okt 2026):
// ".cpanel ada fitur butuh konfirmasi add dr owner — user gak bisa langsung
// create, owner harus menambahkan dulu: .addcpanel role @user / nomor <durasi>"
// Lib src/lib/rara-cpanel-allow.js + plugin .addcpanel/.delcpanel/.listcpanel
// + gate di plugins/panel/cpanel.js (2 jalur create). Mock HTTP panel lokal.
import http from "node:http";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
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

const ALLOW_FILE = path.join(os.tmpdir(), "cpanel-allow-e2e-" + Date.now() + ".json");
const { _setAllowFileForTest } = await import(R + "/src/lib/rara-cpanel-allow.js");
_setAllowFileForTest(ALLOW_FILE);

// ═══ SECTION 1: lib unit ═══
section("1. lib rara-cpanel-allow");
const lib = await import(R + "/src/lib/rara-cpanel-allow.js");

t("1a. parseDurasi 7d → 7 hari ms", lib.parseDurasi("7d").ms === 7 * 864e5);
t("1b. parseDurasi 30m / 12h / 2w", lib.parseDurasi("30m").ms === 30 * 60e3 && lib.parseDurasi("12h").ms === 12 * 36e5 && lib.parseDurasi("2w").ms === 14 * 864e5);
t("1c. unli/permanen → null (selamanya)", lib.parseDurasi("unli").ms === null && lib.parseDurasi("permanen").ms === null);
t("1d. kosong → selamanya", lib.parseDurasi("").ms === null);
t("1e. token ngawur → invalid", lib.parseDurasi("7x").invalid === true && lib.parseDurasi("abc").invalid === true);
t("1f. cleanNumber dari jid/lid/mentah", lib.cleanNumber("62812345678@s.whatsapp.net") === "62812345678" && lib.cleanNumber("62812345678") === "62812345678");

t("1g. awal: gak ada izin → blocked", lib.isCreateAllowed("628111222333@s.whatsapp.net").allowed === false);
const a1 = lib.allowCreate("628111222333@s.whatsapp.net", 7 * 864e5);
t("1h. allowCreate 7d → ok + expiresAt terisi (default tipe client)", a1.ok === true && Number.isFinite(a1.entry.expiresAt) && a1.entry.tipe === "client", a1.entry);
t("1i. isCreateAllowed setelah add → allowed", lib.isCreateAllowed("628111222333@s.whatsapp.net").allowed === true);
t("1j. re-add perpanjang durasi (bukan error)", (() => { const r = lib.allowCreate("628111222333", 30 * 864e5); return r.ok === true && r.entry.expiresAt > a1.entry.expiresAt; })());
const a2 = lib.allowCreate("628222333444", null);
t("1k. allowCreate unli → expiresAt null", a2.ok === true && a2.entry.expiresAt === null);
t("1l. listCreateAllow 2 entri", lib.listCreateAllow().length === 2);
t("1m. revokeCreate → true lalu false", lib.revokeCreate("628222333444@s.whatsapp.net") === true && lib.revokeCreate("628222333444") === false);
t("1n. setelah revoke → blocked", lib.isCreateAllowed("628222333444").allowed === false);
// expiry: add 50ms, tunggu, cek prune
lib.allowCreate("628333444555", 50);
await new Promise((r) => setTimeout(r, 120));
t("1o. entri kedaluwarsa otomatis keprune (gak jadi sampah)", lib.isCreateAllowed("628333444555").allowed === false && lib.listCreateAllow().length === 1);
t("1p. formatSisa selamanya / hari", lib.formatSisa(null) === "Selamanya" && /hari/.test(lib.formatSisa(Date.now() + 5 * 864e5)));
t("1q. formatTanggal terisi", /\d{1,2}\/\d{1,2}\/\d{4}/.test(lib.formatTanggal(Date.now() + 864e5)));
const aAdmin = lib.allowCreate("628600111222", 30 * 864e5, "admin");
t("1r. allowCreate tipe admin → entry.tipe admin", aAdmin.ok === true && aAdmin.entry.tipe === "admin", aAdmin.entry);
t("1s. isCreateAllowed bawa tipe utk gate", lib.isCreateAllowed("628600111222").entry?.tipe === "admin");
t("1t. tipe ngawur → error jelas", lib.allowCreate("628999888777", null, "reseller").ok === false && /Tipe harus/.test(lib.allowCreate("628999888777", null, "reseller").error || ""));
t("1u. re-add tipe beda → tipe keupdate", lib.allowCreate("628600111222", 7 * 864e5, "client").ok === true && lib.isCreateAllowed("628600111222").entry?.tipe === "client");

// ═══ SECTION 2: plugin .addcpanel / .delcpanel / .listcpanel ═══
section("2. plugin .addcpanel");
const plugin = await import(R + "/plugins/panel/cpanel-allow.js");
const replies = [];
function mkM(command, text, opts = {}) {
  return {
    command, args: text.split(/\s+/).filter(Boolean), text: "." + command + " " + text, prefix: ".",
    sender: opts.sender || "628999000000@s.whatsapp.net", chat: opts.chat || "628999000000@s.whatsapp.net",
    isOwner: opts.isOwner ?? true, isGroup: false,
    mentionedJid: opts.mentionedJid || null, quoted: opts.quoted || null,
    react: async () => {},
    reply: async (x) => replies.push(String(x)),
  };
}
const replyTxt = () => replies.join("\n");

replies.length = 0;
await plugin.handler(mkM("addcpanel", "role @user 7d", { mentionedJid: ["628111222333@s.whatsapp.net"] }), { sock: {} });
t("2a. .addcpanel role @user 7d → izin 7 hari tipe client", /7 hari/.test(replyTxt()) && /628111222333/.test(replyTxt()) && /Tipe: Client/.test(replyTxt()), replyTxt().slice(0, 200));
t("2b. izin tercatat di lib", lib.isCreateAllowed("628111222333").allowed === true);

replies.length = 0;
await plugin.handler(mkM("addcpanel", "628777888999 30d"), { sock: {} });
t("2c. .addcpanel <nomor> 30d → 30 hari", /30 hari/.test(replyTxt()) && /628777888999/.test(replyTxt()), replyTxt().slice(0, 160));

replies.length = 0;
await plugin.handler(mkM("addcpanel", "@user unli", { mentionedJid: ["628666777888@s.whatsapp.net"] }), { sock: {} });
t("2d. .addcpanel @user unli → Selamanya", /Selamanya/.test(replyTxt()), replyTxt().slice(0, 160));

replies.length = 0;
await plugin.handler(mkM("addcpanel", "role @user admin 14d", { mentionedJid: ["628666777888@s.whatsapp.net"] }), { sock: {} });
t("2d2. .addcpanel role @user admin 14d → tipe admin 14 hari", /Tipe: Admin/.test(replyTxt()) && /14 hari/.test(replyTxt()) && lib.isCreateAllowed("628666777888").entry?.tipe === "admin", replyTxt().slice(0, 200));

replies.length = 0;
await plugin.handler(mkM("addcpanel", "@user 7d admin", { mentionedJid: ["628666777888@s.whatsapp.net"] }), { sock: {} });
t("2d3. tipe setelah durasi juga kebaca", lib.isCreateAllowed("628666777888").entry?.tipe === "admin", lib.isCreateAllowed("628666777888").entry);

replies.length = 0;
const expBefore7x = lib.isCreateAllowed("628666777888").entry?.expiresAt;
const tipeBefore7x = lib.isCreateAllowed("628666777888").entry?.tipe;
await plugin.handler(mkM("addcpanel", "@user 7x", { mentionedJid: ["628666777888@s.whatsapp.net"] }), { sock: {} });
t("2e. durasi ngawur → ditolak, izin lama gak keubah",
  /gak dikenal/.test(replyTxt()) && lib.isCreateAllowed("628666777888").entry?.expiresAt === expBefore7x && lib.isCreateAllowed("628666777888").entry?.tipe === tipeBefore7x, replyTxt().slice(0, 160));

replies.length = 0;
await plugin.handler(mkM("addcpanel", ""), { sock: {} });
t("2f. tanpa target → guide format", /addcpanel/.test(replyTxt()) && /Contoh/.test(replyTxt()), replyTxt().slice(0, 140));

replies.length = 0;
await plugin.handler(mkM("listcpanel", ""), { sock: {} });
t("2g. .listcpanel → daftar + tipe + sisa waktu", /Izin Create Panel/.test(replyTxt()) && /628777888999/.test(replyTxt()) && /30 hari/.test(replyTxt()) && /Tipe: Client/.test(replyTxt()) && /Tipe: Admin/.test(replyTxt()), replyTxt().slice(0, 260));

replies.length = 0;
await plugin.handler(mkM("delcpanel", "628777888999"), { sock: {} });
t("2h. .delcpanel → dicabut", /Izin Dicabut/.test(replyTxt()) && lib.isCreateAllowed("628777888999").allowed === false, replyTxt().slice(0, 140));

replies.length = 0;
await plugin.handler(mkM("delcpanel", "628777888999"), { sock: {} });
t("2i. .delcpanel nomor gak terdaftar → info jelas", /tidak ada di daftar/.test(replyTxt()), replyTxt().slice(0, 140));

replies.length = 0;
await plugin.handler(mkM("addcpanel", "role @user 14d", { quoted: { sender: "628555444333@s.whatsapp.net" } }), { sock: {} });
t("2j. target via reply tanpa mention → jalan", lib.isCreateAllowed("628555444333").allowed === true, replyTxt().slice(0, 140));

// ═══ SECTION 3: gate di .cpanel (mock panel) ═══
section("3. gate create di .cpanel");
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(path.join(os.tmpdir(), "cpanel-allow-e2e-db-" + Date.now()));

const users = [], servers = [], dms = [];
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
      res.end(JSON.stringify({ meta: { pagination: { total: 9 } } }));
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

const cp = await import(R + "/plugins/panel/cpanel.js");
const cpReplies = [];
const sock = {
  onWhatsApp: async () => [{ exists: true }],
  sendMessage: async (to, msg) => { dms.push({ to, text: msg?.text || "" }); },
};
function mkC(text, opts = {}) {
  resetJeda();
  return {
    command: "cpanel", args: text.split(/\s+/), text, prefix: ".",
    sender: opts.sender || "628990001111@s.whatsapp.net", chat: opts.chat || "628990001111@s.whatsapp.net",
    isOwner: opts.isOwner ?? false, isGroup: false,
    mentionedJid: null, quoted: null,
    react: async () => {},
    reply: async (x) => cpReplies.push(String(x)),
  };
}
const cpTxt = () => cpReplies.join("\n");

// 3a. owner bypass gate — create langsung jalan
await cp.handler(mkC("client, 1gb 1gb, 100, bossman, 628990002222, 1", { isOwner: true }), { sock });
t("3a. owner bot bypass gate → create jalan", users.at(-1)?.username === "bossman", users.at(-1));

// 3b. non-owner tanpa izin → blocked + DM owner notif
cpReplies.length = 0; dms.length = 0;
const beforeUsers = users.length;
await cp.handler(mkC("client, 1gb 1gb, 100, freeload, 628990003333, 1", { sender: "628444555666@s.whatsapp.net" }), { sock });
t("3b. non-owner tanpa izin → ditolak", users.length === beforeUsers && /butuh konfirmasi owner/.test(cpTxt()), cpTxt().slice(0, 160));
t("3c. saran command .addcpanel di pesan tolak", /\.addcpanel/.test(cpTxt()) && /7d/.test(cpTxt()));
t("3d. DM permintaan ke owner kekirim (kartu Permintaan Akses Panel)", dms.some((d) => /Permintaan Akses Panel/.test(d.text) && /628444555666/.test(d.text)), dms.map((d) => d.to).join(","));

// 3e. throttle: coba lagi dalam 10 menit → DM gak dobel
cpReplies.length = 0; dms.length = 0;
await cp.handler(mkC("client, 1gb 1gb, 100, freeload2, 628990003333, 1", { sender: "628444555666@s.whatsapp.net" }), { sock });
t("3e. throttle 10 menit → DM owner gak dobel", !dms.some((d) => /Permintaan Akses Panel/.test(d.text)) && users.length === beforeUsers);

// 3f. non-owner DENGAN izin (dari .addcpanel) → create jalan
lib.allowCreate("628444555666", 7 * 864e5);
cpReplies.length = 0;
await cp.handler(mkC("client, 1gb 2gb, 100, allowedguy, 628990004444, 1", { sender: "628444555666@s.whatsapp.net" }), { sock });
t("3f. non-owner DENGAN izin .addcpanel → create jalan", users.at(-1)?.username === "allowedguy" && servers.at(-1)?.limits?.memory === 2048, users.at(-1));

// 3f2. izin tipe client coba create tipe admin → ditolak + arahan format
cpReplies.length = 0;
const beforeMism = users.length;
await cp.handler(mkC("admin, 1gb 5gb, 200, sneaky, 628990004445, 1", { sender: "628444555666@s.whatsapp.net" }), { sock });
t("3f2. izin client create admin → ditolak (cuma tipe client)", users.length === beforeMism && /cuma tipe \*client\*/.test(cpTxt()), cpTxt().slice(-180));
t("3f3. saran tipe admin ke owner di pesan tolak", /addcpanel <nomor kamu> admin/.test(cpTxt()), cpTxt().slice(-180));

// 3f4. izin tipe admin → create admin jalan root_admin true
lib.allowCreate("628915000111", 7 * 864e5, "admin");
cpReplies.length = 0;
await cp.handler(mkC("admin, 1gb 2gb, 100, adminku, 628990004446, 1", { sender: "628915000111@s.whatsapp.net" }), { sock });
t("3f4. izin tipe admin → create admin jalan (root_admin true)", users.at(-1)?.username === "adminku" && users.at(-1)?.root_admin === true, users.at(-1));

// 3g. jalur RAM legacy juga ke-gate
cpReplies.length = 0;
const before2 = users.length;
await cp.handler(mkC("1gb legacytry,628990005555,1", { sender: "628777000111@s.whatsapp.net" }), { sock });
t("3g. jalur RAM lama tanpa izin → ditolak juga", users.length === before2 && /butuh konfirmasi owner/.test(cpTxt()), cpTxt().slice(0, 140));

lib.allowCreate("628777000111", null);
cpReplies.length = 0;
await cp.handler(mkC("1gb legacyok,628990005555,1", { sender: "628777000111@s.whatsapp.net" }), { sock });
t("3h. jalur RAM lama DENGAN izin → create jalan", users.at(-1)?.username === "legacyok", users.at(-1));

// 3h2. jalur RAM lama tapi izin tipe admin → dikasih arahan format admin
lib.allowCreate("628916000111", 7 * 864e5, "admin");
cpReplies.length = 0;
const beforeLeg = users.length;
await cp.handler(mkC("1gb adminlegacy,628990005556,1", { sender: "628916000111@s.whatsapp.net" }), { sock });
t("3h2. izin admin di jalur RAM lama → arahan format admin (gak nembus)", users.length === beforeLeg && /tipe \*admin\* — pakai format lengkap/.test(cpTxt()), cpTxt().slice(-180));

// 3i. izin expired → blocked lagi
lib.allowCreate("628444555666", 50);
await new Promise((r) => setTimeout(r, 120));
cpReplies.length = 0;
const before3 = users.length;
await cp.handler(mkC("client, 1gb 1gb, 100, expiredguy, 628990006666, 1", { sender: "628444555666@s.whatsapp.net" }), { sock });
t("3i. izin kedaluwarsa → blocked lagi", users.length === before3 && /butuh konfirmasi owner/.test(cpTxt()), cpTxt().slice(0, 140));

// 3j. role panel lama TIDAK lagi otomatis bisa create
const { addRole } = await import(R + "/src/lib/rara-roles-cpanel.js");
addRole("628888999000@s.whatsapp.net", "v1", "reseller");
cpReplies.length = 0;
const before4 = users.length;
await cp.handler(mkC("client, 1gb 1gb, 100, resellertry, 628990007777, 1", { sender: "628888999000@s.whatsapp.net" }), { sock });
t("3j. role panel tanpa .addcpanel → ditolak (konfirmasi owner wajib)", users.length === before4 && /butuh konfirmasi owner/.test(cpTxt()), cpTxt().slice(0, 140));

srv.close();
try { fs.unlinkSync(ALLOW_FILE); } catch {}

console.log("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exitCode = fail > 0 ? 1 : 0;
