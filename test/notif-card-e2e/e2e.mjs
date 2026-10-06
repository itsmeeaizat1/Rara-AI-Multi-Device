// E2E — Desain notif sistem: banner preview card branding Rara (ala .play)
// Request owner 19 Sep 2026: "rapihkan menu yg blm ke desain kyk desain skrg,
// cntoh notif bot doctor / notif fitur baru g pakai desain skrg kyk desain .play".
// SATU PINTU rara-notif-card.js → dipakai boot doctor DM, Bot Online, broadcast
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
} = await import(R + "/src/lib/rara-notif-card.js");

// ═══ SECTION 1: notifBanner — contextInfo banner ala .play ═══
w("\n— section 1: notifBanner —");

// REVISI 20 Sep (owner, screenshot: "link whatsapp.com ini ubah jd waktu,
// gayanya kayak gaya bot dimatikan tadi") — notifBanner gak nerima `body`
// lagi, body SELALU waktu+tanggal, sourceUrl DIBUANG TOTAL (sama pola statusBanner).
const bn = await notifBanner({ title: "Boot Doctor — Rara AI" });
t("1a. balik contextInfo.externalAdReply", !!bn?.externalAdReply);
const ext = bn.externalAdReply || {};
t("1b. title masuk card + body = waktu/tanggal (bukan teks custom)", ext.title === "Boot Doctor — Rara AI" && /\d{4}/.test(ext.body), JSON.stringify(ext).slice(0, 80));
t("1c. renderLargerThumbnail (banner gede kayak .play)", ext.renderLargerThumbnail === true);
t("1d. mediaType 1 + bukan iklan", ext.mediaType === 1 && ext.showAdAttribution === false);
t("1e. GAK ADA sourceUrl (link whatsapp.com dihilangkan, sama kayak statusBanner)", !("sourceUrl" in ext), JSON.stringify(ext));

const thumb = await getBrandThumb();
t("1f. thumbnail branding channel-banner ke-load (jpeg 640x360)", !!thumb && thumb.length > 1000, thumb ? String(thumb.length) : "null");
t("1g. banner bawa thumbnail", !!ext.thumbnail && ext.thumbnail.length > 0);

// clamp panjang title/body (batas WA)
const bn2 = await notifBanner({ title: "T".repeat(120) });
t("1h. title ke-clamp 60 char (body waktu otomatis ≤45 char)", bn2.externalAdReply.title.length === 60 && bn2.externalAdReply.body.length <= 45);

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
} = await import(R + "/src/lib/rara-boot-doctor.js");

// http mock: semua probe OK (biar laporan "semua sehat" + payload kecil)
_setDoctorHttpForTest(async (url) => ({ ok: true, status: 200 }));
const tmpState = fs.mkdtempSync(path.join(os.tmpdir(), "notifcard-bd-"));
_setBootDoctorStateFileForTest(path.join(tmpState, "state.json"));
const bdSent = [];
// FIX 6 Okt 2026: boot doctor DM kini kartu HEADER IMAGE ala .menu
// (sendNotifCard) — mock sock wajib relayMessage + waUploadToServer.
_setBootDoctorSockForTest({
  user: { jid: "628174887770@s.whatsapp.net" },
  waUploadToServer: async () => ({ url: "https://mmg.whatsapp.net/fake.jpg" }),
  relayMessage: async (jid, stanza) => { bdSent.push({ jid, stanza }); return {}; },
  sendMessage: async (jid, payload) => { bdSent.push({ jid, payload }); return { key: { id: "z" } } },
});
await runAndReport({ send: true });
t("3a. DM owner kekirim", bdSent.length === 1 && bdSent[0].jid === "628174887770@s.whatsapp.net", JSON.stringify(bdSent.map((d) => d.jid)));
const bdIm = bdSent[0]?.stanza?.viewOnceMessage?.message?.interactiveMessage;
t("3b. laporan pakai KARTU HEADER media ala .menu (bukan banner lama)", !!(bdIm?.header?.imageMessage || bdIm?.header?.videoMessage) && bdIm?.header?.hasMediaAttachment === true, JSON.stringify(Object.keys(bdIm?.header || {})));
const { fromSC } = await import(R + "/src/lib/styler.js");
// teks laporan sekarang plain standar (aturan 1 Okt) — "Total diperiksa" kapital,
// bukan smallcaps ᴛᴏᴛᴀʟ yang dulu dariSC-balikin lowercase.
t("3c. isi laporan teks tetap utuh di body kartu (plain)", typeof bdIm?.body?.text === "string" && /total diperiksa/i.test(fromSC(bdIm.body.text)), (bdIm?.body?.text || "").slice(0, 80));
t("3d. desain lama externalAdReply GAK terpakai lagi di chat biasa", !bdIm?.contextInfo?.externalAdReply, JSON.stringify(Object.keys(bdIm?.contextInfo || {})));

// FIX 6 Okt 2026 (owner screenshot: "Unknown(kode:undefined)" nongol di atas
// header image) — nativeFlowMessage WAJIB isi messageParamsJson chip, bukan
// cuma buttons:[] kosong (akar bug placeholder WA client).
let bdChip = null;
try { bdChip = JSON.parse(bdIm?.nativeFlowMessage?.messageParamsJson || "{}"); } catch {}
t("3e. chip branding (limited_time_offer) terisi — fix placeholder Unknown(kode:undefined)",
  typeof bdIm?.nativeFlowMessage?.messageParamsJson === "string" && !!bdChip?.limited_time_offer?.text,
  bdIm?.nativeFlowMessage?.messageParamsJson || "");

// probe bermasalah → jumlah masalah tetap kebaca di body kartu
_setDoctorHttpForTest(async (url) => (url.includes("cuki") ? { ok: false, status: 401 } : { ok: true, status: 200 }));
_setBootDoctorStateFileForTest(path.join(tmpState, "state2.json"));
bdSent.length = 0;
await runAndReport({ send: true });
const bdIm2 = bdSent[0]?.stanza?.viewOnceMessage?.message?.interactiveMessage;
t("3f. ada masalah → jumlah masalah tetap kebaca di TEKS laporan", /masalah/i.test(fromSC(bdIm2?.body?.text || "")), (bdIm2?.body?.text || "").slice(0, 200));

// cleanup section 3
_setDoctorHttpForTest(undefined);
_setBootDoctorSockForTest(null);
try { fs.rmSync(tmpState, { recursive: true, force: true }) } catch {}

// ═══ SECTION 4: broadcast .bot off/on pakai banner ═══
w("\n— section 4: broadcast status bot —");

const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase("/tmp/notifcard-e2e-db/rara.json");
const db = getDatabase();
const config = (await import(R + "/config.js")).default;

const INVITE_CODE = "BANNERtestCODE12345";
const NUM_JID = "123456789012345@newsletter";
config.saluran = { id: "@newsletter", link: `https://whatsapp.com/channel/${INVITE_CODE}`, name: "Rara AI Official" };
db.db.data.groups = db.db.data.groups || {};
db.db.data.groups["999888777-1@g.us"] = { id: "999888777-1@g.us", subject: "Grup Tes" };
await db.save();

// reset cache saluran (import segar udah otomatis fresh di process ini)
// seam canvas: kartu status revisi owner 20 Sep — background HITAM POLOS +
// teks PUTIH tanpa nama bot, gak ada network load lagi (loadImage dibuang),
// createCanvas asli cukup deterministik.
const { _setStatusCardCanvasForTest } = await import(R + "/src/lib/rara-notif-card.js");
const _kit = await import("@napi-rs/canvas");
_setStatusCardCanvasForTest({
  createCanvas: _kit.createCanvas,
  loadImage: async () => { throw new Error("offline e2e"); },
});
const botPlugin = await import(R + "/plugins/bot/bot.js");
const bcSent = [];
// FIX 6 Okt 2026: grup/DM kini kartu header image (relayMessage capture),
// saluran tetap payload banner lewat sendMessage.
const bSock = {
  user: { jid: "628owner@s.whatsapp.net" },
  newsletterMetadata: async (type, key) => {
    if (type === "invite" && key === INVITE_CODE) return { id: NUM_JID, name: "Rara AI Official" };
    if (type === "jid" && key === NUM_JID) return { id: NUM_JID, viewer_role: "ADMIN" };
    return null;
  },
  waUploadToServer: async () => ({ url: "https://mmg.whatsapp.net/fake.jpg" }),
  relayMessage: async (jid, stanza) => { bcSent.push({ jid, stanza }); return {}; },
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
const toChannel = bcSent.find((d) => d.jid === NUM_JID && d.payload);
const gIm = toGroup?.stanza?.viewOnceMessage?.message?.interactiveMessage;
const chExt = toChannel?.payload?.contextInfo?.externalAdReply || {};
t("4a. notif ke GRUP pakai KARTU HEADER IMAGE ala .menu (fix 6 Okt)", !!gIm?.header?.imageMessage && gIm?.header?.hasMediaAttachment === true, JSON.stringify(Object.keys(toGroup || {})));
t("4b. notif ke SALURAN tetap banner externalAdReply (channel gak support kartu)", !!toChannel?.payload?.contextInfo?.externalAdReply, JSON.stringify(Object.keys(toChannel?.payload || {})));
t("4c. isi teks notif tetap utuh di body kartu grup", /dimatikan/i.test(gIm?.body?.text || ""), (gIm?.body?.text || "").slice(0, 60));
t("4d. saluran: judul banner Title Case Indonesia (Bot Dimatikan, revisi asset 6 Okt)", /bot dimatikan/i.test(chExt.title || ""), chExt.title);
// revisi owner 20 Sep (SALURAN): "jgn link whatsapp tp waktu aja sama tanggal" —
// sourceUrl dibuang total + body waktu/tanggal.
t("4d2. saluran: kartu status GAK ADA sourceUrl (baris link whatsapp.com dihilangkan)", !("sourceUrl" in (chExt || { sourceUrl: 1 })));
t("4d3. saluran: body kartu status nunjukin tanggal (bukan link/nama bot)", /\d{4}/.test(chExt.body || ""), chExt.body);
t("4d4. saluran: judul kartu status Title Case (Bot Dimatikan)", chExt.title === "Bot Dimatikan", chExt.title);
t("4e. saluran: thumbnail dari ASSET assets/image/saluran/ (BUKAN canvas, revisi owner 6 Okt)", (() => {
  const th = chExt.thumbnail;
  return Buffer.isBuffer(th) && th.length > 100 && th[0] === 0xff && th[1] === 0xd8;
})(), "thumbnail bytes");
{
  // revisi owner 6 Okt: thumbnail saluran murni dari FILE asset (canvas
  // dihapus dari jalur saluran) — placeholder folder saluran persis bytes.
  const fsMod = (await import("fs")).default;
  const pathMod = (await import("path")).default;
  const phPath = pathMod.join(process.cwd(), "assets", "image", "saluran", "placeholder.jpg");
  let sameBytes = false;
  try { sameBytes = fsMod.readFileSync(phPath).equals(chExt.thumbnail); } catch {}
  t("4i. saluran: thumbnail = placeholder folder saluran (persis bytes file asset)", sameBytes, phPath);
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
const onChannel = bcSent.find((d) => d.jid === NUM_JID && d.payload);
const onGIm = onGroup?.stanza?.viewOnceMessage?.message?.interactiveMessage;
t("4f. notif .bot on ke grup juga pakai KARTU HEADER IMAGE", !!onGIm?.header?.imageMessage && onGIm?.header?.hasMediaAttachment === true);
t("4g. saluran .bot on: judul banner Title Case (Bot Dihidupkan)", /bot dihidupkan/i.test(onChannel?.payload?.contextInfo?.externalAdReply?.title || ""), onChannel?.payload?.contextInfo?.externalAdReply?.title);
t("4h. saluran: thumbnail .bot on juga dari asset (status-on → placeholder folder saluran)", (() => {
  const onThumb = onChannel?.payload?.contextInfo?.externalAdReply?.thumbnail;
  return Buffer.isBuffer(onThumb) && onThumb.length > 100 && onThumb[0] === 0xff && onThumb[1] === 0xd8;
})(), "thumbnail bytes");

// ═══ SECTION 5: notif saluran (broadcastToSaluran 16+ fitur) ═══
w("\n— section 5: notif saluran sewa/premium/ban —");

const { broadcastToSaluran, setNotifyEnabled, notifyPremiumAdd } =
  await import(R + "/src/lib/rara-saluran-broadcast.js");
setNotifyEnabled("premiumAdd", true);
bcSent.length = 0;
await notifyPremiumAdd(bSock, { name: "Budi", phoneNumber: "628123", days: 30 });
const saluranPayload = bcSent.find((d) => d.jid === NUM_JID)?.payload;
t("5a. payload notif saluran bawa banner", !!saluranPayload?.contextInfo?.externalAdReply, JSON.stringify(Object.keys(saluranPayload || {})));
// REDESIGN 5 Okt: judul banner per-event (bannerTitle) + kartu 「 ✦ 」 modern,
// kartu pengguna wajib 「👤 Nama」 di atas 「📱 Nomor」.
t("5b. banner judul per-event: Pengguna Baru Premium", (saluranPayload?.contextInfo?.externalAdReply?.title || "") === "Pengguna Baru Premium", saluranPayload?.contextInfo?.externalAdReply?.title);
t("5c. isi notif kartu 「 ✦ 」 + Nama sebelum Nomor", /Pengguna Baru Premium/i.test(saluranPayload?.text || "") && saluranPayload?.text.indexOf("👤 Nama") > -1 && saluranPayload?.text.indexOf("📱 Nomor") > saluranPayload.text.indexOf("👤 Nama"), (saluranPayload?.text || "").slice(0, 60));
setNotifyEnabled("premiumAdd", false);

// ── cleanup ──
db.setting("botPower", true);
db.setting("botMute", false);
delete db.db.data.groups["999888777-1@g.us"];
await db.save().catch(() => {});

w(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
