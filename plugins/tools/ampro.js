// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Plugin .ampro/.amrefresh — aktifin AlightMotion premium via magic link email (port engine lama alightmotion.js)
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { raraGuide, raraError, raraWrap } from "../../src/lib/rara-menu-style.js";
import { getApiKey } from "../../src/lib/rara-api-keys.js";

const pluginConfig = {
  name: "ampro",
  alias: ["amrefresh", "alightmotionpro"],
  category: "tools",
  description: "Aktifin AlightMotion premium via magic link email (gratis, tanpa key)",
  usage: ".ampro <email> | .amrefresh <email> | (balas pesan magic link)",
  example: ".ampro nama@gmail.com",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

// PUSATISASI 10 Okt 2026: key pindah ke apikeys.json (fitur.amproFirebase).
// Override runtime tetap bisa: .setkey ampro <key> / env AMPRO_FIREBASE_KEY.
const KEY = getApiKey("ampro") || "";
const IDT = "https://www.googleapis.com/identitytoolkit/v3/relyingparty";
const STK = "https://securetoken.googleapis.com/v1/token";
const VFY = "https://us-central1-alight-creative.cloudfunctions.net/verifyPurchase";
const TTL = 10 * 60 * 1000;

const H1 = {
  "content-type": "application/json",
  "x-android-package": "com.alightcreative.motion",
  "x-android-cert": "ECA6BF91B8715A6F810ED0BBFC65B6CD578F52A8",
  "user-agent": "dalvik/2.1.0 (linux; u; android 15; 23127pn0cc build/bp1a.250505.005)",
};
const H2 = { "content-type": "application/json; charset=utf-8", "user-agent": "okhttp/3.12.1", "accept-encoding": "gzip" };

const dip = () => Math.floor(Math.random() * 254) + "." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255) + "." + (Math.floor(Math.random() * 253) + 1);
const sp = (h) => ({ ...h, "x-forwarded-for": dip(), "x-real-ip": dip(), "client-ip": dip(), "x-client-ip": dip(), "x-originating-ip": dip(), "x-cluster-client-ip": dip() });
const bad = (e) => e.response?.data ? (typeof e.response.data === "object" ? JSON.stringify(e.response.data) : String(e.response.data)) : e.message;

async function httpPost(url, body, headers) {
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { response: { data } };
  return data;
}

function extractCode(raw) {
  if (!raw) return null;
  let s = String(raw).replace(/&amp;/g, "&");
  try { s = decodeURIComponent(s); } catch {}
  try {
    const u = new URL(s);
    let c = u.searchParams.get("oobCode");
    if (!c) {
      const n = u.searchParams.get("link") || u.searchParams.get("q") || u.searchParams.get("url");
      if (n) { try { c = new URL(n).searchParams.get("oobCode"); } catch {} }
    }
    if (c) return c.replace(/[^a-zA-Z0-9_-]/g, "");
  } catch {}
  const match = s.match(/oobCode=([a-zA-Z0-9_-]+)/i);
  if (match) return match[1];
  const t = raw.trim();
  if (/^[a-zA-Z0-9_-]{10,}$/.test(t) && !t.includes("://")) return t;
  return null;
}

async function sendMagicLink(email) {
  try {
    await httpPost(IDT + "/getOobConfirmationCode?key=" + KEY, {
      requestType: 6, email,
      androidInstallApp: true, canHandleCodeInApp: true,
      continueUrl: "https://alightcreative.com?ui_sid=0366624874&ui_sd=0",
      iosBundleId: "com.alightcreative.motion",
      androidPackageName: "com.alightcreative.motion",
      androidMinimumVersion: "585", clientType: "CLIENT_TYPE_ANDROID",
    }, sp(H1));
    return { ok: true };
  } catch (e) { return { ok: false, why: bad(e) }; }
}

async function verifyLink(email, rawLink) {
  const c = extractCode(rawLink);
  if (!c) return { ok: false, why: "oobCode gak ketemu di link" };
  try {
    const a = await httpPost(IDT + "/emailLinkSignin?key=" + KEY, { email, oobCode: c, clientType: "CLIENT_TYPE_ANDROID" }, sp(H1));
    return { ok: true, id: a.idToken, ref: a.refreshToken, uid: a.localId, new: !!a.isNewUser };
  } catch (e) { return { ok: false, why: bad(e) }; }
}

async function activatePremium(idToken) {
  const orderId = crypto.randomBytes(6).toString("hex");
  try {
    const r = await httpPost(VFY, {
      data: {
        productId: "am.full.sub.annual.19q4",
        token: "mmgaobamlahbbeccfplmbkbb.AO-J1OzqG0or_GJJIx-ms8GrTm-jaglCRfhQSRPUZKpl2YspYS-oN7_94uv8RC5vQbvd_Ios2pPDStZ2n7F0hLE3FiOU7HS3R6Fquulv5xLXFECSv4ctElw",
        skuType: "subs", orderId,
      },
    }, sp({
      ...H2,
      authorization: "Bearer " + idToken,
      "firebase-instance-id-token": "cSDnCyp3T-uwp07z3tL86T:APA91bFkmvvsHw5nnqa1SBFci-99DRsKClLiETdRrVcJjS5yBx1v_FbCb1d8WhBuea_zmwnYBktyTIzcRhN4b6uNOUur9wPc0gKXmJDoZic0LhNq5V2s0xI",
    }));
    return { ok: true, orderId, data: r };
  } catch (e) { return { ok: false, why: bad(e) }; }
}

async function refreshAndActivate(refreshToken) {
  try {
    const r = await httpPost(STK + "?key=" + KEY, { grant_type: "refresh_token", refresh_token: refreshToken }, { "content-type": "application/json" });
    const result = await activatePremium(r.id_token);
    return { ...result, newRef: r.refresh_token };
  } catch (e) { return { ok: false, why: bad(e) }; }
}

// sesi per owner — file lokal (bukan db Rara biar gak nyampur)
const FILE = path.join(process.cwd(), "data", "ampro-sessions.json");
function loadSessions() { try { return JSON.parse(fs.readFileSync(FILE, "utf8") || "{}"); } catch { return {}; } }
function saveSession(email, data) {
  const all = loadSessions();
  all[email] = { ...data, savedAt: Date.now() };
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2));
}

// pending magic-link per sender — DI FILE (fix 29 Sep: dulu in-memory Map → hilang pas bot
// restart di antara .ampro dan reply → bot senyap total; sekarang tahan restart + gak pernah senyap)
const PKEY = "__pending";
function loadPending(sender) {
  const p = loadSessions()[PKEY];
  return p && p[sender] ? p[sender] : null;
}
function savePending(sender, data) {
  const all = loadSessions();
  all[PKEY] = { ...(all[PKEY] || {}), [sender]: { ...data, savedAt: Date.now() } };
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2));
}
function deletePending(sender) {
  const all = loadSessions();
  if (all[PKEY]) { delete all[PKEY][sender]; fs.writeFileSync(FILE, JSON.stringify(all, null, 2)); }
}

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🧠");
    const raw = (m.text || "").replace(new RegExp("^" + prefix + "am(pro|refresh)\\s*", "i"), "").trim();
    const isRefresh = /amrefresh/i.test(m.text || "");

    if (!raw) {
      await m.react("🐣");
      await m.reply(raraGuide(
        "ampro",
        "Aktifin AlightMotion premium gratis via magic link email (port engine lama).",
        prefix + "ampro nama@gmail.com",
        "Buka email → copy link dari AlightMotion → reply pesan magic-link bot dengan link itu. Re-aktif kapan pun: " + prefix + "amrefresh <email>"
      ));
      return { handled: true };
    }

    const email = raw.toLowerCase().replace(/^.*\s/, "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await m.react("❌");
      await m.reply(raraError("Ampro", "Format email gak valid"));
      return { handled: true };
    }

    if (isRefresh) {
      const sess = loadSessions()[email];
      if (!sess?.ref) {
        await m.react("❌");
        await m.reply(raraError("Amrefresh", "Gak ada sesi tersimpan untuk " + email + " — kirim link dulu: " + prefix + "ampro " + email));
        return { handled: true };
      }
      await m.react("🛠️");
      const r = await refreshAndActivate(sess.ref);
      if (!r.ok) {
        await m.react("❌");
        await m.reply(raraError("Amrefresh", "Gagal: " + String(r.why).slice(0, 150) + "\n\nCoba lagi: " + prefix + "ampro " + email));
        return { handled: true };
      }
      saveSession(email, { ...sess, ref: r.newRef || sess.ref });
      await m.react("⚡");
      await m.reply(raraWrap("AM Premium", ["Premium " + email + " ke-update!", "Order: " + r.orderId].join("\n")));
      return { handled: true };
    }

    // .ampro
    await m.react("🛠️");
    const r = await sendMagicLink(email);
    if (!r.ok) {
      await m.react("❌");
      await m.reply(raraError("Ampro", "Gagal kirim link: " + String(r.why).slice(0, 150)));
      return { handled: true };
    }
    savePending(m.sender, { email, at: Date.now(), chat: m.chat });
    await m.react("⚡");
    await m.reply(raraWrap("Ampro", [
      "Magic link ke " + email + " udah dikirim!",
      "",
      "Buka email kamu, copy link dari AlightMotion,",
      "terus *reply pesan ini* sambil tempel link-nya.",
    ].join("\n")));
  } catch (error) {
    console.error("[ampro]:", error.message);
    await m.react("❌");
    await m.reply(raraError("Ampro", "Gagal: " + String(error.message).slice(0, 120)));
  }
  return { handled: true };
}

// step 2: user reply pesan magic-link dengan link.
// FIX 29 Sep: pending dari FILE (tahan restart) + pesan yang jelas di TIAP kegagalan —
// dulu semua jalur return false SENYAP (restart bot / link gak kebaca / TTL lewat → "gak ada respon").
// Chat biasa (tanpa link/kode) tetap gak diganggu → false supaya handler lain jalan.
export async function answerHandler(m, { sock }) {
  const st = loadPending(m.sender);
  if (!st) return false;
  const rawLink = (m.text || "").trim();
  const code = extractCode(rawLink);
  const linkish = /https?:\/\/|oobCode|[a-zA-Z0-9_-]{20,}/i.test(rawLink);
  if (!code && !linkish) return false; // obrolan biasa — gak dipegang ampro
  if (Date.now() - st.at > TTL) {
    deletePending(m.sender);
    await m.react("\u274C");
    await m.reply(raraError("Ampro", "Sesi link kedaluwarsa (maks 10 menit). Kirim ulang: .ampro " + st.email));
    return true;
  }
  if (!code) {
    await m.react("\u274C");
    await m.reply(raraError("Ampro", "Link-nya gak bisa dibaca — kode oobCode gak ketemu.\n\nCopy link UTUH dari tombol di email AlightMotion (jangan cuma teksnya), terus reply lagi di sini."));
    return true;
  }
  deletePending(m.sender);
  try {
    await m.react("🛠️");
    const v = await verifyLink(st.email, rawLink);
    if (!v.ok) {
      await m.react("❌");
      await m.reply(raraError("Ampro", "Verifikasi gagal: " + String(v.why).slice(0, 150) + "\n\nKirim ulang: .ampro " + st.email));
      return true;
    }
    const p = await activatePremium(v.id);
    if (!p.ok) {
      saveSession(st.email, { id: v.id, ref: v.ref, uid: v.uid });
      await m.react("❌");
      await m.reply(raraError("Ampro", "Login OK tapi aktivasi gagal: " + String(p.why).slice(0, 150) + "\n\nCoba: .amrefresh " + st.email));
      return true;
    }
    saveSession(st.email, { id: v.id, ref: v.ref, uid: v.uid });
    await m.react("⚡");
    await m.reply(raraWrap("AM Premium Aktif!", [
      "Email: " + st.email,
      "Order: " + p.orderId,
      v.new ? "Akun baru dibuat" : "Akun lama di-update",
      "",
      "Re-aktif kapan pun: .amrefresh " + st.email,
    ].join("\n")));
  } catch (e) {
    console.error("[ampro]:", e.message);
    await m.react("❌");
    await m.reply(raraError("Ampro", "Gagal: " + String(e.message).slice(0, 120)));
  }
  return true;
}

export { pluginConfig as config, handler }
