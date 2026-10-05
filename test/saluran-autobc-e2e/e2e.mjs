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
_setBroadcastSendForTest((message, options, bannerTitle) => { captured.push({ message, options, bannerTitle }); });

// toggle off → jujur gak kirim
setNotifyEnabled("userBanned", false);
const rOff = await notifyUserBanned(null, { phoneNumber: "628111", reason: "spam", totalBanned: 2 });
t("3a. toggle off → gak kirim, jujur", rOff.sent === false && /Toggle off/.test(rOff.reason || "") && captured.length === 0);

// toggle on → kartu modern ke kirim
setNotifyEnabled("userBanned", true);
const rOn = await notifyUserBanned(null, { phoneNumber: "628111222333", reason: "spam", totalBanned: 3 });
const msg = captured[0]?.message || "";
t("3b. header kartu 「 ✦ USER DIBANNED ✦ 」", rOn.sent === true && msg.includes("「 ✦ USER DIBANNED ✦ 」"), msg.slice(0, 80));
t("3c. field modern: Nomor + Alasan + Total", /📱 Nomor: 628111222333/.test(msg) && /❓ Alasan: spam/.test(msg) && /🚫 Total banned: 3/.test(msg), msg.slice(0, 160));
t("3d. footer credit watermark Rara AI", /Powered by Rara AI - Multi Device/.test(msg), msg.slice(-80));
t("3e. judul banner per-event", captured[0]?.bannerTitle === "User Dibanned", captured[0]?.bannerTitle);
t("3f. gak ada sisa desain lama (bold caps)", !/\*USER DIBANNED\*/.test(msg), "ok");

setNotifyEnabled("userBanned", false);
_resetBroadcastSendForTest();

console.log("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exitCode = fail > 0 ? 1 : 0;
