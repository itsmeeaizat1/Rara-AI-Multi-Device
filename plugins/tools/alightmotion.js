// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from "../../config.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

/**
 * plugins/tools/alightmotion.js
 * Command .amprem — Alight Motion Premium creator
 *
 * Dual mode:
 * - "vercel" (default): Pakai Vercel proxy (gratis, no token, no IP whitelist)
 *   Send, Verify, Inbox jalan. Bulk butuh direct API.
 * - "direct": Pakai API langsung api.znn.my.id (butuh token + IP whitelist)
 *   Semua fitur termasuk Bulk jalan.
 *
 * Config: config.alightmotion
 */

const pluginConfig = {
  name: "amprem",
  alias: ["alightmotion", "alight", "am2"],
  category: "tools",
  description: "Alight Motion Premium creator",
  usage: ".amprem bulk <jumlah>\n.amprem send <email>\n.amprem verify <email>\n.amprem verify <email> <link>\n.ampremcreate\n.tempmail\n.tempmail read [email]",
  example: ".amprem send test@gmail.com",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ─── Config Helper ──────────────────────────────────────────────

function getAmConfig() {
  const am = config.alightmotion || {};
  return {
    mode: am.mode || "vercel",
    vercelBase: (am.vercelBase || "https://znn-alightmotion.vercel.app").replace(/\/+$/, ""),
    apiBase: (am.apiBase || "https://api.znn.my.id").replace(/\/+$/, ""),
    token: am.token || "",
    apiVersion: am.apiVersion || "v1",
    maxBulk: am.maxBulk || 100,
    bulkZipThreshold: am.bulkZipThreshold || 10,
  };
}

// ─── Vercel Proxy API (POST, no token needed) ────────────────────

async function vercelPost(path, body, timeoutMs = 60000) {
  const am = getAmConfig();
  const url = am.vercelBase + path;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  let data;
  try { data = await res.json(); } catch {
    throw new Error("Response server tidak dapat dibaca.");
  }

  if (!res.ok || (data && data.status === false)) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }
  return data;
}

// ─── Direct API (GET, needs token + IP whitelist) ────────────────

async function directGet(action, params = {}, timeoutMs = 90000) {
  const am = getAmConfig();
  if (!am.token) {
    throw new Error("AM_TOKEN belum diisi. Set di config.js: config.alightmotion.token");
  }

  const clean = String(action).replace(/^\/+|\/+$/g, "");
  let path = `/alightmotion/${clean}`;
  if (am.apiVersion === "v2" && clean !== "bulk") path += "-v2";

  const url = new URL(am.apiBase + path);
  for (const [key, value] of Object.entries(params)) {
    const text = String(value ?? "").trim();
    if (text) url.searchParams.set(key, text);
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    "User-Agent": "Nova-MD/21.0",
    Authorization: `Bearer ${am.token}`,
    "X-API-Token": am.token,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await res.text();
  let data = null;
  if (text.trim()) {
    try { data = JSON.parse(text); } catch {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      throw new Error("Response server tidak dapat dibaca");
    }
  }
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  if (data?.status === false) throw new Error(data?.message || "Request gagal");
  return data;
}

async function directTempNew(timeoutMs = 45000) {
  const am = getAmConfig();
  const url = new URL(am.apiBase + "/tempmail");
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json", "User-Agent": "Nova-MD/21.0" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let data = null;
  if (text.trim()) {
    try { data = JSON.parse(text); } catch { throw new Error("Response temp mail tidak valid"); }
  }
  if (data?.status === false) throw new Error(data?.message || "Gagal membuat temp mail");
  return data;
}

async function directTempRead(email, timeoutMs = 45000) {
  const am = getAmConfig();
  const url = new URL(am.apiBase + "/tempmail-read");
  url.searchParams.set("email", email);
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json", "User-Agent": "Nova-MD/21.0" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let data = null;
  if (text.trim()) {
    try { data = JSON.parse(text); } catch { throw new Error("Response inbox tidak valid"); }
  }
  if (data?.status === false) throw new Error(data?.message || "Gagal membaca inbox");
  return data;
}

// ─── Unified API Calls (auto-route based on mode) ───────────────

async function apiSend(email) {
  const am = getAmConfig();
  if (am.mode === "direct") {
    return directGet("send", { email });
  }
  // Vercel proxy
  return vercelPost("/api/send", { email });
}

async function apiVerify(email, link) {
  const am = getAmConfig();
  if (am.mode === "direct") {
    return directGet("verify", { email, link });
  }
  // Vercel proxy
  return vercelPost("/api/verify", { email, link });
}

async function apiBulk(amount) {
  const am = getAmConfig();
  if (am.mode === "direct") {
    return directGet("bulk", { amount });
  }
  // Vercel: try proxy first, but bulk is likely denied
  try {
    return await vercelPost("/api/bulk", { amount });
  } catch (error) {
    if (error.message?.includes("BULK_ACCESS_DENIED") || error.message?.includes("Bulk")) {
      throw new Error(
        "Bulk tidak tersedia di mode Vercel.\n" +
        "Untuk pakai bulk, set config.alightmotion.mode = \"direct\" " +
        "dan isi token + whitelist IP ke admin x-znn (wa.me/6285348284121)."
      );
    }
    throw error;
  }
}

async function apiInbox(email) {
  const am = getAmConfig();
  if (am.mode === "direct") {
    return directTempRead(email);
  }
  // Vercel proxy (returns normalized latest message)
  return vercelPost("/api/inbox", { email });
}

async function apiTempNew() {
  const am = getAmConfig();
  if (am.mode === "direct") {
    return directTempNew();
  }
  // Vercel doesn't have tempmail create endpoint
  // Try direct API without token (tempmail might not need auth)
  try {
    return await directTempNew();
  } catch {
    throw new Error(
      "Temp mail create butuh direct API.\n" +
      "Set config.alightmotion.mode = \"direct\" untuk menggunakan fitur ini."
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────

const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

function validEmail(value) {
  const email = String(value).trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return false;
  const local = email.split("@")[0] || "";
  return Boolean(local) && !local.startsWith(".") && !local.endsWith(".") && !local.includes("..");
}

function validAlightURL(value) {
  try {
    const u = new URL(String(value).trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const low = String(value).toLowerCase();
    return low.includes("alight-creative") || low.includes("firebaseapp.com");
  } catch { return false; }
}

function htmlDecode(value) {
  return String(value)
    .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'").replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#x2F;/gi, "/").replace(/&#47;/gi, "/")
    .replace(/&#64;/gi, "@").replace(/&nbsp;/gi, " ");
}

function extractEmails(value) {
  const out = [];
  const seen = new Set();
  const RE = /[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+/g;

  function pushEmail(raw) {
    const c = String(raw).trim().replace(/^[()[\]{}<>.,;:'"]+|[()[\]{}<>.,;:'"]+$/g, "");
    if (!validEmail(c)) return;
    const low = c.toLowerCase();
    if (low.includes("alight-creative.firebaseapp.com") || low.startsWith("noreply@") || low.startsWith("reply@")) return;
    if (!seen.has(low)) { seen.add(low); out.push(c); }
  }

  function walk(node, d = 0) {
    if (node == null || d > 14) return;
    if (typeof node === "string") {
      const matches = htmlDecode(node).match(RE) || [];
      for (const m of matches) pushEmail(m);
      return;
    }
    if (Array.isArray(node)) { for (const item of node) walk(item, d + 1); return; }
    if (typeof node === "object") {
      const priority = ["email", "address", "mail", "emails", "accounts", "account", "result", "data", "results", "items"];
      for (const key of priority) {
        const fk = Object.keys(node).find(k => k.toLowerCase() === key.toLowerCase());
        if (fk !== undefined) walk(node[fk], d + 1);
      }
      for (const [k, v] of Object.entries(node)) {
        if (!priority.some(p => p.toLowerCase() === k.toLowerCase())) walk(v, d + 1);
      }
    }
  }

  walk(value);
  return out;
}

function firstBulkEmail(data) { return extractEmails(data)[0] || ""; }

function findPath(obj, path) {
  let cur = obj;
  for (const part of String(path).split(".")) {
    if (cur == null) return undefined;
    const key = Object.keys(cur).find(k => k.toLowerCase() === part.toLowerCase());
    cur = key !== undefined ? cur[key] : undefined;
  }
  return cur;
}

function firstString(value, ...paths) {
  for (const path of paths) {
    const found = findPath(value, path);
    if (found != null) {
      const out = String(found).trim();
      if (out) return out;
    }
  }
  return "";
}

function prettyPayload(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.map(prettyPayload).filter(Boolean).join("\n\n");
  if (typeof data === "object") {
    if (data.status === true) {
      const msg = firstString(data, "message", "msg", "result.message", "data.message");
      if (msg) return msg;
    }
    if (data.data) return prettyPayload(data.data);
    if (data.result) return prettyPayload(data.result);
    const msg = firstString(data, "message", "msg");
    if (msg) return msg;
    return JSON.stringify(data, null, 2);
  }
  return String(data);
}

function latestAlightURL(data, baseline = new Set()) {
  const RE = /https?:\/\/[^\s"'<>]+/gi;
  function walk(node, d = 0) {
    const urls = [];
    if (node == null || d > 14) return urls;
    if (typeof node === "string") {
      const matches = htmlDecode(node).match(RE) || [];
      for (const m of matches) urls.push(m);
      return urls;
    }
    if (Array.isArray(node)) { for (const item of node) urls.push(...walk(item, d + 1)); return urls; }
    if (typeof node === "object") { for (const v of Object.values(node)) urls.push(...walk(v, d + 1)); }
    return urls;
  }
  for (const url of walk(data)) {
    if (validAlightURL(url) && !baseline.has(url)) return url;
  }
  return "";
}

function getMailBaseline(data) {
  const baseline = new Set();
  if (!data) return baseline;
  const RE = /https?:\/\/[^\s"'<>]+/gi;
  function walk(node, d = 0) {
    if (node == null || d > 14) return;
    if (typeof node === "string") {
      const matches = htmlDecode(node).match(RE) || [];
      for (const m of matches) if (validAlightURL(m)) baseline.add(m);
      return;
    }
    if (Array.isArray(node)) { for (const item of node) walk(item, d + 1); return; }
    if (typeof node === "object") { for (const v of Object.values(node)) walk(v, d + 1); }
  }
  walk(data);
  return baseline;
}

// ─── Session Storage ────────────────────────────────────────────

const verifySessions = new Map();
const createSessions = new Map();

function sessionKey(m) {
  return m.sender || m.key?.remoteJid || "unknown";
}

// ─── Command Handlers ───────────────────────────────────────────

async function pluginMain(m, ctx) {
  const text = m.text || "";
  const args = m.args || text.trim().split(/\s+/).slice(1);
  const command = (m.command || text.trim().split(/\s+/)[0] || "").toLowerCase();

  if (["ampremcreate", "amcreate"].includes(command)) {
    return handleAmpremCreate(m, ctx);
  }
  if (["tempmail", "temp"].includes(command)) {
    return handleTempMail(m, ctx, args);
  }
  if (["amprem", "am", "alightmotion", "alightprem"].includes(command)) {
    return handleAmprem(m, ctx, args);
  }
}

async function handleAmprem(m, ctx) {
  const args = m.args || [];
  if (!args.length) {
    const help = `.amprem bulk <jumlah> — Create bulk AM premium\n.amprem send <email> — Kirim verifikasi ke email\n.amprem verify <email> — Auto verify (poll link)\n.amprem verify <email> <link> — Verify manual\n.ampremcreate — Full auto flow`;
    return sendReplyWithNav(m, ctx?.sock, claraWrap("ALIGHT MOTION PREMIUM", help));
  }

  const action = String(args[0]).toLowerCase();

  if (action === "bulk") {
    if (args.length < 2) return m.reply(claraWrap("AMPREM BULK", "Masukkan jumlah.\nContoh: .amprem bulk 5"));
    if (!/^\d+$/.test(String(args[1]))) return m.reply(claraWrap("AMPREM BULK", "Jumlah harus angka.\nContoh: .amprem bulk 5"));
    const amount = Number(args[1]);
    const am = getAmConfig();
    if (amount < 1 || amount > am.maxBulk) return m.reply(claraWrap("AMPREM BULK", `Jumlah harus 1-${am.maxBulk}.\nContoh: .amprem bulk 5`));
    return runBulk(m, ctx, amount);
  }

  if (action === "send") {
    if (args.length < 2) return m.reply(claraWrap("AMPREM SEND", "Masukkan email.\nContoh: .amprem send email@gmail.com"));
    const email = String(args[1]).trim().toLowerCase();
    if (!validEmail(email)) return m.reply(claraWrap("AMPREM SEND", "Email tidak valid.\nContoh: .amprem send email@gmail.com"));
    return runSend(m, ctx, email);
  }

  if (action === "verify") {
    if (args.length < 2) return m.reply(claraWrap("AMPREM VERIFY", "Masukkan email.\nContoh: .amprem verify email@gmail.com"));
    const email = String(args[1]).trim().toLowerCase();
    if (!validEmail(email)) return m.reply(claraWrap("AMPREM VERIFY", "Email tidak valid.\nContoh: .amprem verify email@gmail.com"));
    if (args.length >= 3) {
      const link = args.slice(2).join(" ").trim();
      if (!validAlightURL(link)) return m.reply(claraWrap("AMPREM VERIFY", "Link verifikasi tidak valid. Gunakan full link Alight Creative dari email."));
      return runVerify(m, ctx, email, link, false);
    }
    return startVerifySession(m, ctx, email);
  }

  return m.reply(claraWrap("AMPREM", `Fitur tidak dikenal.\n\n.amprem bulk 5\n.amprem send email@gmail.com\n.amprem verify email@gmail.com`));
}

async function runBulk(m, ctx, amount) {
  try {
    await m.react("🕐");
    const result = await apiBulk(amount);
    await m.react("✅");
    const text = prettyPayload(result);
    if (!text) return m.reply(claraWrap("AMPREM BULK", "Hasil bulk tidak dapat dibaca."));
    const safe = text.length > 50000 ? `${text.slice(0, 50000)}\n\n...hasil dipotong.` : text;
    return m.reply(claraWrap("AMPREM BULK", `Jumlah: ${amount}\n\n${safe}`));
  } catch (error) {
    await m.react("✅");
    return m.reply(claraWrap("AMPREM BULK ERROR", error.message || "Gagal memproses bulk."));
  }
}

async function runSend(m, ctx, email) {
  try {
    await m.react("🕐");
    await apiSend(email);
    await m.react("✅");
    return m.reply(claraWrap("AMPREM SEND", `Email verifikasi berhasil dikirim ke ${email}`));
  } catch (error) {
    await m.react("✅");
    return m.reply(claraWrap("AMPREM SEND ERROR", error.message || "Gagal mengirim email."));
  }
}

async function startVerifySession(m, ctx, email) {
  try {
    await m.react("🕐");
    await apiSend(email);
    const key = sessionKey(m);
    verifySessions.set(key, { email, expiresAt: Date.now() + 10 * 60 * 1000 });
    await m.react("✅");
    return m.reply(claraWrap("AMPREM VERIFY", `Email verifikasi sudah dikirim ke ${email}\n\n1. Cek folder Spam\n2. Buka email dari noreply, tekan "Laporkan bukan spam"\n3. Buka emailnya lagi dari menu Utama\n4. Tekan lama "Login ke Alight Creative", lalu salin full link\n5. Kirim/reply full link tadi ke bot\n\nLink berlaku sekitar 3-5 menit\nWaktu sesi bot: 10 menit`));
  } catch (error) {
    await m.react("✅");
    return m.reply(claraWrap("AMPREM VERIFY ERROR", error.message || "Gagal memulai sesi verifikasi."));
  }
}

async function runVerify(m, ctx, email, link, fromSession) {
  try {
    await m.react("🕐");
    const result = await apiVerify(email, link);
    if (fromSession) verifySessions.delete(sessionKey(m));
    await m.react("✅");
    const text = prettyPayload(result) || "Verifikasi berhasil.";
    return m.reply(claraWrap("AMPREM VERIFY", text));
  } catch (error) {
    await m.react("✅");
    return m.reply(claraWrap("AMPREM VERIFY ERROR", error.message || "Gagal verifikasi."));
  }
}

async function handleAmpremCreate(m, ctx) {
  const args = m.args || [];
  if (args.length) return m.reply(claraWrap("AMPREMCREATE", "Gunakan .ampremcreate tanpa input."));

  const key = sessionKey(m);
  const current = createSessions.get(key);
  if (current && Date.now() < current.expiresAt) {
    return m.reply(claraWrap("AMPREMCREATE", "Sesi ampremcreate masih berjalan. Selesaikan login atau tunggu sesi berakhir."));
  }
  createSessions.delete(key);

  try {
    await m.react("🕐");
    const bulk = await apiBulk(1);
    const email = firstBulkEmail(bulk);
    if (!validEmail(email)) {
      await m.react("✅");
      return m.reply(claraWrap("AMPREMCREATE", "Email ampremcreate tidak ditemukan dari hasil bulk."));
    }

    let baseline = new Set();
    try {
      const inbox = await apiInbox(email);
      baseline = getMailBaseline(inbox);
    } catch {}

    const session = {
      email,
      startedAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000,
      baseline,
      cancelled: false,
    };
    createSessions.set(key, session);

    await m.react("✅");
    await m.reply(claraWrap("AMPREMCREATE", `Email login: ${email}\n\nLogin ke Alight Motion dengan email ini. Bot akan mengecek email login otomatis selama 5 menit.`));

    pollAmpremCreate(key, session, m, ctx).catch(() => {});
  } catch (error) {
    await m.react("✅");
    return m.reply(claraWrap("AMPREMCREATE ERROR", error.message || "Gagal memulai ampremcreate."));
  }
}

async function pollAmpremCreate(key, session, m, ctx) {
  try {
    while (!session.cancelled && Date.now() < session.expiresAt) {
      await new Promise(r => setTimeout(r, 4000));
      let inbox;
      try { inbox = await apiInbox(session.email); } catch { continue; }
      const link = latestAlightURL(inbox, session.baseline);
      if (link) {
        await m.reply(claraWrap("AMPREMCREATE LINK", `Link login ditemukan:\n${link}`));
        return;
      }
    }
    if (!session.cancelled) {
      await m.reply(claraWrap("AMPREMCREATE", "Sesi ampremcreate berakhir. Jalankan .ampremcreate lagi."));
    }
  } finally {
    if (createSessions.get(key) === session) createSessions.delete(key);
  }
}

async function handleTempMail(m, ctx, args) {
  const first = String(args[0] || "").toLowerCase();

  if (!args.length || ["new", "create", "buat"].includes(first)) {
    return createTemp(m, ctx);
  }

  if (["read", "cek", "inbox"].includes(first)) {
    const email = String(args[1] || "").trim();
    if (!email) return m.reply(claraWrap("TEMP MAIL", "Masukkan email.\nContoh: .tempmail read email@domain.com"));
    if (!validEmail(email)) return m.reply(claraWrap("TEMP MAIL", "Email tidak valid."));
    return readTemp(m, ctx, email);
  }

  if (validEmail(args[0])) return readTemp(m, ctx, args[0]);

  return m.reply(claraWrap("TEMP MAIL", "Gunakan:\n.tempmail — Buat email baru\n.tempmail read [email] — Cek inbox"));
}

async function createTemp(m, ctx) {
  try {
    await m.react("🕐");
    const result = await apiTempNew();
    let email = firstString(result, "data.email", "email", "result.email");
    if (!validEmail(email)) email = firstBulkEmail(result);
    if (!validEmail(email)) {
      await m.react("✅");
      return m.reply(claraWrap("TEMP MAIL", "Email temp tidak ditemukan dari respons server."));
    }
    await m.react("✅");
    return m.reply(claraWrap("TEMP MAIL", `Email aktif:\n${email}\n\nCek inbox:\n.tempmail read ${email}`));
  } catch (error) {
    await m.react("✅");
    return m.reply(claraWrap("TEMP MAIL ERROR", error.message || "Gagal membuat temp mail."));
  }
}

async function readTemp(m, ctx, email) {
  try {
    await m.react("🕐");
    const result = await apiInbox(email);
    await m.react("✅");
    const text = prettyPayload(result);
    if (!text) return m.reply(claraWrap("TEMP MAIL", `Email: ${email}\nInbox masih kosong.`));
    const safe = text.length > 50000 ? `${text.slice(0, 50000)}\n\n...pesan dipotong.` : text;
    return m.reply(claraWrap("TEMP MAIL INBOX", `Email: ${email}\n\n${safe}`));
  } catch (error) {
    await m.react("✅");
    return m.reply(claraWrap("TEMP MAIL ERROR", error.message || "Gagal membaca inbox."));
  }
}

// ─── Export ─────────────────────────────────────────────────────

export default {
  config: pluginConfig,
  handler: async (m, ctx) => {
    // Handle reply with alight URL for verify session
    const text = (m.text || "").trim();
    const key = sessionKey(m);
    const session = verifySessions.get(key);

    if (session && !text.startsWith(".") && /^https?:\/\//i.test(text)) {
      if (Date.now() >= session.expiresAt) {
        verifySessions.delete(key);
      } else if (validAlightURL(text)) {
        await runVerify(m, ctx, session.email, text.trim(), true);
        return;
      } else {
        await m.reply(claraWrap("AMPREM VERIFY", "Link bukan link login Alight Creative. Kirim full link dari email."));
        return;
      }
    }

    await pluginMain(m, ctx);
  },
};
