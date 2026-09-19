// E2E — 3 SISTEM LANGKA BOT MD LUAR YANG BARU DITAMBAHKE (19 Sep 2026):
// (1) Always Online (presence keepalive) .alwaysonline
// (2) Status Post .swpost (teks & media)
// (3) Auto Download Status .swsave (forward status kontak → DM owner)
// Jalankan: node test/status-alwaysonline-e2e/e2e.mjs
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

process.on("uncaughtException", (e) => { console.error("[UNCAUGHT]", e); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error("[UNHANDLED]", e); process.exit(1); });

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
await initDatabase(fs.mkdtempSync(path.join(os.tmpdir(), "status-alwaysonline-db-")) + "/nova.json");
const db = getDatabase();

const ao = await import(R + "/src/lib/nova-always-online.js");
const sd = await import(R + "/src/lib/nova-status-download.js");
const pluginAo = await import(R + "/plugins/owner/alwaysonline.js");
const pluginSp = await import(R + "/plugins/owner/statuspost.js");
const pluginSs = await import(R + "/plugins/owner/statussave.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };
const norm = (s) => fromSC(String(s)).toLowerCase();

function mkSock() {
  const sent = [];
  let presence = [];
  return {
    sendMessage: async (jid, payload, opts) => { sent.push({ jid, payload, opts }); return { key: { id: "X" } }; },
    sendPresenceUpdate: async (p, jid) => { presence.push(p); },
    __sent: sent, __presence: presence,
  };
}

function mkM(over = {}) {
  const sent = [];
  return {
    sender: over.sender || "628174887770@s.whatsapp.net",
    chat: over.chat || "628174887770@s.whatsapp.net",
    pushName: "Owner",
    isOwner: true,
    isGroup: false,
    isCommand: true,
    command: over.command || "",
    args: over.args || [],
    text: over.text || "",
    quoted: over.quoted || null,
    reply: async (text, opts) => { sent.push({ text: norm(text) }); },
    __sent: sent,
  };
}

// ══════════════ 1. ALWAYS ONLINE (lib) ══════════════
w("\n— 1. always online lib —");
ao._setAlwaysOnlineForTest(null);
check("1a. default MATI", ao.getAlwaysOnlineStatus().enabled === false);
const sock1 = mkSock();
check("1b. start saat off → false & timer gak jalan", ao.startAlwaysOnline(sock1) === false && ao.getAlwaysOnlineStatus().running === false);

ao._setAlwaysOnlineForTest({ enabled: true, intervalMin: 10 });
check("1c. start saat on → true", ao.startAlwaysOnline(sock1) === true);
check("1d. heartbeat pertama langsung kirim presence available", sock1.__presence.includes("available"));
check("1e. timer jalan (running)", ao.getAlwaysOnlineStatus().running === true);
await new Promise((r) => setTimeout(r, 30)); // FIX 19 Sep: beat() async — beatCount nambah setelah await presence
check("1f. beatCount tercatat", ao.getAlwaysOnlineStatus().beatCount >= 1);
ao.stopAlwaysOnline();
check("1g. stop → timer mati", ao.getAlwaysOnlineStatus().running === false);

// plugin: on via db asli
ao._setAlwaysOnlineForTest(null);
db.setting("alwaysOnline", null);
const mOn = mkM({ text: ".alwaysonline on" });
await pluginAo.handler(mOn, { sock: mkSock() });
check("1h. .alwaysonline on → db enabled true + pesan konfirmasi", (db.setting("alwaysOnline") || {}).enabled === true && /online 24 jam/.test(mOn.__sent[0].text));

const mOff = mkM({ text: ".alwaysonline off" });
await pluginAo.handler(mOff, { sock: mkSock() });
check("1i. .alwaysonline off → db enabled false", (db.setting("alwaysOnline") || {}).enabled === false);

const mInt = mkM({ text: ".alwaysonline interval 5" });
await pluginAo.handler(mInt, { sock: mkSock() });
check("1j. .alwaysonline interval 5 → intervalMin 5", (db.setting("alwaysOnline") || {}).intervalMin === 5);

const mSt = mkM({ text: ".alwaysonline status" });
await pluginAo.handler(mSt, { sock: mkSock() });
check("1k. .alwaysonline status → nunjukin mode", /mode/.test(mSt.__sent[0].text));

const mBad = mkM({ text: ".alwaysonline interval 99" });
await pluginAo.handler(mBad, { sock: mkSock() });
check("1l. interval di luar rentang → gak diubah", (db.setting("alwaysOnline") || {}).intervalMin === 5 && /1-60/.test(mBad.__sent[0].text));

// ══════════════ 2. STATUS POST ══════════════
w("\n— 2. status post —");
const sock2 = mkSock();
const mHelp = mkM({ text: ".swpost" });
await pluginSp.handler(mHelp, { sock: sock2 });
check("2a. tanpa teks → panduan", /posting status\/story/.test(mHelp.__sent[0].text) && /cara pakai/.test(mHelp.__sent[0].text));

const mTxt = mkM({ text: ".swpost selamat pagi semua" });
await pluginSp.handler(mTxt, { sock: sock2 });
check("2b. .swpost <teks> → kirim ke status@broadcast", sock2.__sent.some(s => s.jid === "status@broadcast" && s.payload.text === "selamat pagi semua"));
const sendTxt = sock2.__sent.find(s => s.payload && s.payload.text === "selamat pagi semua");
check("2c. status teks bawa warna background + font", !!sendTxt && !!sendTxt.opts && /#[0-9a-f]{6}/i.test(sendTxt.opts.backgroundColor || "") && !!sendTxt.opts.font);
check("2d. reply konfirmasi sukses", /berhasil dipost/.test(mTxt.__sent[0].text));

const mWarna = mkM({ text: ".swpost warna #1e40af halo dunia" });
await pluginSp.handler(mWarna, { sock: sock2 });
const sendW = sock2.__sent.filter(s => s.jid === "status@broadcast").pop();
check("2e. warna custom kepakai", sendW && sendW.opts && sendW.opts.backgroundColor === "#1e40af");

const mMedia = mkM({
  text: ".swpost liburan",
  quoted: { type: "imageMessage", download: async () => Buffer.from("fakeimg") },
});
await pluginSp.handler(mMedia, { sock: sock2 });
const sendM = sock2.__sent.filter(s => s.jid === "status@broadcast" && s.payload.image).pop();
check("2f. reply gambar + .swpost → status image + caption", !!sendM && sendM.payload.caption === "liburan");
check("2g. konfirmasi status gambar", /status gambar berhasil/.test(mMedia.__sent[0].text));

const mVid = mkM({
  text: ".swpost",
  quoted: { type: "videoMessage", download: async () => Buffer.from("fakevid") },
});
await pluginSp.handler(mVid, { sock: sock2 });
check("2h. reply video + .swpost → status video", sock2.__sent.some(s => s.jid === "status@broadcast" && s.payload.video));

const sockFail = mkSock();
sockFail.sendMessage = async () => { throw new Error("boom"); };
const mFail = mkM({ text: ".swpost gagal nih" });
await pluginSp.handler(mFail, { sock: sockFail });
check("2i. kirim gagal → pesan error ada sebabnya", /gagal posting status teks/.test(mFail.__sent[0].text) && /boom/.test(mFail.__sent[0].text));

// ══════════════ 3. AUTO DOWNLOAD STATUS ══════════════
w("\n— 3. auto download status —");
const OWNER = "628174887770@s.whatsapp.net";
const sock3 = mkSock();
sd._setStatusForwardForTest(undefined);

const stMsg = { key: { id: "STAT1", participant: "6281234567890@s.whatsapp.net" }, message: { imageMessage: {} } };
check("3a. default MATI → gak forward", (await sd.maybeForwardStatus(sock3, stMsg, OWNER)) === false && sock3.__sent.length === 0);

db.setting("autoStatusDownload", { enabled: true });
check("3b. aktif → status diteruskan ke DM owner", (await sd.maybeForwardStatus(sock3, stMsg, OWNER)) === true && sock3.__sent.length === 2);
check("3c. payload forward = pesan status asli", sock3.__sent[0].jid === OWNER && !!sock3.__sent[0].payload.forward);
check("3d. notif penyertunya nunjukin pengirim", /status media dari @6281234567890/i.test(sock3.__sent[1].payload.text));
check("3e. dedupe — status sama gak dobel", (await sd.maybeForwardStatus(sock3, stMsg, OWNER)) === false && sock3.__sent.length === 2);

const stTxt = { key: { id: "STAT2", participant: "6281111111111@s.whatsapp.net" }, message: { extendedTextMessage: { text: "halo" } } };
check("3f. status teks juga diteruskan (label teks)", (await sd.maybeForwardStatus(sock3, stTxt, OWNER)) === true && /status teks/i.test(sock3.__sent[3].payload.text));

db.setting("autoStatusDownload", { enabled: false });
const stMsg3 = { key: { id: "STAT3", participant: "6281234567890@s.whatsapp.net" }, message: { imageMessage: {} } };
check("3g. dimatiin → stop forward", (await sd.maybeForwardStatus(sock3, stMsg3, OWNER)) === false);

sd._setStatusForwardForTest(null);
db.setting("autoStatusDownload", { enabled: true });
check("3h. seam disabled → gak kirim walau on", (await sd.maybeForwardStatus(sock3, stMsg3, OWNER)) === false);
sd._setStatusForwardForTest(undefined);

// plugin .swsave
db.setting("autoStatusDownload", null);
db.setting("statusDownloadSeen", null);
const mSsOn = mkM({ text: ".swsave on" });
await pluginSs.handler(mSsOn, { sock: sock3 });
check("3i. .swsave on → db enabled + konfirmasi dedupe", (db.setting("autoStatusDownload") || {}).enabled === true && /dedupe/.test(mSsOn.__sent[0].text));

const mSsOff = mkM({ text: ".swsave off" });
await pluginSs.handler(mSsOff, { sock: sock3 });
check("3j. .swsave off → enabled false", (db.setting("autoStatusDownload") || {}).enabled === false);

const mSsSt = mkM({ text: ".swsave status" });
await pluginSs.handler(mSsSt, { sock: sock3 });
check("3k. .swsave status → nunjukin mode", /mode/.test(mSsSt.__sent[0].text));

// ══════════════ 4. loader registrasi ══════════════
w("\n— 4. registrasi lewat loader —");
// FIX 19 Sep: loadPlugins balikin ANGKA (jumlah plugin), bukan array —
// cek registrasi lewat getPlugin() per nama (pola test/plugins-import-e2e).
const { loadPlugins, getPlugin } = await import(R + "/src/lib/nova-plugins.js");
await loadPlugins(path.join(R, "plugins"));
check("4a. alwaysonline teregistrasi", !!getPlugin("alwaysonline"));
check("4b. statuspost teregistrasi", !!getPlugin("statuspost"));
check("4c. statussave teregistrasi", !!getPlugin("statussave"));

w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
