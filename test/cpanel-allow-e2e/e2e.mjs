// RARA AI - MULTI DEVICE — E2E: izin create panel (owner 6 Okt 2026):
// ".cpanel ada fitur butuh konfirmasi add dr owner — user gak bisa langsung
// create, owner harus menambahkan dulu: .addaksescpanel role @user / nomor <durasi>"
// Lib src/lib/rara-cpanel-allow.js + plugin .addaksescpanel/.delaksescpanel/.listaksescpanel
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

// ═══ SECTION 2: plugin .addaksescpanel / .delaksescpanel / .listaksescpanel ═══
section("2. plugin .addaksescpanel");
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
await plugin.handler(mkM("addaksescpanel", "role @user 7d", { mentionedJid: ["628111222333@s.whatsapp.net"] }), { sock: {} });
t("2a. .addaksescpanel role @user 7d → izin 7 hari tipe client", /7 hari/.test(replyTxt()) && /628111222333/.test(replyTxt()) && /Tipe: Client/.test(replyTxt()), replyTxt().slice(0, 200));
t("2b. izin tercatat di lib", lib.isCreateAllowed("628111222333").allowed === true);

replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "628777888999 30d"), { sock: {} });
t("2c. .addaksescpanel <nomor> 30d → 30 hari", /30 hari/.test(replyTxt()) && /628777888999/.test(replyTxt()), replyTxt().slice(0, 160));

replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "@user unli", { mentionedJid: ["628666777888@s.whatsapp.net"] }), { sock: {} });
t("2d. .addaksescpanel @user unli → Selamanya", /Selamanya/.test(replyTxt()), replyTxt().slice(0, 160));

replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "role @user admin 14d", { mentionedJid: ["628666777888@s.whatsapp.net"] }), { sock: {} });
t("2d2. .addaksescpanel role @user admin 14d → tipe admin 14 hari", /Tipe: Admin/.test(replyTxt()) && /14 hari/.test(replyTxt()) && lib.isCreateAllowed("628666777888").entry?.tipe === "admin", replyTxt().slice(0, 200));

replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "@user 7d admin", { mentionedJid: ["628666777888@s.whatsapp.net"] }), { sock: {} });
t("2d3. tipe setelah durasi juga kebaca", lib.isCreateAllowed("628666777888").entry?.tipe === "admin", lib.isCreateAllowed("628666777888").entry);

replies.length = 0;
const expBefore7x = lib.isCreateAllowed("628666777888").entry?.expiresAt;
const tipeBefore7x = lib.isCreateAllowed("628666777888").entry?.tipe;
await plugin.handler(mkM("addaksescpanel", "@user 7x", { mentionedJid: ["628666777888@s.whatsapp.net"] }), { sock: {} });
t("2e. durasi ngawur → ditolak, izin lama gak keubah",
  /gak dikenal/.test(replyTxt()) && lib.isCreateAllowed("628666777888").entry?.expiresAt === expBefore7x && lib.isCreateAllowed("628666777888").entry?.tipe === tipeBefore7x, replyTxt().slice(0, 160));

replies.length = 0;
await plugin.handler(mkM("addaksescpanel", ""), { sock: {} });
t("2f. tanpa target → guide format", /addaksescpanel/.test(replyTxt()) && /Contoh/.test(replyTxt()), replyTxt().slice(0, 140));

replies.length = 0;
await plugin.handler(mkM("addcpanel", "@user 12h", { mentionedJid: ["628999000111@s.whatsapp.net"] }), { sock: {} });
t("2f2. nama lama .addcpanel (alias) → tetap jalan & izin tercatat",
  /Akses Create Panel/.test(replyTxt()) && lib.isCreateAllowed("628999000111").allowed === true, replyTxt().slice(0, 140));

replies.length = 0;
await plugin.handler(mkM("listaksescpanel", ""), { sock: {} });
t("2g. .listaksescpanel → daftar + tipe + sisa waktu", /Akses Create Panel/.test(replyTxt()) && /628777888999/.test(replyTxt()) && /30 hari/.test(replyTxt()) && /Tipe: Client/.test(replyTxt()) && /Tipe: Admin/.test(replyTxt()), replyTxt().slice(0, 260));

replies.length = 0;
replies.length = 0;
await plugin.handler(mkM("listcpanel", ""), { sock: {} });
t("2g2. nama lama .listcpanel (alias) → daftar tetap muncul",
  /Akses Create Panel/.test(replyTxt()), replyTxt().slice(0, 120));

replies.length = 0;
await plugin.handler(mkM("delcpanel", "628111222333"), { sock: {} });
t("2h2. nama lama .delcpanel (alias) → izin tercabut",
  /Akses Dicabut/.test(replyTxt()) && lib.isCreateAllowed("628111222333").allowed === false, replyTxt().slice(0, 120));

replies.length = 0;
await plugin.handler(mkM("delaksescpanel", "628777888999"), { sock: {} });
t("2h. .delaksescpanel → dicabut", /Akses Dicabut/.test(replyTxt()) && lib.isCreateAllowed("628777888999").allowed === false, replyTxt().slice(0, 140));

replies.length = 0;
await plugin.handler(mkM("delaksescpanel", "628777888999"), { sock: {} });
t("2i. .delaksescpanel nomor gak terdaftar → info jelas", /gak ada di daftar/.test(replyTxt()), replyTxt().slice(0, 140));

replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "role @user 14d", { quoted: { sender: "628555444333@s.whatsapp.net" } }), { sock: {} });
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
t("3b. non-owner tanpa izin → ditolak", users.length === beforeUsers && /butuh izin dari owner atau reseller/.test(cpTxt()), cpTxt().slice(0, 160));
t("3c. saran command .addaksescpanel di pesan tolak", /\.addaksescpanel/.test(cpTxt()) && /7d/.test(cpTxt()));
t("3d. DM permintaan ke owner kekirim (kartu Permintaan Akses Panel)", dms.some((d) => /Permintaan Akses Panel/.test(d.text) && /628444555666/.test(d.text)), dms.map((d) => d.to).join(","));

// 3e. throttle: coba lagi dalam 10 menit → DM gak dobel
cpReplies.length = 0; dms.length = 0;
await cp.handler(mkC("client, 1gb 1gb, 100, freeload2, 628990003333, 1", { sender: "628444555666@s.whatsapp.net" }), { sock });
t("3e. throttle 10 menit → DM owner gak dobel", !dms.some((d) => /Permintaan Akses Panel/.test(d.text)) && users.length === beforeUsers);

// 3f. non-owner DENGAN izin (dari .addaksescpanel) → create jalan
lib.allowCreate("628444555666", 7 * 864e5);
cpReplies.length = 0;
await cp.handler(mkC("client, 1gb 2gb, 100, allowedguy, 628990004444, 1", { sender: "628444555666@s.whatsapp.net" }), { sock });
t("3f. non-owner DENGAN izin .addaksescpanel → create jalan", users.at(-1)?.username === "allowedguy" && servers.at(-1)?.limits?.memory === 2048, users.at(-1));

// 3f2. izin tipe client coba create tipe admin → ditolak + arahan format
cpReplies.length = 0;
const beforeMism = users.length;
await cp.handler(mkC("admin, 1gb 5gb, 200, sneaky, 628990004445, 1", { sender: "628444555666@s.whatsapp.net" }), { sock });
t("3f2. izin client create admin → ditolak (cuma tipe client)", users.length === beforeMism && /cuma tipe \*client\*/.test(cpTxt()), cpTxt().slice(-180));
t("3f3. saran tipe admin ke owner di pesan tolak", /addaksescpanel basic, <nomor kamu>/.test(cpTxt()), cpTxt().slice(-180));

// 3f4. izin tipe admin → create admin jalan root_admin true
lib.allowCreate("628915000111", 7 * 864e5, "admin");
cpReplies.length = 0;
await cp.handler(mkC("admin, 1gb 2gb, 100, adminku, 628990004446, 1", { sender: "628915000111@s.whatsapp.net" }), { sock });
t("3f4. izin tipe admin → create admin jalan (root_admin true)", users.at(-1)?.username === "adminku" && users.at(-1)?.root_admin === true, users.at(-1));

// 3g. jalur RAM legacy juga ke-gate
cpReplies.length = 0;
const before2 = users.length;
await cp.handler(mkC("1gb legacytry,628990005555,1", { sender: "628777000111@s.whatsapp.net" }), { sock });
t("3g. jalur RAM lama tanpa izin → ditolak juga", users.length === before2 && /butuh izin dari owner atau reseller/.test(cpTxt()), cpTxt().slice(0, 140));

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
t("3i. izin kedaluwarsa → blocked lagi", users.length === before3 && /butuh izin dari owner atau reseller/.test(cpTxt()), cpTxt().slice(0, 140));

// 3j. role panel lama TIDAK lagi otomatis bisa create
const { addRole } = await import(R + "/src/lib/rara-roles-cpanel.js");
addRole("628888999000@s.whatsapp.net", "v1", "reseller");
cpReplies.length = 0;
const before4 = users.length;
await cp.handler(mkC("client, 1gb 1gb, 100, resellertry, 628990007777, 1", { sender: "628888999000@s.whatsapp.net" }), { sock });
t("3j. role panel tanpa .addaksescpanel → ditolak (konfirmasi owner wajib)", users.length === before4 && /butuh izin dari owner atau reseller/.test(cpTxt()), cpTxt().slice(0, 140));


// ═══ SECTION 5: sistem role hierarki (owner 8 Okt) ═══
section("5. role hierarki — basic vs reseller");
t("5a. parseArgs: 'basic, 628174887770, 7d' → role basic + target + 7d", (() => { const r = plugin.parseArgs("basic, 628174887770, 7d"); return r.role === "basic" && r.targetTok === "628174887770" && r.durasiTok === "7d"; })(), plugin.parseArgs("basic, 628174887770, 7d"));
t("5b. parseArgs: 'reseller, @user, 17/05/2026' → role reseller + tanggal", (() => { const r = plugin.parseArgs("reseller, @user, 17/05/2026"); return r.role === "reseller" && r.targetTok === "@user" && r.durasiTok === "17/05/2026"; })());
t("5c. parseArgs: format lama 'role @user client 7d' tetap kebaca", (() => { const r = plugin.parseArgs("role @user client 7d"); return r.role === null && r.tipe === "client" && r.durasiTok === "7d"; })(), plugin.parseArgs("role @user client 7d"));

replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "basic, 628170000001, 7d"), { sock: {} });
t("5d. owner add basic → kartu Role: Basic + tercatat", /Role: Basic/.test(replyTxt()) && lib.isCreateAllowed("628170000001").entry?.role === "basic", replyTxt().slice(0, 200));

replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "reseller, 628170000002, 14d"), { sock: {} });
t("5e. owner add reseller → kartu Role: Reseller + tercatat", /Role: Reseller/.test(replyTxt()) && lib.isCreateAllowed("628170000002").entry?.role === "reseller", replyTxt().slice(0, 200));

// basic coba nambahin orang → ditolak
replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "basic, 628170000003, 7d", { isOwner: false, sender: "628170000001@s.whatsapp.net" }), { sock: {} });
t("5f. user BASIC coba nambahin → ditolak (gak bisa ngatur akses)", /Akses Ditolak/.test(replyTxt()) && !lib.isCreateAllowed("628170000003").allowed, replyTxt().slice(0, 160));

// orang asing → ditolak
replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "basic, 628170000003, 7d", { isOwner: false, sender: "628170000009@s.whatsapp.net" }), { sock: {} });
t("5g. random user tanpa akses coba nambahin → ditolak", /Akses Ditolak/.test(replyTxt()), replyTxt().slice(0, 160));

// reseller nambah basic → boleh
replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "basic, 628170000003, 7d", { isOwner: false, sender: "628170000002@s.whatsapp.net" }), { sock: {} });
t("5h. reseller nambah basic → jalan + addedBy reseller", /Akses Create Panel/.test(replyTxt()) && lib.isCreateAllowed("628170000003").entry?.role === "basic" && lib.isCreateAllowed("628170000003").entry?.addedBy === "wa:628170000002", replyTxt().slice(0, 200));

// reseller nambah reseller → ditolak
replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "reseller, 628170000004, 7d", { isOwner: false, sender: "628170000002@s.whatsapp.net" }), { sock: {} });
t("5i. reseller coba kasih role reseller → ditolak (hierarki)", /cuma bisa nambahin user \*basic\*/.test(replyTxt()) && !lib.isCreateAllowed("628170000004").allowed, replyTxt().slice(0, 160));

// reseller coba kasih tipe admin → ditolak
replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "basic, 628170000004, 7d, admin", { isOwner: false, sender: "628170000002@s.whatsapp.net" }), { sock: {} });
t("5j. reseller coba kasih tipe admin → ditolak", /cuma bisa dikasih owner bot/.test(replyTxt()), replyTxt().slice(0, 160));

// reseller coba utak-atik user milik owner → ditolak
replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "basic, 628170000001, 7d", { isOwner: false, sender: "628170000002@s.whatsapp.net" }), { sock: {} });
t("5k. reseller coba re-add user milik owner → ditolak", /udah punya akses yang diatur owner/.test(replyTxt()) && lib.isCreateAllowed("628170000001").entry?.addedBy === "owner", replyTxt().slice(0, 160));

// reseller list → cuma user dia
replies.length = 0;
await plugin.handler(mkM("listaksescpanel", "", { isOwner: false, sender: "628170000002@s.whatsapp.net" }), { sock: {} });
t("5l. reseller list → cuma user basic yang dia tambahin", /User Akses Panel Kamu/.test(replyTxt()) && /628170000003/.test(replyTxt()) && !/628170000001/.test(replyTxt()), replyTxt().slice(0, 300));

// reseller del user owner → gagal; del user sendiri → jalan
replies.length = 0;
await plugin.handler(mkM("delaksescpanel", "628170000001", { isOwner: false, sender: "628170000002@s.whatsapp.net" }), { sock: {} });
t("5m. reseller del user milik owner → ditolak", /bukan user basic yang kamu tambahin/.test(replyTxt()) && lib.isCreateAllowed("628170000001").allowed === true, replyTxt().slice(0, 160));
replies.length = 0;
await plugin.handler(mkM("delaksescpanel", "628170000003", { isOwner: false, sender: "628170000002@s.whatsapp.net" }), { sock: {} });
t("5n. reseller del basic buatannya sendiri → jalan", /Akses Dicabut/.test(replyTxt()) && lib.isCreateAllowed("628170000003").allowed === false, replyTxt().slice(0, 160));

// ═══ SECTION 6: durasi absolut (jam & tanggal) ═══
section("6. durasi absolut — 16:00 & 17/05/2026");
const NOW = new Date(2026, 9, 8, 10, 0, 0); // 8 Okt 2026 10:00
let d6 = lib.parseDurasi("16:00", NOW);
t("6a. '16:00' jam depan → expiresAt hari ini 16:00", d6.expiresAt === new Date(2026, 9, 8, 16, 0, 0).getTime(), d6);
d6 = lib.parseDurasi("07:00", NOW);
t("6b. '07:00' udah lewat → besok jam sama", d6.expiresAt === new Date(2026, 9, 9, 7, 0, 0).getTime(), d6);
d6 = lib.parseDurasi("17/05/2027", NOW);
t("6c. '17/05/2027' → akhir hari itu 23:59:59", d6.expiresAt === new Date(2027, 4, 17, 23, 59, 59).getTime(), d6);
d6 = lib.parseDurasi("17/05/2027 16:00", NOW);
t("6d. '17/05/2027 16:00' → jam persis", d6.expiresAt === new Date(2027, 4, 17, 16, 0, 0).getTime(), d6);
d6 = lib.parseDurasi("17/05/2026", NOW);
t("6e. tanggal lampau → invalid (gak boleh masa lalu)", d6.invalid === true && d6.lewat === true, d6);
d6 = lib.parseDurasi("32/13/2027", NOW);
t("6f. tanggal ngawur → invalid", d6.invalid === true);
d6 = lib.parseDurasi("25:00", NOW);
t("6g. jam ngawur → invalid", d6.invalid === true);

replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "basic, 628170000005, 31/12/2026"), { sock: {} });
t("6h. owner add basic sampai 31/12/2026 → tercatat + kartu berakhir", lib.isCreateAllowed("628170000005").entry?.expiresAt === new Date(2026, 11, 31, 23, 59, 59).getTime() && /31\/12\/2026/.test(replyTxt()), replyTxt().slice(0, 200));

// ═══ SECTION 7: target Telegram (tg:<id>) ═══
section("7. target ID Telegram");
replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "basic, tg:4436252, 7d"), { sock: {} });
t("7a. add basic tg:4436252 → kartu (Telegram) + tercatat platform tg", /\(Telegram\)/.test(replyTxt()) && lib.isCreateAllowed("tg_4436252@s.whatsapp.net").entry?.platform === "tg", replyTxt().slice(0, 200));
t("7b. gate create dari jid bridge tg_ → allowed", lib.isCreateAllowed("tg:4436252").allowed === true);
replies.length = 0;
await plugin.handler(mkM("delaksescpanel", "tg:4436252"), { sock: {} });
t("7c. del tg:4436252 → tercabut", /Akses Dicabut/.test(replyTxt()) && lib.isCreateAllowed("tg:4436252").allowed === false, replyTxt().slice(0, 160));
replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "basic, tg:bukanangka, 7d"), { sock: {} });
t("7d. tg id ngawur → guide (gak dicatat diam-diam)", !lib.isCreateAllowed("tg:0").allowed && /addaksescpanel/.test(replyTxt()), replyTxt().slice(0, 160));

// ═══ SECTION 8: cap reseller — basic gak boleh lebih lama dari reseller ═══
section("8. cap durasi reseller");
// reseller 7d (628170000002) nambah basic 30d → dibatasi sisa reseller
replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "basic, 628170000006, 30d", { isOwner: false, sender: "628170000002@s.whatsapp.net" }), { sock: {} });
const ent8 = lib.isCreateAllowed("628170000006").entry;
const ent8res = lib.isCreateAllowed("628170000002").entry;
t("8a. basic 30d dari reseller 14d → dibatasi sisa reseller", ent8?.expiresAt === ent8res?.expiresAt && /dibatasi sisa akses kamu/.test(replyTxt()), { ent8, reply: replyTxt().slice(0, 200) });
// reseller finite coba kasih unli → tetap kebates
replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "basic, 628170000007, unli", { isOwner: false, sender: "628170000002@s.whatsapp.net" }), { sock: {} });
t("8b. reseller finite kasih unli → dibatasi (gak selamanya)", lib.isCreateAllowed("628170000007").entry?.expiresAt === ent8res?.expiresAt, lib.isCreateAllowed("628170000007").entry);
// reseller unli → boleh kasih durasi bebas / unli
lib.allowCreate("628170000008", null, "client", { role: "reseller" });
replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "basic, 628170000009, unli", { isOwner: false, sender: "628170000008@s.whatsapp.net" }), { sock: {} });
t("8c. reseller unli boleh kasih unli", lib.isCreateAllowed("628170000009").entry?.expiresAt === null && !/dibatasi/.test(replyTxt()), lib.isCreateAllowed("628170000009").entry);


// ═══ SECTION 9: role admin — nambah basic & reseller (owner 8 Okt revisi 2) ═══
section("9. role admin");
t("9a. parseArgs 'admin, 628174887770, 7d' → role admin", plugin.parseArgs("admin, 628174887770, 7d").role === "admin");

replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "admin, 628170000010, 30d"), { sock: {} });
t("9b. owner add admin → kartu Role: Admin + tercatat", /Role: Admin/.test(replyTxt()) && lib.isCreateAllowed("628170000010").entry?.role === "admin", replyTxt().slice(0, 200));

// admin nambah user baru jadi basic → boleh
replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "basic, 628170000011, 7d", { isOwner: false, sender: "628170000010@s.whatsapp.net" }), { sock: {} });
t("9c. admin nambah user baru jadi basic → jalan", /Akses Create Panel/.test(replyTxt()) && lib.isCreateAllowed("628170000011").entry?.role === "basic" && lib.isCreateAllowed("628170000011").entry?.addedBy === "wa:628170000010", replyTxt().slice(0, 200));

// admin nambah user baru jadi reseller → boleh
replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "reseller, 628170000012, 7d", { isOwner: false, sender: "628170000010@s.whatsapp.net" }), { sock: {} });
t("9d. admin nambah user baru jadi reseller → jalan", /Role: Reseller/.test(replyTxt()) && lib.isCreateAllowed("628170000012").entry?.role === "reseller", replyTxt().slice(0, 200));

// admin naikin basic (milik reseller lain) jadi reseller → boleh (dibawah admin)
replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "reseller, 628170000003, 7d", { isOwner: false, sender: "628170000010@s.whatsapp.net" }), { sock: {} });
t("9e. admin naikin basic buatan reseller lain → boleh", lib.isCreateAllowed("628170000003").entry?.role === "reseller", replyTxt().slice(0, 200));
// pulihin 628170000003 ke basic milik reseller 2 utk tes del admin bawah
lib.allowCreate("628170000003", 7 * 864e5, "client", { role: "basic", addedBy: "wa:628170000002" });

// admin coba kasih role admin → ditolak
replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "admin, 628170000013, 7d", { isOwner: false, sender: "628170000010@s.whatsapp.net" }), { sock: {} });
t("9f. admin coba kasih role admin → ditolak", /Role \*admin\* cuma bisa dikasih owner bot/.test(replyTxt()) && !lib.isCreateAllowed("628170000013").allowed, replyTxt().slice(0, 160));

// admin coba utak-atik user setara (admin lain) → ditolak
replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "basic, 628170000010, 7d", { isOwner: false, sender: "628170000010@s.whatsapp.net" }), { sock: {} });
t("9g. admin coba ubah admin lain → ditolak (setara)", /setara\/lebih tinggi/.test(replyTxt()), replyTxt().slice(0, 160));
// entri admin 628170000010 tetap utuh
t("9h. entri admin gak keubah", lib.isCreateAllowed("628170000010").entry?.role === "admin" && lib.isCreateAllowed("628170000010").entry?.addedBy === "owner", lib.isCreateAllowed("628170000010").entry);

// admin coba kasih tipe admin (akses panel admin) → ditolak
replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "basic, 628170000013, 7d, admin", { isOwner: false, sender: "628170000010@s.whatsapp.net" }), { sock: {} });
t("9i. admin coba kasih tipe admin → ditolak (owner only)", /Tipe \*admin\*.*cuma bisa dikasih owner bot/.test(replyTxt()), replyTxt().slice(0, 160));

// admin list → semua basic/reseller (admin gak keliatan)
replies.length = 0;
await plugin.handler(mkM("listaksescpanel", "", { isOwner: false, sender: "628170000010@s.whatsapp.net" }), { sock: {} });
t("9j. admin list → cuma user di bawah admin (gak ada entry role Admin)", /Di Bawah Kamu/.test(replyTxt()) && !/Role: Admin/.test(replyTxt()) && /628170000011/.test(replyTxt()), replyTxt().slice(0, 400));

// admin del user setara → gagal; del user basic → jalan
lib.allowCreate("628170000015", 7 * 864e5, "client", { role: "admin" }); // admin kedua
replies.length = 0;
await plugin.handler(mkM("delaksescpanel", "628170000015", { isOwner: false, sender: "628170000010@s.whatsapp.net" }), { sock: {} });
t("9k. admin del admin lain (setara) → ditolak", /setara\/lebih tinggi/.test(replyTxt()) && lib.isCreateAllowed("628170000015").allowed === true, replyTxt().slice(0, 160));
replies.length = 0;
await plugin.handler(mkM("delaksescpanel", "628170000011", { isOwner: false, sender: "628170000010@s.whatsapp.net" }), { sock: {} });
t("9l. admin del user basic (bukan buatannya) → jalan", /Akses Dicabut/.test(replyTxt()) && lib.isCreateAllowed("628170000011").allowed === false, replyTxt().slice(0, 160));

// cap: admin 30d kasih unli → dibatasi sisa admin
replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "reseller, 628170000014, unli", { isOwner: false, sender: "628170000010@s.whatsapp.net" }), { sock: {} });
const admExp = lib.isCreateAllowed("628170000010").entry?.expiresAt;
t("9m. admin finite kasih unli → dibatasi sisa akses admin", lib.isCreateAllowed("628170000014").entry?.expiresAt === admExp && /dibatasi sisa akses kamu/.test(replyTxt()), { admExp, e: lib.isCreateAllowed("628170000014").entry, reply: replyTxt().slice(0, 200) });

// reseller tetap gak bisa naikin ke reseller meski target basic milik orang lain
replies.length = 0;
await plugin.handler(mkM("addaksescpanel", "reseller, 628170000006, 7d", { isOwner: false, sender: "628170000002@s.whatsapp.net" }), { sock: {} });
t("9n. reseller coba naikin basic orang lain jadi reseller → ditolak", /cuma bisa nambahin user \*basic\*/.test(replyTxt()) && lib.isCreateAllowed("628170000006").entry?.role === "basic", replyTxt().slice(0, 160));

srv.close();
try { fs.unlinkSync(ALLOW_FILE); } catch {}

console.log("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exitCode = fail > 0 ? 1 : 0;
