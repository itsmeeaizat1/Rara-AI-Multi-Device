// RARA AI - MULTI DEVICE — E2E: AUTO BROADCAST SALURAN (finalisasi Saluran WA
// 25 Sep). Plugin .autobroadcastchannel tadinya GAK punya e2e — bug nyata
// ketemu pas audit finalisasi: raraBox dipakai 4x tapi GAK pernah diimport
// → ReferenceError crash di `.autobroadcastchannel all on/off` + toggle event
// (hanya tampilan status yang jalan). Suite ini maksa jalur-jalur itu.
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const R = path.resolve(__dirname, "../..");
process.chdir(R);

let pass = 0, fail = 0;
function t(name, cond, info) {
  if (cond) { pass++; console.log("  ✅ " + name); }
  else { fail++; console.error("  ❌ " + name, info !== undefined ? JSON.stringify(info)?.slice(0, 200) : ""); }
}
const section = (x) => console.log("\n— " + x + " —");

const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(path.join(os.tmpdir(), "saluran-autobc-e2e-db-" + Date.now()));

const { NOTIFY_EVENTS, getAllNotifyStatus, setNotifyEnabled, notifyUserBanned, _setBroadcastSendForTest, _resetBroadcastSendForTest } = await import(R + "/src/lib/rara-saluran-broadcast.js");
const db = getDatabase();

// ═══ SECTION 1: plugin .autobroadcastchannel ═══
section("1. plugin .autobroadcastchannel");
const plugin = await import(R + "/plugins/owner/autobroadcastchannel.js");
const sent = [];
const mkM = (text) => ({
  text, isOwner: true, prefix: ".", chat: "o@s", sender: "o@s",
  args: text.slice(1).split(/\s+/).slice(1),
  react: async () => true,
  reply: async (x) => { sent.push(String(x)); return true; },
});
const run = async (text) => { sent.length = 0; await plugin.handler(mkM(text), { sock: null, config: (await import(R + "/config.js")).default }); return sent.join("\n"); };

// 1a: status tampil semua event (jalur yang GAK kena bug — baseline)
const outStatus = await run(".autobroadcastchannel");
t("1a. status tampil daftar event (" + Object.keys(NOTIFY_EVENTS).length + ")", Object.keys(NOTIFY_EVENTS).every((k) => outStatus.includes(k)), outStatus.slice(0, 120));

// 1b: all on — jalur raraBox yang tadinya CRASH (ReferenceError)
let crashed = false;
let outAll = "";
try { outAll = await run(".autobroadcastchannel all on"); } catch (e) { crashed = true; }
t("1b. all on GAK crash (bug raraBox fixed)", !crashed, { crashed, out: outAll.slice(0, 120) });
t("1c. all on → semua event kecatat ON", Object.values(getAllNotifyStatus()).every((x) => x.enabled === true));
t("1d. state db.setting tersimpan (bukan cuma teks)", db.setting("saluranNotify_userBanned") === true);

// 1e: all off
await run(".autobroadcastchannel all off");
t("1e. all off → semua event kembali off", Object.values(getAllNotifyStatus()).every((x) => x.enabled === false));

// 1f: toggle per-event
const outOne = await run(".autobroadcastchannel premiumAdd on");
t("1f. toggle per-event jalan + jujur", !crashed && db.setting("saluranNotify_premiumAdd") === true, outOne.slice(0, 120));
await run(".autobroadcastchannel premiumAdd off");
t("1g. toggle off per-event", db.setting("saluranNotify_premiumAdd") === false);

// 1h: event gak dikenal → pesan error informatif (bukan crash)
let outBad = "";
crashed = false;
try { outBad = await run(".autobroadcastchannel eventHantu on"); } catch (e) { crashed = true; }
t("1h. event gak dikenal → error jujur, gak crash", !crashed && /tidak ada|event tersedia/i.test(outBad), outBad.slice(0, 120));

// 1i: `all` tanpa on/off → hint format
crashed = false;
let outFmt = "";
try { outFmt = await run(".autobroadcastchannel all"); } catch (e) { crashed = true; }
t("1i. all tanpa arg → hint format, gak crash", !crashed && /on\/off/i.test(outFmt), outFmt.slice(0, 120));

// ═══ SECTION 2: lib broadcast — toggle + bentuk balasan default ═══
section("2. lib rara-saluran-broadcast");
t("2a. default semua event OFF (gak spam tanpa izin owner)", Object.values(getAllNotifyStatus()).every((x) => x.enabled === false));
t("2b. setNotifyEnabled balikin nilai baru", setNotifyEnabled("userRegister", true) === true && setNotifyEnabled("userRegister", false) === false);
t("2c. label event manusiawi (bukan key mentah)", getAllNotifyStatus().userRegister.label && getAllNotifyStatus().userRegister.label !== "userRegister", getAllNotifyStatus().userRegister);

// ═══ SECTION 3: redesign kartu modern 3 Okt (5 Okt 2026) — format pesan ═══
section("3. kartu notif desain modern (via seam)");
const captured = [];
_setBroadcastSendForTest((message, options, bannerTitle, thumbName) => { captured.push({ message, options, bannerTitle, thumbName }); });

// toggle off → jujur gak kirim
setNotifyEnabled("userBanned", false);
const rOff = await notifyUserBanned(null, { phoneNumber: "628111", reason: "spam", totalBanned: 2 });
t("3a. toggle off → gak kirim, jujur", rOff.sent === false && /Toggle off/.test(rOff.reason || "") && captured.length === 0);

// toggle on → kartu modern ke kirim (user terdaftar → ada baris Nama)
setNotifyEnabled("userBanned", true);
db.data.users = db.data.users || {};
db.data.users["628111222333@s.whatsapp.net"] = { regName: "Dita" };
const rOn = await notifyUserBanned(null, { phoneNumber: "628111222333", reason: "spam", totalBanned: 3 });
const msg = captured[0]?.message || "";
t("3b. header kartu Indonesia 「 ✦ Pengguna Diblokir ✦ 」", rOn.sent === true && msg.includes("「 ✦ Pengguna Diblokir ✦ 」"), msg.slice(0, 80));
t("3c. field modern: Nomor + Alasan + Total", /📱 Nomor: 628111222333/.test(msg) && /❓ Alasan: spam/.test(msg) && /🚫 Total diblokir: 3/.test(msg), msg.slice(0, 160));
t("3g. Nama di-resolve dari db & DIATAS nomor", /👤 Nama: Dita/.test(msg) && msg.indexOf("👤 Nama: Dita") < msg.indexOf("📱 Nomor:"), msg.split("\n").slice(0, 3).join(" | "));
// nomor asing (gak terdaftar) → baris nama dilewati, kartu tetap rapi
const rAsing = await notifyUserBanned(null, { phoneNumber: "628999000111", reason: "tes", totalBanned: 4 });
const msgAsing = captured[captured.length - 1]?.message || "";
t("3h. nomor asing → tanpa baris Nama, kartu tetap kirim", rAsing.sent === true && !/👤 Nama:/.test(msgAsing) && /📱 Nomor: 628999000111/.test(msgAsing), msgAsing.split("\n").slice(0, 2).join(" | "));
t("3d. footer credit watermark Rara AI", /Powered by Rara AI - Multi Device/.test(msg), msg.slice(-80));
t("3e. judul banner per-event (Indonesia)", captured[0]?.bannerTitle === "Pengguna Diblokir", captured[0]?.bannerTitle);
t("3e2. thumbName per-event utk asset custom saluran (assets/image/saluran/)", captured[0]?.thumbName === "userBanned", captured[0]?.thumbName);
t("3f. gak ada sisa desain lama (bold caps/Inggris)", !/\*USER DIBANNED\*/.test(msg) && !/「 ✦ USER DIBANNED ✦ 」/.test(msg), "ok");

setNotifyEnabled("userBanned", false);
_resetBroadcastSendForTest();

// ═══ SECTION 4: event BARU serverCreated (owner 6 Okt 2026 — info server
// baru dibuat ke saluran) ═══
section("4. event serverCreated (notif server panel baru)");
const { notifyServerCreated } = await import(R + "/src/lib/rara-saluran-broadcast.js");

// 4a: event terdaftar + label Indonesia Title Case
t("4a. event serverCreated terdaftar + label Title Case", getAllNotifyStatus().serverCreated?.label === "Server Baru Dibuat", getAllNotifyStatus().serverCreated);

// 4b: default OFF → jujur gak kirim
const rOff2 = await notifyServerCreated(null, { phoneNumber: "628111222333", username: "aizat", server: "test-1gb", ram: "1 GB" });
t("4b. default OFF → gak kirim, jujur", rOff2.sent === false && /Toggle off/.test(rOff2.reason || ""));

// 4c: toggle ON → kartu modern terkirim via seam
const cap2 = [];
_setBroadcastSendForTest((message, options, bannerTitle, thumbName) => { cap2.push({ message, options, bannerTitle, thumbName }); });
setNotifyEnabled("serverCreated", true);
db.data.users["628111222333@s.whatsapp.net"] = { regName: "Dita" };
const rOn2 = await notifyServerCreated(null, {
  phoneNumber: "628111222333", username: "aizat", server: "dita-bot",
  ram: "2 GB", cpu: "80%", disk: "2 GB", serverId: 42, totalServers: 7,
});
const msg2 = cap2[0]?.message || "";
t("4c. ON → kartu terkirim + header 「 ✦ Server Baru Dibuat ✦ 」", rOn2.sent === true && msg2.includes("「 ✦ Server Baru Dibuat ✦ 」"), msg2.slice(0, 80));
t("4d. field unik panel: Username + Server + RAM/CPU/Storage + Server ID",
  /🏷 Username: aizat/.test(msg2) && /🖥 Server: dita-bot/.test(msg2) &&
  /💾 RAM: 2 GB/.test(msg2) && /⚙️ CPU: 80%/.test(msg2) && /📁 Storage: 2 GB/.test(msg2) &&
  /🆔 Server ID: 42/.test(msg2), msg2.slice(0, 200));
t("4e. Nama di-resolve & DIATAS nomor (aturan kartu pengguna)",
  /👤 Nama: Dita/.test(msg2) && msg2.indexOf("👤 Nama: Dita") < msg2.indexOf("📱 Nomor:"), msg2.split("\n").slice(0, 3).join(" | "));
t("4f. Total server terbuat tercantum", /🧩 Total server terbuat: 7/.test(msg2), msg2.slice(-120));
t("4g. footer credit + banner judul per-event",
  /Powered by Rara AI - Multi Device/.test(msg2) && cap2[0]?.bannerTitle === "Server Baru Dibuat", cap2[0]?.bannerTitle);
t("4g2. serverCreated thumbName utk asset custom saluran", cap2[0]?.thumbName === "serverCreated", cap2[0]?.thumbName);

// 4h: nomor asing → tanpa baris Nama
const rAsing2 = await notifyServerCreated(null, { phoneNumber: "628777000111", username: "budi", server: "budi-1gb" });
const msgAsing2 = cap2[cap2.length - 1]?.message || "";
t("4h. nomor asing → tanpa baris Nama, kartu tetap kirim", rAsing2.sent === true && !/👤 Nama:/.test(msgAsing2) && /📱 Nomor: 628777000111/.test(msgAsing2), msgAsing2.split("\n").slice(0, 2).join(" | "));

// 4i: createserver.js nyambungin (anchor statis — panggil setelah delivery, anti-throw)
const csSrc = String((await import("node:fs")).readFileSync(R + "/plugins/panel/createserver.js", "utf8"));
t("4i. createserver.js manggil notifyServerCreated (anti-throw, setelah delivery)",
  /notifyServerCreated/.test(csSrc) && /gak fatal/.test(csSrc) &&
  csSrc.indexOf("notifyServerCreated") > csSrc.indexOf("deliveryMode === 1") &&
  csSrc.indexOf("notifyServerCreated") < csSrc.indexOf('m.react("🐣")'), "anchor order");

setNotifyEnabled("serverCreated", false);
_resetBroadcastSendForTest();

console.log("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exitCode = fail > 0 ? 1 : 0;
