// E2E — Saluran ID: resolve URL→ID newsletter + fix notif .bot on/off ke saluran + .setchannel persist
// Request owner 19 Sep 2026: "bot dimatiikan/diaktifkan notifnya gak sampai ke saluran nova
// official" + "g ada fitur url saluran wa convert jadi id newsletternya".
import { strict as assert } from "assert";
import fs from "fs";
import os from "os";
import path from "path";
const R = path.resolve(".");
const { fromSC } = await import(R + "/src/lib/styler.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
function t(name, cond, extra = "") {
  if (cond) { pass++; w(`  ✅ ${name}`); }
  else { fail++; w(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}
process.on("uncaughtException", (e) => { w("UNCAUGHT: " + (e?.stack || e)); process.exit(1); });
process.on("unhandledRejection", (e) => { w("REJECTION: " + (e?.stack || e)); process.exit(1); });

// ── import lib satu pintu ──
const { resolveNewsletterJid, getSaluranChannel, persistSaluranConfig,
  _resetSaluranCacheForTest, _setSaluranConfigPathForTest } =
  await import("../../src/lib/nova-saluran.js");
const config = (await import("../../config.js")).default;

// simpen config asli — semua test mutasi runtime config, restore di akhir
const ORIG = JSON.parse(JSON.stringify(config.saluran || {}));
const INVITE_CODE = "TESTinviteCODE12345678";
const NUM_JID = "123456789012345@newsletter";
const FALLBACK_JID = "120363404849776664@newsletter";

// ═══ SECTION 1: resolveNewsletterJid ═══
w("\n— section 1: resolveNewsletterJid (placeholder → link invite → ID numerik) —");

// id numerik langsung → tanpa sock pun jalan
config.saluran = { id: NUM_JID, link: "https://x.example", name: "T" };
t("1a. id numerik di config → balik langsung", (await resolveNewsletterJid(null)) === NUM_JID);

// placeholder (bug asli owner) → resolve dari link
let fetchCount = 0;
config.saluran = { id: "@newsletter", link: `https://whatsapp.com/channel/${INVITE_CODE}`, name: "X" };
_resetSaluranCacheForTest();
const mockSockInvite = {
  newsletterMetadata: async (type, key) => {
    fetchCount++;
    assert(type === "invite" && key === INVITE_CODE, "harusnya query invite pakai kode link");
    return { id: NUM_JID, name: "Saluran Tes", subscribers: 500 };
  },
};
t("1b. placeholder → resolve dari link jadi ID numerik", (await resolveNewsletterJid(mockSockInvite)) === NUM_JID);
t("1c. kedua call pakai cache (fetch cuma 1x)", (await resolveNewsletterJid(mockSockInvite)) === NUM_JID && fetchCount === 1, "fetch=" + fetchCount);
_resetSaluranCacheForTest();
t("1d. cache di-flush → fetch lagi", (await resolveNewsletterJid(mockSockInvite)) === NUM_JID && fetchCount === 2, "fetch=" + fetchCount);

// resolve gagal → fallback JID BENERAN, bukan placeholder "@newsletter"
_resetSaluranCacheForTest();
const deadSock = { newsletterMetadata: async () => { throw new Error("down") } };
const fb = await resolveNewsletterJid(deadSock);
t("1e. resolve gagal → fallback JID numerik (BUKAN placeholder @newsletter)", fb === FALLBACK_JID, fb);

// ═══ SECTION 2: getSaluranChannel (gate admin) ═══
w("\n— section 2: getSaluranChannel —");

const chanSock = (role) => ({
  newsletterMetadata: async (type, key) =>
    type === "invite" ? { id: NUM_JID, name: "S" }
      : { id: NUM_JID, viewer_role: role, name: "S" },
});
config.saluran = { id: "@newsletter", link: `https://whatsapp.com/channel/${INVITE_CODE}`, name: "X" };
_resetSaluranCacheForTest();

let ch = await getSaluranChannel(chanSock("ADMIN"));
t("2a. bot ADMIN di saluran → boleh kirim (ok)", ch.ok === true && ch.jid === NUM_JID);
ch = await getSaluranChannel(chanSock("OWNER"));
t("2b. bot OWNER di saluran → boleh kirim", ch.ok === true);
_resetSaluranCacheForTest();
ch = await getSaluranChannel(chanSock("SUBSCRIBER"));
t("2c. bot cuma SUBSCRIBER → skip (reason bot-bukan-admin)", ch.ok === false && ch.reason === "bot-bukan-admin");
_resetSaluranCacheForTest();
ch = await getSaluranChannel({ newsletterMetadata: async (type) => type === "invite" ? { id: NUM_JID } : null });
t("2d. metadata jid gak kebaca → tetap coba kirim (ok)", ch.ok === true);

// ═══ SECTION 3: persistSaluranConfig (file YANG BENER: bot-identity.js) ═══
w("\n— section 3: persistSaluranConfig —");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "saluran-e2e-"));
const tmpFile = path.join(tmpDir, "bot-identity.js");
fs.writeFileSync(tmpFile, `// dummy\nconst botIdentity = {\n  saluran: {\n    // komentar\n    id: "@newsletter",\n    name: "Nova AI Official",\n    link: "https://whatsapp.com/channel/oldlink1234567890",\n  },\n};\nexport default botIdentity;\n`);
_setSaluranConfigPathForTest(tmpFile);
config.saluran = { id: "@newsletter", name: "Nova AI Official", link: "https://whatsapp.com/channel/oldlink1234567890" };

persistSaluranConfig({ id: NUM_JID, link: `https://whatsapp.com/channel/${INVITE_CODE}`, name: "Nova Baru" });
const written = fs.readFileSync(tmpFile, "utf8");
t("3a. id numerik ke-tulis ke file", written.includes(`id: "${NUM_JID}"`), written.slice(0, 200));
t("3b. link ke-tulis ke file", written.includes(`link: "https://whatsapp.com/channel/${INVITE_CODE}"`));
t("3c. name ke-tulis di BLOK saluran doang", written.includes('name: "Nova Baru"'));
t("3d. struktur file tetep valid-ish (blok saluran utuh)", written.includes("saluran: {") && written.includes("export default botIdentity"));
t("3e. runtime config.saluran ikut ke-update (tanpa restart)", config.saluran.id === NUM_JID && config.saluran.link.includes(INVITE_CODE) && config.saluran.name === "Nova Baru");

// persist kedua kali (id udah numerik, bukan placeholder) → harus tetap keganti
persistSaluranConfig({ id: "999888777666555@newsletter" });
t("3f. re-persist: id lama numerik JUGO bisa keganti (regex gak cuma match placeholder)", fs.readFileSync(tmpFile, "utf8").includes('id: "999888777666555@newsletter"'));
_setSaluranConfigPathForTest(null);

// ═══ SECTION 4: plugin .channelid (URL → ID newsletter) ═══
w("\n— section 4: plugin .channelid —");

const plugin = await import("../../plugins/owner/channelid.js");
const handler = plugin.default ? plugin.default.handler : plugin.handler;
const pluginCfg = plugin.default ? plugin.default.config : plugin.config;
t("4a. named export config + handler (pola loader)", !!(pluginCfg && handler) || !!(plugin.config && plugin.handler));
t("4b. kategori owner + isOwner gate", (pluginCfg || plugin.config).isOwner === true);

const mkM = (text) => {
  const sent = [];
  const args = text.trim().split(/\s+/).slice(1);
  return {
    m: {
      text, args,
      react: async () => {},
      reply: async (txt) => { sent.push(fromSC(String(txt))); return txt },
    },
    sent,
  };
};

const saluranSock = {
  newsletterMetadata: async (type, key) => {
    if (type === "invite" && key === INVITE_CODE) {
      return { id: NUM_JID, name: "Nova AI Official", subscribers: 12345, state: "ACTIVE", verified: true };
    }
    if (type === "jid" && key === NUM_JID) {
      return { id: NUM_JID, name: "Nova AI Official", subscribers: 12345, state: "ACTIVE", verified: true };
    }
    return null;
  },
};

// convert URL → ID
{
  const { m, sent } = mkM(`.channelid https://whatsapp.com/channel/${INVITE_CODE}?mode=r`);
  await handler(m, { sock: saluranSock });
  const out = sent[0] || "";
  t("4c. URL saluran → reply ada ID numerik", out.includes(NUM_JID), out.slice(0, 120));
  t("4d. reply nunjukin nama + follower", out.toLowerCase().includes("nova ai official") && out.includes("12.345"), out.slice(0, 160));
  t("4e. reply kasih hint .setchannel biar langsung dipasang", out.includes(".setchannel"));
}

// kode invite polos
{
  const { m, sent } = mkM(`.channelid ${INVITE_CODE}`);
  await handler(m, { sock: saluranSock });
  t("4f. kode invite polos → juga dikenali", (sent[0] || "").includes(NUM_JID), (sent[0] || "").slice(0, 120));
}

// input ID newsletter → validasi + info
{
  const { m, sent } = mkM(`.channelid ${NUM_JID}`);
  await handler(m, { sock: saluranSock });
  const out = sent[0] || "";
  t("4g. input ID@newsletter → validasi + info verified", out.includes(NUM_JID) && out.toLowerCase().includes("verified"), out.slice(0, 140));
}

// invalid
{
  const { m, sent } = mkM(".channelid ini bukan link");
  await handler(m, { sock: saluranSock });
  t("4h. input gak dikenali → pesan error + contoh", (sent[0] || "").toLowerCase().includes("gak dikenali"));
}
{
  const { m, sent } = mkM(".channelid https://whatsapp.com/channel/zzzzzzzzzzzzzz");
  await handler(m, { sock: saluranSock });
  t("4i. invite gak ada → error informatif", (sent[0] || "").includes("Gagal dapat ID") || (sent[0] || "").toLowerCase().includes("gagal"));
}

// tanpa arg → guide
{
  const { m, sent } = mkM(".channelid");
  await handler(m, { sock: saluranSock });
  const out = sent[0] || "";
  t("4j. tanpa arg → panduan cara pakai", out.includes("channelid") && out.includes("whatsapp.com/channel"));
}

// ═══ SECTION 5: broadcastStatusChange kirim ke saluran (bug asli owner) ═══
w("\n— section 5: notif .bot off/on nyampe saluran —");

const botPlugin = await import("../../plugins/owner/bot.js");
const { initDatabase, getDatabase } = await import("../../src/lib/nova-database.js");
await initDatabase("/tmp/saluran-id-e2e-db/nova.json");
const db = getDatabase();

// 1 grup + saluran (bot admin) — target broadcast
config.saluran = { id: "@newsletter", link: `https://whatsapp.com/channel/${INVITE_CODE}`, name: "Nova AI Official" };
_resetSaluranCacheForTest();
db.db.data.groups = db.db.data.groups || {};
db.db.data.groups["123456789-1234@g.us"] = { id: "123456789-1234@g.us", subject: "Grup Tes" };
await db.save();

const delivered = [];
const bSock = {
  newsletterMetadata: async (type, key) => {
    if (type === "invite" && key === INVITE_CODE) return { id: NUM_JID, name: "Nova AI Official" };
    if (type === "jid" && key === NUM_JID) return { id: NUM_JID, viewer_role: "ADMIN" };
    return null;
  },
  sendMessage: async (jid, payload) => { delivered.push({ jid, payload }); return { key: { id: "x" } } },
};

// jalur cepat: handler .bot off (broadcast fire-and-forget) lalu tunggu
const mOff = {
  text: ".bot off", args: ["off"], isOwner: true,
  chat: "628owner@s.whatsapp.net",
  react: async () => {},
  reply: async (txt) => { delivered.push({ jid: "owner", payload: { text: txt } }); return txt },
};
await botPlugin.handler(mOff, { sock: bSock, isOwner: true });

// tunggu fire-and-forget broadcast selesai (2 target × 800ms + buffer)
await new Promise((r) => setTimeout(r, 2600));

const toChannel = delivered.filter((d) => d.jid === NUM_JID);
const toGroup = delivered.filter((d) => d.jid === "123456789-1234@g.us");
t("5a. notif off terkirim ke SALURAN (ID numerik resolve dari link)", toChannel.length === 1, JSON.stringify(delivered.map((d) => d.jid)));
t("5b. payload saluran berupa teks (lewat sendSaluranSafe)", toChannel[0]?.payload?.text && /dimatikan/i.test(toChannel[0].payload.text), String(toChannel[0]?.payload?.text || "").slice(0, 100));
t("5c. notif off tetap ke grup", toGroup.length === 1);

// nyala lagi → on
const mOn = {
  text: ".bot on", args: ["on"], isOwner: true,
  chat: "628owner@s.whatsapp.net",
  react: async () => {},
  reply: async (txt) => { delivered.push({ jid: "owner", payload: { text: txt } }); return txt },
};
await botPlugin.handler(mOn, { sock: bSock, isOwner: true });
await new Promise((r) => setTimeout(r, 2600));
const onToChannel = delivered.filter((d) => d.jid === NUM_JID);
t("5d. notif .bot on JUGA nyampe saluran", onToChannel.length === 2, "total=" + onToChannel.length);
t('5e. isi notif on beneran "kembali aktif"', /kembali aktif/i.test(onToChannel.at(-1)?.payload?.text || ""));

// bot BUKAN admin di saluran → skip, gak kirim ke saluran
_resetSaluranCacheForTest();
const bSockNonAdmin = {
  newsletterMetadata: async (type, key) => {
    if (type === "invite" && key === INVITE_CODE) return { id: NUM_JID, name: "Nova AI Official" };
    if (type === "jid" && key === NUM_JID) return { id: NUM_JID, viewer_role: "SUBSCRIBER" };
    return null;
  },
  sendMessage: async (jid, payload) => { delivered.push({ jid, payload }); return { key: { id: "x" } } },
};
delivered.length = 0;
db.setting("botPower", true);
const mOff2 = {
  text: ".bot off", args: ["off"], isOwner: true,
  chat: "628owner@s.whatsapp.net",
  react: async () => {},
  reply: async (txt) => { delivered.push({ jid: "owner", payload: { text: txt } }); return txt },
};
await botPlugin.handler(mOff2, { sock: bSockNonAdmin, isOwner: true });
await new Promise((r) => setTimeout(r, 2600));
const chanAfter = delivered.filter((d) => d.jid === NUM_JID);
t("5f. bot bukan admin → saluran di-skip (gak kirim), grup tetap kirim", chanAfter.length === 0 && delivered.some((d) => d.jid === "123456789-1234@g.us"), JSON.stringify(delivered.map((d) => d.jid)));

// ═══ SECTION 6: broadcastToSaluran — pintu 16+ fitur (sewa/premium/ban/daftar) ═══
w("\n— section 6: broadcastToSaluran (notif semua fitur ke saluran) —");

const { broadcastToSaluran, isNotifyEnabled, setNotifyEnabled, notifyPremiumAdd } =
  await import("../../src/lib/nova-saluran-broadcast.js");
// db udah ke-init di section 5

config.saluran = { id: "@newsletter", link: `https://whatsapp.com/channel/${INVITE_CODE}`, name: "Nova AI Official" };
_resetSaluranCacheForTest();
const bcSent = [];
const bcSock = {
  newsletterMetadata: async (type, key) =>
    type === "invite" && key === INVITE_CODE ? { id: NUM_JID, name: "Nova AI Official" } : null,
  sendMessage: async (jid, payload) => { bcSent.push({ jid, payload }); return { key: { id: "x" } } },
};

// BUG LAMA: gerbang placeholder → "belum dikonfigurasi" → gagal senyap selama ini
const r1 = await broadcastToSaluran(bcSock, "TES NOTIF SEWA");
t("6a. config placeholder → tetap TERKIRIM (resolve dari link)", r1.sent === true && r1.saluranId === NUM_JID, JSON.stringify(r1));
t("6b. beneran sampai ke JID saluran numerik", bcSent.length === 1 && bcSent[0].jid === NUM_JID, JSON.stringify(bcSent.map((x) => x.jid)));
t("6c. payload teks utuh (lewat sendSaluranSafe)", /TES NOTIF SEWA/.test(bcSent[0]?.payload?.text || ""));

// notify asli (premium add) ikut jalan lewat pintu yang sama
setNotifyEnabled("premiumAdd", true);
bcSent.length = 0;
await notifyPremiumAdd(bcSock, { user: "Budi", nomor: "628123", duration: "30 hari" });
t("6d. notifyPremiumAdd nyampe saluran", bcSent.some((d) => d.jid === NUM_JID), JSON.stringify(bcSent.map((d) => d.jid)));
setNotifyEnabled("premiumAdd", false);

// toggle off → gak kirim (toggle dicek di tiap notify*, bukan di broadcastToSaluran)
bcSent.length = 0;
setNotifyEnabled("premiumAdd", false);
const rOff = await notifyPremiumAdd(bcSock, { user: "Budi", nomor: "628123", duration: "30 hari" });
t("6e. toggle off → gak kirim (masing2 event tetap bergantung .autobroadcastchannel)", rOff.sent === false && bcSent.length === 0, JSON.stringify(rOff));

// sock mati total → error informatif, bukan senyap
_resetSaluranCacheForTest();
const r3 = await broadcastToSaluran({ newsletterMetadata: async () => { throw new Error("down") } }, "TES DOWN");
t("6f. upstream down → reason jelas (fallback JID tetap dicoba)", typeof r3.reason === "string");

// ── cleanup + restore ──
db.setting("botPower", true);
db.setting("botMute", false);
delete db.db.data.groups["123456789-1234@g.us"];
await db.save().catch(() => {});
config.saluran = ORIG;
_resetSaluranCacheForTest();
try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}

w(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
