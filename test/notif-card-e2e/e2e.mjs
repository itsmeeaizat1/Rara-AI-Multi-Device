// E2E — Desain notif sistem: banner preview card branding Nova (ala .play)
// Request owner 19 Sep 2026: "rapihkan menu yg blm ke desain kyk desain skrg,
// cntoh notif bot doctor / notif fitur baru g pakai desain skrg kyk desain .play".
// SATU PINTU nova-notif-card.js → dipakai boot doctor DM, Bot Online, broadcast
// .bot off/on, notif saluran (broadcastToSaluran).
import { strict as assert } from "assert";
import fs from "fs";
import os from "os";
import path from "path";

const R = path.resolve(".");
let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
function t(name, cond, extra = "") {
  if (cond) { pass++; w(`  ✅ ${name}`); }
  else { fail++; w(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}
process.on("uncaughtException", (e) => { w("UNCAUGHT: " + (e?.stack || e)); process.exit(1); });
process.on("unhandledRejection", (e) => { w("REJECTION: " + (e?.stack || e)); process.exit(1); });

const {
  notifBanner, sendNotif, getBrandThumb,
  _setNotifSendForTest,
} = await import(R + "/src/lib/nova-notif-card.js");

// ═══ SECTION 1: notifBanner — contextInfo banner ala .play ═══
w("\n— section 1: notifBanner —");

const bn = await notifBanner({ title: "Boot Doctor — Nova AI", body: "⚠ 3 masalah · 29 sehat" });
t("1a. balik contextInfo.externalAdReply", !!bn?.externalAdReply);
const ext = bn.externalAdReply || {};
t("1b. title + body masuk card", ext.title === "Boot Doctor — Nova AI" && ext.body === "⚠ 3 masalah · 29 sehat", JSON.stringify(ext).slice(0, 80));
t("1c. renderLargerThumbnail (banner gede kayak .play)", ext.renderLargerThumbnail === true);
t("1d. mediaType 1 + bukan iklan", ext.mediaType === 1 && ext.showAdAttribution === false);
t("1e. sourceUrl default = link saluran official", typeof ext.sourceUrl === "string" && ext.sourceUrl.length > 0, ext.sourceUrl);

const thumb = await getBrandThumb();
t("1f. thumbnail branding channel-banner ke-load (jpeg 640x360)", !!thumb && thumb.length > 1000, thumb ? String(thumb.length) : "null");
t("1g. banner bawa thumbnail", !!ext.thumbnail && ext.thumbnail.length > 0);

// clamp panjang title/body (batas WA)
const bn2 = await notifBanner({ title: "T".repeat(120), body: "B".repeat(90) });
t("1h. title/body ke-clamp (60/45 char)", bn2.externalAdReply.title.length === 60 && bn2.externalAdReply.body.length === 45);

// default tanpa opts
const bn3 = await notifBanner();
t("1i. tanpa opts → default nama bot (gak crash)", typeof bn3.externalAdReply.title === "string" && bn3.externalAdReply.title.length > 0, bn3.externalAdReply.title);

// ═══ SECTION 2: sendNotif — satu pintu kirim ═══
w("\n— section 2: sendNotif —");

const sent = [];
_setNotifSendForTest((jid, payload) => { sent.push({ jid, payload }); return { key: { id: "x" } } });
await sendNotif(null, "6281owner@s.whatsapp.net", "ISI NOTIF", { title: "Tes", body: "sub" });
t("2a. payload = text utuh + contextInfo banner", sent.length === 1 && sent[0].payload.text === "ISI NOTIF" && !!sent[0].payload.contextInfo?.externalAdReply);
t("2b. jid tujuan bener", sent[0].jid === "6281owner@s.whatsapp.net");
_setNotifSendForTest(undefined);

// tanpa seam → sock.sendMessage beneran dipanggil
const sockSent = [];
await sendNotif({ sendMessage: async (jid, payload) => { sockSent.push({ jid, payload }); return { key: { id: "y" } } } },
  "123@g.us", "HALO", { title: "X" });
t("2c. tanpa seam → lewat sock.sendMessage", sockSent.length === 1 && sockSent[0].payload.text === "HALO" && !!sockSent[0].payload.contextInfo);

// disabled → gak kirim
_setNotifSendForTest(null);
const before = sockSent.length;
await sendNotif({ sendMessage: async () => { sockSent.push({}); } }, "z", "Z");
t("2d. seam null (disabled) → gak kirim apa-apa", sockSent.length === before);
_setNotifSendForTest(undefined);

// ═══ SECTION 3: boot doctor DM pakai banner ═══
w("\n— section 3: boot doctor DM —");

const {
  _setDoctorHttpForTest, _setBootDoctorSockForTest, _setBootDoctorSentHookForTest,
  _setBootDoctorStateFileForTest, runAndReport,
} = await import(R + "/src/lib/nova-boot-doctor.js");

// http mock: semua probe OK (biar laporan "semua sehat" + payload kecil)
_setDoctorHttpForTest(async (url) => ({ ok: true, status: 200 }));
const tmpState = fs.mkdtempSync(path.join(os.tmpdir(), "notifcard-bd-"));
_setBootDoctorStateFileForTest(path.join(tmpState, "state.json"));
const bdSent = [];
_setBootDoctorSockForTest({
  sendMessage: async (jid, payload) => { bdSent.push({ jid, payload }); return { key: { id: "z" } } },
});
await runAndReport({ send: true });
t("3a. DM owner kekirim", bdSent.length === 1 && bdSent[0].jid === "628174887770@s.whatsapp.net", JSON.stringify(bdSent.map((d) => d.jid)));
const bdPayload = bdSent[0]?.payload || {};
t("3b. laporan beneran pakai banner (contextInfo.externalAdReply)", !!bdPayload.contextInfo?.externalAdReply, JSON.stringify(Object.keys(bdPayload)));
t("3c. judul banner Boot Doctor", /boot doctor/i.test(bdPayload.contextInfo?.externalAdReply?.title || ""), bdPayload.contextInfo?.externalAdReply?.title);
t("3d. body banner = ringkasan hasil (semua sehat)", /sehat/i.test(bdPayload.contextInfo?.externalAdReply?.body || ""), bdPayload.contextInfo?.externalAdReply?.body);
const { fromSC } = await import(R + "/src/lib/styler.js");
t("3e. isi laporan teks tetap utuh (plain)", typeof bdPayload.text === "string" && /total diperiksa/.test(fromSC(bdPayload.text)), (bdPayload.text || "").slice(0, 80));

// probe bermasalah → body banner nunjukin jumlah
_setDoctorHttpForTest(async (url) => (url.includes("cuki") ? { ok: false, status: 401 } : { ok: true, status: 200 }));
_setBootDoctorStateFileForTest(path.join(tmpState, "state2.json"));
bdSent.length = 0;
await runAndReport({ send: true });
t("3f. ada masalah → body banner nyebut jumlah masalah", /\d+\s*masalah|⚠/i.test(bdPayload2(bdSent)), (bdSent[0]?.payload?.contextInfo?.externalAdReply?.body || ""));
function bdPayload2(arr) { return arr[0]?.payload?.contextInfo?.externalAdReply?.body || "" }

// cleanup section 3
_setDoctorHttpForTest(undefined);
_setBootDoctorSockForTest(null);
try { fs.rmSync(tmpState, { recursive: true, force: true }) } catch {}

// ═══ SECTION 4: broadcast .bot off/on pakai banner ═══
w("\n— section 4: broadcast status bot —");

const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase("/tmp/notifcard-e2e-db/nova.json");
const db = getDatabase();
const config = (await import(R + "/config.js")).default;

const INVITE_CODE = "BANNERtestCODE12345";
const NUM_JID = "123456789012345@newsletter";
config.saluran = { id: "@newsletter", link: `https://whatsapp.com/channel/${INVITE_CODE}`, name: "Nova AI Official" };
db.db.data.groups = db.db.data.groups || {};
db.db.data.groups["999888777-1@g.us"] = { id: "999888777-1@g.us", subject: "Grup Tes" };
await db.save();

// reset cache saluran (import segar udah otomatis fresh di process ini)
// seam canvas: kartu status jadi deterministik di e2e — pakai createCanvas
// asli tapi loadImage DIBUANG (jalur gradient offline) biar gak nembak
// network wallpapersden yang bikin test flaky (kadang >2.6 dtk > jeda test)
const { _setStatusCardCanvasForTest } = await import(R + "/src/lib/nova-notif-card.js");
const _kit = await import("@napi-rs/canvas");
_setStatusCardCanvasForTest({
  createCanvas: _kit.createCanvas,
  loadImage: async () => { throw new Error("offline e2e"); },
});
const botPlugin = await import(R + "/plugins/owner/bot.js");
const bcSent = [];
const bSock = {
  newsletterMetadata: async (type, key) => {
    if (type === "invite" && key === INVITE_CODE) return { id: NUM_JID, name: "Nova AI Official" };
    if (type === "jid" && key === NUM_JID) return { id: NUM_JID, viewer_role: "ADMIN" };
    return null;
  },
  sendMessage: async (jid, payload) => { bcSent.push({ jid, payload }); return { key: { id: "x" } } },
};

const mOff = {
  text: ".bot off", args: ["off"], isOwner: true, chat: "628owner@s.whatsapp.net",
  react: async () => {},
  reply: async (txt) => { bcSent.push({ jid: "owner-dm", payload: { text: txt } }); return txt },
};
await botPlugin.handler(mOff, { sock: bSock, isOwner: true });
await new Promise((r) => setTimeout(r, 2600));

const toGroup = bcSent.find((d) => d.jid === "999888777-1@g.us");
const toChannel = bcSent.find((d) => d.jid === NUM_JID);
t("4a. notif ke GRUP pakai banner", !!toGroup?.payload?.contextInfo?.externalAdReply, JSON.stringify(Object.keys(toGroup?.payload || {})));
t("4b. notif ke SALURAN pakai banner (externalAdReply di-keep sanitizer)", !!toChannel?.payload?.contextInfo?.externalAdReply, JSON.stringify(Object.keys(toChannel?.payload || {})));
t("4c. isi teks notif tetap utuh", /dimatikan/i.test(toGroup?.payload?.text || ""), (toGroup?.payload?.text || "").slice(0, 60));
t("4d. judul banner nyebut BOT DIMATIKAN (revisi owner 20 Sep: canvas dinamis per state)", (toGroup?.payload?.contextInfo?.externalAdReply?.title || "").includes("BOT DIMATIKAN"), toGroup?.payload?.contextInfo?.externalAdReply?.title);
t("4e. thumbnail banner .bot off = canvas JPEG valid (bukan asset branding statis)", (() => {
  const th = toGroup?.payload?.contextInfo?.externalAdReply?.thumbnail;
  return Buffer.isBuffer(th) && th.length > 100 && th[0] === 0xff && th[1] === 0xd8;
})(), "thumbnail bytes");
{
  // revisi owner 20 Sep: kartu status gaya kartu level — letterbox 640x360 JPEG
  const sharpMod = (await import("sharp")).default;
  let dim = { width: 0, height: 0 };
  try { dim = await sharpMod(toGroup?.payload?.contextInfo?.externalAdReply?.thumbnail).metadata(); } catch {}
  t("4i. thumbnail 640x360 letterbox — persis ukuran kartu level", dim.width === 640 && dim.height === 360, JSON.stringify(dim));
}

// nyala lagi
bcSent.length = 0;
const mOn = {
  text: ".bot on", args: ["on"], isOwner: true, chat: "628owner@s.whatsapp.net",
  react: async () => {},
  reply: async (txt) => { bcSent.push({ jid: "owner-dm", payload: { text: txt } }); return txt },
};
await botPlugin.handler(mOn, { sock: bSock, isOwner: true });
await new Promise((r) => setTimeout(r, 2600));
const onGroup = bcSent.find((d) => d.jid === "999888777-1@g.us");
t("4f. notif .bot on juga pakai banner", !!onGroup?.payload?.contextInfo?.externalAdReply);
t("4g. judul banner .bot on nyebut BOT DIHIDUPKAN", (onGroup?.payload?.contextInfo?.externalAdReply?.title || "").includes("BOT DIHIDUPKAN"), onGroup?.payload?.contextInfo?.externalAdReply?.title);
t("4h. thumbnail .bot on BEDA dari thumbnail .bot off (canvas regenerate per state, bukan asset statis)", (() => {
  const offThumb = toGroup?.payload?.contextInfo?.externalAdReply?.thumbnail;
  const onThumb = onGroup?.payload?.contextInfo?.externalAdReply?.thumbnail;
  return Buffer.isBuffer(offThumb) && Buffer.isBuffer(onThumb) && !offThumb.equals(onThumb);
})());

// ═══ SECTION 5: notif saluran (broadcastToSaluran 16+ fitur) ═══
w("\n— section 5: notif saluran sewa/premium/ban —");

const { broadcastToSaluran, setNotifyEnabled, notifyPremiumAdd } =
  await import(R + "/src/lib/nova-saluran-broadcast.js");
setNotifyEnabled("premiumAdd", true);
bcSent.length = 0;
await notifyPremiumAdd(bSock, { name: "Budi", phoneNumber: "628123", days: 30 });
const saluranPayload = bcSent.find((d) => d.jid === NUM_JID)?.payload;
t("5a. payload notif saluran bawa banner", !!saluranPayload?.contextInfo?.externalAdReply, JSON.stringify(Object.keys(saluranPayload || {})));
t("5b. banner judul Nova AI Official", (saluranPayload?.contextInfo?.externalAdReply?.title || "") === "Nova AI Official", saluranPayload?.contextInfo?.externalAdReply?.title);
t("5c. isi notif tetap plain text (aturan 5 Sep — tanpa box/smallcaps)", /USER BARU PREMIUM/.test(saluranPayload?.text || "") && !/[│╭╰]/.test(saluranPayload?.text || ""), (saluranPayload?.text || "").slice(0, 60));
setNotifyEnabled("premiumAdd", false);

// ── cleanup ──
db.setting("botPower", true);
db.setting("botMute", false);
delete db.db.data.groups["999888777-1@g.us"];
await db.save().catch(() => {});

w(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
