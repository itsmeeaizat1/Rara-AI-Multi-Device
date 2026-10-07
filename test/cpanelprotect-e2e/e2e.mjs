// RARA AI - MULTI DEVICE — E2E: proteksi cpanel (owner 7 Okt 2026):
// ".cpanelprotect on aktif, .cpanelprotect settings buat cek mau apa aja
// fitur protect yg diaktifin" — master + toggle per aksi (create/delete/stop/
// restart/kill/upload). Owner bot selalu bypass.
// Lib src/lib/rara-cpanel-protect.js + plugin .cpanelprotect + gate di
// cpanel.js (2 jalur create + power + upload) + delserver.js + delpanel.js.
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

const PROTECT_FILE = path.join(os.tmpdir(), "cpanel-protect-e2e-" + Date.now() + ".json");
const { _setProtectFileForTest, PROTECT_FEATURES } = await import(R + "/src/lib/rara-cpanel-protect.js");
_setProtectFileForTest(PROTECT_FILE);

// ═══ SECTION 1: lib unit ═══
section("1. lib rara-cpanel-protect");
const lib = await import(R + "/src/lib/rara-cpanel-protect.js");

t("1a. 6 fitur protect: create/delete/stop/restart/kill/upload",
  PROTECT_FEATURES.join(",") === "create,delete,stop,restart,kill,upload" && Object.keys(lib.FEATURE_LABEL).length === 6);
t("1b. default master mati → isProtected semua false",
  ["create", "delete", "stop", "restart", "kill", "upload"].every((a) => lib.isProtected(a) === false));
t("1c. isFeatureName valid/invalid", lib.isFeatureName("kill") === true && lib.isFeatureName("explode") === false);
t("1d. setMaster(true) → semua fitur terproteksi (default ON)",
  (() => { lib.setMaster(true); return ["create", "delete", "stop", "restart", "kill", "upload"].every((a) => lib.isProtected(a) === true); })());
t("1e. setFeature kill off → kill bebas, lain tetap terproteksi",
  (() => { lib.setFeature("kill", false); return lib.isProtected("kill") === false && lib.isProtected("stop") === true && lib.isProtected("create") === true; })());
t("1f. setFeature ngawur → null (gak ngeyel)", lib.setFeature("explode", true) === null);
t("1g. protectStatus: master on, 5/6 aktif",
  (() => { const st = lib.protectStatus(); return st.master === true && st.activeFeatures.length === 5 && st.features.kill === false; })());
t("1h. setMaster(false) → semua lepas walau fitur flag nyala",
  (() => { lib.setMaster(false); return lib.isProtected("stop") === false && lib.isProtected("create") === false; })());
t("1i. master on lagi → fitur flag kemarin masih kepake (persist)",
  (() => { lib.setMaster(true); return lib.isProtected("kill") === false && lib.isProtected("restart") === true; })());
t("1j. setAllFeatures(false) → matiin semua flag",
  (() => { lib.setAllFeatures(false); const st = lib.protectStatus(); return st.activeFeatures.length === 0; })());
t("1k. setAllFeatures(true) → balik semua", (() => { lib.setAllFeatures(true); return lib.protectStatus().activeFeatures.length === 6; })());
t("1l. persist ke file JSON (bisa dibaca ulang)", (() => {
  try { const raw = JSON.parse(fs.readFileSync(PROTECT_FILE, "utf-8")); return raw.master === true && raw.features.kill === true; } catch { return false; }
})());

// ═══ SECTION 2: plugin .cpanelprotect ═══
section("2. plugin .cpanelprotect");
const plugin = await import(R + "/plugins/panel/cpanelprotect.js");
// reset state: master mati + semua fitur nyala (biar asersi section ini deterministik)
lib.setMaster(false);
lib.setAllFeatures(true);
const replies = [];
function mkM(text, opts = {}) {
  return {
    command: "cpanelprotect", args: text.split(/\s+/).filter(Boolean), text: "." + "cpanelprotect" + " " + text, prefix: ".",
    sender: opts.sender || "628999000000@s.whatsapp.net", chat: opts.chat || "628999000000@s.whatsapp.net",
    isOwner: opts.isOwner ?? true, isGroup: false,
    mentionedJid: null, quoted: null, react: async () => {},
    reply: async (x) => replies.push(String(x)),
  };
}
const replyTxt = () => replies.join("\n");

replies.length = 0;
await plugin.handler(mkM("settings"), { sock: {} });
t("2a. .cpanelprotect settings (master mati) → status + daftar 6 fitur",
  /CPANEL PROTECT/.test(replyTxt()) && /🔴 MATI/.test(replyTxt()) && replyTxt().match(/⛔/g)?.length === 6 && /create, delete, stop, restart, kill, upload/.test(replyTxt()), replyTxt().slice(0, 180));
replies.length = 0;
await plugin.handler(mkM(""), { sock: {} });
t("2b. tanpa argumen → settings juga", /CPANEL PROTECT/.test(replyTxt()));

replies.length = 0;
await plugin.handler(mkM("off"), { sock: {} });
t("2c. .cpanelprotect off → master mati", /dimatikan/.test(replyTxt()) && lib.isProtected("stop") === false);

replies.length = 0;
await plugin.handler(mkM("on"), { sock: {} });
t("2d. .cpanelprotect on → master nyala", /diaktifkan/.test(replyTxt()) && /cpanelprotect settings/.test(replyTxt()) && lib.isProtected("create") === true);

replies.length = 0;
await plugin.handler(mkM("settings"), { sock: {} });
t("2d2. settings saat aktif → 6 fitur ✅ + hint cara pakai", replyTxt().match(/✅/g)?.length === 6 && /cpanelprotect on\/off/.test(replyTxt()) && /bypass/.test(replyTxt()), replyTxt().slice(0, 160));

replies.length = 0;
await plugin.handler(mkM("upload off"), { sock: {} });
t("2e. per-fitur: upload off", /upload dimatikan/.test(replyTxt()) && lib.isProtected("upload") === false && lib.isProtected("stop") === true);

replies.length = 0;
await plugin.handler(mkM("upload on"), { sock: {} });
t("2f. per-fitur: upload on lagi", /upload diaktifkan/.test(replyTxt()) && lib.isProtected("upload") === true);

replies.length = 0;
await plugin.handler(mkM("explode on"), { sock: {} });
t("2g. fitur ngawur → ditolak jelas", /gak dikenal/.test(replyTxt()) && /create, delete, stop, restart, kill, upload/.test(replyTxt()));

replies.length = 0;
await plugin.handler(mkM("kill nyala"), { sock: {} });
t("2h. format salah → guide format", /Format salah/.test(replyTxt()) && /cpanelprotect <fitur> on\/off/.test(replyTxt()));

replies.length = 0;
await plugin.handler(mkM("all off"), { sock: {} });
t("2i. all off → 0 aktif", /Semua fitur proteksi dimatikan/.test(replyTxt()) && lib.protectStatus().activeFeatures.length === 0);

replies.length = 0;
await plugin.handler(mkM("all on"), { sock: {} });
t("2j. all on → 6 aktif", /Semua fitur proteksi diaktifkan/.test(replyTxt()) && lib.protectStatus().activeFeatures.length === 6);

replies.length = 0;
await plugin.handler(mkM("on", { isOwner: false, sender: "628444555666@s.whatsapp.net" }), { sock: {} });
t("2k. non-owner → ditolak (owner only)", /hanya untuk owner/.test(replyTxt()));

// ═══ SECTION 3: gate di .cpanel (mock panel) ═══
section("3. gate protect di .cpanel");
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(path.join(os.tmpdir(), "cpanel-protect-e2e-db-" + Date.now()));

const users = [], servers = [], powerCalls = [];
const srv = http.createServer((req, res) => {
  let body = "";
  req.on("data", (ch) => (body += ch));
  req.on("end", () => {
    const json = body ? JSON.parse(body) : {};
    res.setHeader("content-type", "application/json");
    if (req.url.startsWith("/api/application/users") && req.method === "POST") {
      users.push(json);
      res.end(JSON.stringify({ attributes: { id: 201, username: json.username, first_name: json.first_name } }));
    } else if (/\/api\/application\/servers\/\d+\/power/.test(req.url)) {
      powerCalls.push(json.signal);
      res.statusCode = 204; res.end();
    } else if (req.url.startsWith("/api/application/servers") && req.method === "POST") {
      servers.push(json);
      res.end(JSON.stringify({ attributes: { id: 777, name: json.name } }));
    } else if (req.url.startsWith("/api/application/servers")) {
      res.end(JSON.stringify({ data: [{ attributes: { id: 777, name: "MyServer" } }], meta: { pagination: { total_pages: 1, total: 1 } } }));
    } else if (req.url.includes("/eggs/")) {
      res.end(JSON.stringify({ attributes: { startup: "npm start" } }));
    } else { res.statusCode = 404; res.end("{}"); }
  });
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const PORT = srv.address().port;
globalThis.__NOVA_PTERO_CONFIG__ = {
  server1: { domain: "http://127.0.0.1:" + PORT, apikey: "ptla_mock", capikey: "ptlc_mock", egg: "15", nestid: "5", location: "1" },
};

const db = getDatabase();
db.setting("panelCreateJeda", 0);
function resetJeda() { db.setting("panelCreateLastUsed", 0); }

// beri izin create ke user uji (biar gate allow gak nutup duluan)
const allow = await import(R + "/src/lib/rara-cpanel-allow.js");
const USER_A = "628333222111@s.whatsapp.net";
allow.allowCreate(USER_A, null);

const cp = await import(R + "/plugins/panel/cpanel.js");
const { addRole } = await import(R + "/src/lib/rara-roles-cpanel.js");
addRole(USER_A, "v1", "reseller"); // biar bisa power/status (akses admin path)

const cpReplies = [];
const sock = { onWhatsApp: async () => [{ exists: true }], sendMessage: async () => {} };
function mkC(text, opts = {}) {
  resetJeda();
  return {
    command: "cpanel", args: text.split(/\s+/), text, prefix: ".",
    sender: opts.sender || USER_A, chat: opts.sender || USER_A,
    isOwner: opts.isOwner ?? false, isGroup: false,
    mentionedJid: null, quoted: null, react: async () => {},
    reply: async (x) => cpReplies.push(String(x)),
  };
}
const cpTxt = () => cpReplies.join("\n");

// master mati dulu → semua aksi normal (fitur flag direset ON biar deterministik)
lib.setMaster(false);
lib.setAllFeatures(true);
cpReplies.length = 0;
const u0 = users.length;
await cp.handler(mkC("client, 1gb 1gb, 100, freeguy, 628990001111, 1"), { sock });
t("3a. master mati → create user (izin allow) jalan normal", users.length === u0 + 1 && users.at(-1)?.username === "freeguy", cpTxt().slice(0, 160));

cpReplies.length = 0; powerCalls.length = 0;
await cp.handler(mkC("stop MyServer 1"), { sock });
t("3b. master mati → power stop jalan normal", powerCalls.includes("stop") && !/diproteksi/.test(cpTxt()), cpTxt().slice(0, 160));

// PROTEKSI NYALA
lib.setMaster(true); // semua fitur default on
cpReplies.length = 0;
const u1 = users.length;
await cp.handler(mkC("client, 1gb 1gb, 100, blockedguy, 628990002222, 1"), { sock });
t("3c. protect on → create (jalur tipe) diblokir walau punya izin", users.length === u1 && /diproteksi/.test(cpTxt()) && /cpanelprotect settings/.test(cpTxt()), cpTxt().slice(0, 160));

cpReplies.length = 0;
await cp.handler(mkC("1gb blockedlegacy,628990003333,1"), { sock });
t("3d. protect on → jalur RAM legacy juga diblokir", users.length === u1 && /diproteksi/.test(cpTxt()), cpTxt().slice(0, 140));

cpReplies.length = 0; powerCalls.length = 0;
await cp.handler(mkC("stop MyServer 1"), { sock });
t("3e. protect on → power stop diblokir", !powerCalls.includes("stop") && /diproteksi/.test(cpTxt()), cpTxt().slice(0, 140));

cpReplies.length = 0; powerCalls.length = 0;
await cp.handler(mkC("kill MyServer 1"), { sock });
t("3f. protect on → power kill diblokir", !powerCalls.includes("kill") && /diproteksi/.test(cpTxt()));

cpReplies.length = 0; powerCalls.length = 0;
await cp.handler(mkC("restart MyServer 1"), { sock });
t("3g. protect on → power restart diblokir", !powerCalls.includes("restart") && /diproteksi/.test(cpTxt()));

cpReplies.length = 0; powerCalls.length = 0;
await cp.handler(mkC("start MyServer 1"), { sock });
t("3h. start TETAP BOLEH (proteksi gak nyandera start)", powerCalls.includes("start") && !/diproteksi/.test(cpTxt()), cpTxt().slice(0, 140));

cpReplies.length = 0;
await cp.handler(mkC("upload MyServer 1"), { sock });
t("3i. protect on → upload diblokir (walau reply file belum ada)", /diproteksi/.test(cpTxt()) || /Reply file/.test(cpTxt()) === false, cpTxt().slice(0, 140));

cpReplies.length = 0; powerCalls.length = 0; const u2 = users.length;
await cp.handler(mkC("client, 1gb 1gb, 100, ownerbypass, 628990004444, 1", { isOwner: true, sender: "628999000000@s.whatsapp.net" }), { sock });
t("3j. owner bot bypass proteksi → create jalan", users.length === u2 + 1 && users.at(-1)?.username === "ownerbypass", cpTxt().slice(0, 160));

cpReplies.length = 0; powerCalls.length = 0;
await cp.handler(mkC("stop MyServer 1", { isOwner: true, sender: "628999000000@s.whatsapp.net" }), { sock });
t("3k. owner bot bypass proteksi → power stop jalan", powerCalls.includes("stop") && !/diproteksi/.test(cpTxt()));

// toggle granular: matikan stop doang
lib.setFeature("stop", false);
cpReplies.length = 0; powerCalls.length = 0;
await cp.handler(mkC("stop MyServer 1"), { sock });
t("3l. stop dimatiin khusus → stop jalan lagi", powerCalls.includes("stop") && !/diproteksi/.test(cpTxt()));
cpReplies.length = 0; powerCalls.length = 0;
await cp.handler(mkC("kill MyServer 1"), { sock });
t("3m. kill masih terproteksi", !powerCalls.includes("kill") && /diproteksi/.test(cpTxt()));
lib.setFeature("stop", true);

// ═══ SECTION 4: gate delserver / delpanel ═══
section("4. gate delserver / delpanel");
const ds = await import(R + "/plugins/panel/delserver.js");
const dp = await import(R + "/plugins/panel/delpanel.js");
const dReplies = [];
function mkD(text, opts = {}) {
  return {
    command: opts.command || "delserverv1", args: text.split(/\s+/).filter(Boolean), text, prefix: ".",
    sender: opts.sender || USER_A, chat: opts.sender || USER_A,
    isOwner: opts.isOwner ?? false, isGroup: false,
    mentionedJid: null, quoted: null, react: async () => {},
    reply: async (x) => dReplies.push(String(x)),
  };
}
const dTxt = () => dReplies.join("\n");

dReplies.length = 0;
await ds.handler(mkD("delserverv1 777"), { sock });
t("4a. protect on → delserver diblokir buat user", /diproteksi/.test(dTxt()) && /cpanelprotect settings/.test(dTxt()), dTxt().slice(0, 140));

dReplies.length = 0;
await dp.handler(mkD("delpanel 777", { command: "delpanel" }), { sock });
t("4b. protect on → delpanel diblokir buat user", /diproteksi/.test(dTxt()), dTxt().slice(0, 140));

dReplies.length = 0;
await ds.handler(mkD("delserverv1 777", { isOwner: true, sender: "628999000000@s.whatsapp.net" }), { sock });
t("4c. owner bypass → delserver lewat gate (lanjut ke validasi biasa)", !/diproteksi/.test(dTxt()), dTxt().slice(0, 140));

srv.close();
try { fs.unlinkSync(PROTECT_FILE); } catch {}

console.log("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exitCode = fail > 0 ? 1 : 0;
