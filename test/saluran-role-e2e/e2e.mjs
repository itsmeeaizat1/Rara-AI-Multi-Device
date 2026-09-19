// E2E — FIX ADMIN GATE SALURAN + STATUS SALURAN DI REPLY OWNER
// AKAR (19 Sep 2026, owner: ".bot off pesannya ga nyampe ke saluran"):
// fork "nova" newsletterMetadata() balikin hasil MENTAH WMex
// { id, thread_metadata, viewer_metadata:{role} } — cek lama baca
// meta.viewer_role (gak pernah ada) → bot admin sekalipun dianggap "bukan-admin".
// FIX: normalizeNewsletterMeta() + reason spesifik + hasil saluran keliatan
// di reply .bot off/on/mute (saluranStatusLine).
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

const { normalizeNewsletterMeta, getSaluranChannel, _resetSaluranCacheForTest } =
  await import(R + "/src/lib/nova-saluran.js");
const config = (await import(R + "/config.js")).default;

// ═══ SECTION 1: normalizeNewsletterMeta — dua bentuk ═══
w("\n— section 1: normalizer —");

const RAW_ADMIN = {
  id: "120363012345678901@newsletter",
  state: { type: "ACTIVE" },
  thread_metadata: {
    name: { text: "Nova AI Official" },
    description: { text: "Saluran resmi Nova AI" },
    subscribers_count: "1234",
    verification: "VERIFIED",
    invite: "0029Vb97Nir9RZAWiwelWi29",
    creation_time: 1700000000,
  },
  viewer_metadata: { role: "ADMIN", mute: "OFF" },
};
const n1 = normalizeNewsletterMeta(RAW_ADMIN);
t("1a. bentuk MENTAH (fork nova) → id kebaca", n1?.id === "120363012345678901@newsletter", JSON.stringify(n1));
t("1b. name dari thread_metadata.name.text", n1?.name === "Nova AI Official");
t("1c. followers dari subscribers_count (angka)", n1?.followers === 1234);
t("1d. role dari viewer_metadata.role", n1?.role === "ADMIN");
t("1e. verification VERIFIED", n1?.verification === "VERIFIED");
t("1f. state ACTIVE", n1?.state === "ACTIVE");
t("1g. description dari thread_metadata.description.text", n1?.description === "Saluran resmi Nova AI");

const FLAT_SUBSCRIBER = {
  id: "120363098765432109@newsletter",
  name: "Saluran Lain",
  subscribers: 42,
  verification: "UNVERIFIED",
  viewer_role: "SUBSCRIBER",
  state: "ACTIVE",
};
const n2 = normalizeNewsletterMeta(FLAT_SUBSCRIBER);
t("1h. bentuk FLAT (baileys klasik) tetap di-support", n2?.name === "Saluran Lain" && n2?.followers === 42 && n2?.role === "SUBSCRIBER");
t("1i. null/garbage → null (gak crash)", normalizeNewsletterMeta(null) === null && normalizeNewsletterMeta("x") === null && normalizeNewsletterMeta({}) === null);

// ═══ SECTION 2: getSaluranChannel — gate admin bener sekarang ═══
w("\n— section 2: gate admin —");

_resetSaluranCacheForTest();
config.saluran = { id: "@newsletter", name: "Nova AI Official", link: "https://whatsapp.com/channel/0029Vb97Nir9RZAWiwelWi29" };

const { fromSC } = await import(R + "/src/lib/styler.js");

// REGRESI INTI: bot ADMIN via metadata MENTAH (dulu kena bug → "bukan-admin")
const sockAdminRaw = {
  newsletterMetadata: async (type, key) => {
    if (type === "invite") return { id: "120363012345678901@newsletter" };
    return RAW_ADMIN; // jid → bentuk mentah, role ADMIN
  },
};
_resetSaluranCacheForTest();
const rAdmin = await getSaluranChannel(sockAdminRaw);
t("2a. ⭐ bot ADMIN (bentuk mentah) → OK (dulu BUG: dianggap bukan-admin)", rAdmin.ok === true && rAdmin.reason === "ok", JSON.stringify(rAdmin));

// OWNER juga ok
_resetSaluranCacheForTest();
const rOwner = await getSaluranChannel({
  newsletterMetadata: async (type, key) => (type === "invite" ? { id: "120363012345678901@newsletter" } : { ...RAW_ADMIN, viewer_metadata: { role: "OWNER" } }),
});
t("2b. bot OWNER → OK", rOwner.ok === true);

// SUBSCRIBER → skip + reason jelas
_resetSaluranCacheForTest();
const rSub = await getSaluranChannel({
  newsletterMetadata: async (type, key) => (type === "invite" ? { id: "120363012345678901@newsletter" } : { ...RAW_ADMIN, viewer_metadata: { role: "SUBSCRIBER" } }),
});
t("2c. SUBSCRIBER → skip reason bot-bukan-admin", rSub.ok === false && rSub.reason === "bot-bukan-admin", rSub.reason);

// GUEST → skip reason spesifik (bot belum follow saluran)
_resetSaluranCacheForTest();
const rGuest = await getSaluranChannel({
  newsletterMetadata: async (type, key) => (type === "invite" ? { id: "120363012345678901@newsletter" } : { ...RAW_ADMIN, viewer_metadata: { role: "GUEST" } }),
});
t("2d. GUEST → skip reason bot-belum-follow-saluran", rGuest.ok === false && rGuest.reason === "bot-belum-follow-saluran", rGuest.reason);

// metadata gak kebaca → tetap coba kirim (jangan over-block)
_resetSaluranCacheForTest();
const rNoMeta = await getSaluranChannel({
  newsletterMetadata: async () => null,
});
t("2e. metadata null → tetap ok (coba kirim, jangan skip)", rNoMeta.ok === true);

// bentuk FLAT admin juga ok (backward compat)
_resetSaluranCacheForTest();
const rFlat = await getSaluranChannel({
  newsletterMetadata: async (type, key) => (type === "invite" ? { id: "120363012345678901@newsletter" } : { id: "120363012345678901@newsletter", viewer_role: "ADMIN" }),
});
t("2f. bentuk FLAT admin → OK", rFlat.ok === true);

// ═══ SECTION 3: saluranStatusLine — reply owner gak senyap lagi ═══
w("\n— section 3: saluranStatusLine (bot.js) —");

const botPlugin = await import(R + "/plugins/owner/bot.js");
// saluranStatusLine gak di-export (internal) — tes lewat reply .bot off/on
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase("/tmp/saluran-role-e2e-db/nova.json");
const db = getDatabase();

const INVITE_CODE = "0029Vb97Nir9RZAWiwelWi29";
const NUM_JID = "120363012345678901@newsletter";
config.saluran = { id: "@newsletter", link: `https://whatsapp.com/channel/${INVITE_CODE}`, name: "Nova AI Official" };
db.db.data.groups = db.db.data.groups || {};
db.db.data.groups["999888777-1@g.us"] = { id: "999888777-1@g.us", subject: "Grup Tes" };
await db.save();

const replies = [];
const makeSock = (role) => ({
  newsletterMetadata: async (type, key) => {
    if (type === "invite" && key === INVITE_CODE) return { id: NUM_JID };
    if (type === "jid" && key === NUM_JID) {
      if (role === "none") return null;
      return { ...RAW_ADMIN, viewer_metadata: { role } };
    }
    return null;
  },
  sendMessage: async (jid, payload) => ({ jid, payload }),
});

async function runBotOff(role) {
  db.setting("botPower", true);
  await db.save();
  replies.length = 0;
  const m = {
    text: ".bot off", args: ["off"], isOwner: true, chat: "628owner@s.whatsapp.net",
    react: async () => {},
    reply: async (txt) => { replies.push(txt); return txt },
  };
  await botPlugin.handler(m, { sock: makeSock(role), isOwner: true });
  return replies[0] || "";
}

// ADMIN → reply bilang "✅ terkirim"
const repAdmin = fromSC(await runBotOff("ADMIN"));
t("3a. bot admin → reply nunjukin saluran ✅ terkirim", /terkirim/.test(repAdmin), repAdmin.split("\n").find((l) => l.includes("saluran")));

// SUBSCRIBER → reply bilang DILEWATI + solusi "jadikan admin"
const repSub = fromSC(await runBotOff("SUBSCRIBER"));
t("3b. bukan admin → reply nunjukin DILEWATI (gak senyap)", /dilewati/i.test(repSub), repSub.split("\n").find((l) => l.includes("saluran") || /dilewati/i.test(l)));
t("3c. kasih solusi jadikan bot admin + .saluranid", /jadikan bot admin/.test(repSub) && /\.saluranid/.test(repSub), repSub.split("\n").find((l) => /dilewati/i.test(l)));

// GUEST → reply nunjukin "belum follow"
const repGuest = fromSC(await runBotOff("GUEST"));
t("3d. guest → reply nunjukin belum follow saluran", /belum follow saluran/.test(repGuest), repGuest.split("\n").find((l) => l.includes("saluran")));

// metadata null → tetap kirim (ok)
const repNoMeta = fromSC(await runBotOff("none"));
t("3e. metadata gak kebaca → tetap nyebut terkirim/diproses (gak blokir)", /terkirim|diproses/.test(repNoMeta), repNoMeta.split("\n").find((l) => l.includes("saluran")));

// ═══ SECTION 4: .bot off tetap kirim payload banner ke saluran ═══
w("\n— section 4: payload —");

const sent = [];
const sockTrack = makeSock("ADMIN");
sockTrack.sendMessage = async (jid, payload) => { sent.push({ jid, payload }); return { key: { id: "t" } } };
db.setting("botPower", true);
await db.save();
replies.length = 0;
const m4 = {
  text: ".bot off", args: ["off"], isOwner: true, chat: "628owner@s.whatsapp.net",
  react: async () => {},
  reply: async (txt) => { replies.push(txt); return txt },
};
await botPlugin.handler(m4, { sock: sockTrack, isOwner: true });
await new Promise((r) => setTimeout(r, 400));
const toChannel = sent.find((d) => d.jid === NUM_JID);
t("4a. payload ke saluran muncul", !!toChannel, JSON.stringify(sent.map((d) => d.jid)));
t("4b. payload bawa banner contextInfo", !!toChannel?.payload?.contextInfo?.externalAdReply);
t("4c. saluran dikirim duluan (sebelum grup)", sent[0]?.jid === NUM_JID, JSON.stringify(sent.map((d) => d.jid)));

// cleanup
db.setting("botPower", true);
db.setting("botMute", false);
delete db.db.data.groups["999888777-1@g.us"];
await db.save().catch(() => {});
_resetSaluranCacheForTest();

w(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
