import axios from "axios";
import config from "../../config.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

/**
 * plugins/tools/alightmotion.js
 * Command .amprem — Alight Motion Premium creator via api.znn.my.id
 * Fitur: bulk create, send email, verify, auto create, temp mail
 * Butuh: config.alightmotion.token (AM_TOKEN dari x-znn)
 *        IP server di-whitelist oleh admin x-znn
 */

const pluginConfig = {
  name: "amprem",
  alias: ["alightmotion", "am", "alightprem"],
  category: "tools",
  description: "Alight Motion Premium creator (via api.znn.my.id)",
  usage: ".amprem bulk <jumlah>\n.amprem send <email>\n.amprem verify <email>\n.amprem verify <email> <link>\n.ampremcreate\n.tempmail\n.tempmail read [email]",
  example: ".amprem bulk 5",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ─── AM API Client ───────────────────────────────────────────────

function getAmConfig() {
  const am = config.alightmotion || {};
  return {
    base: (am.apiBase || "https://api.znn.my.id").replace(/\/+$/, ""),
    token: am.token || "",
    version: am.apiVersion || "v1",
    maxBulk: am.maxBulk || 100,
    bulkZipThreshold: am.bulkZipThreshold || 10,
  };
}

function getHeaders(token) {
  return {
    Accept: "application/json",
    "User-Agent": "Nova-MD/21.0",
    Authorization: `Bearer ${token}`,
    "X-API-Token": token,
  };
}

async function amGet(action, params = {}, timeoutMs = 90000) {
  const am = getAmConfig();
  if (!am.token) {
    throw new Error("AM_TOKEN belum diisi. Set di config.js: config.alightmotion.token");
  }

  const clean = String(action).replace(/^\/+|\/+$/g, "");
  let path = `/alightmotion/${clean}`;
  if (am.version === "v2" && clean !== "bulk") path += "-v2";

  const url = new URL(am.base + path);
  for (const [key, value] of Object.entries(params)) {
    const text = String(value ?? "").trim();
    if (text) url.searchParams.set(key, text);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: getHeaders(am.token),
      signal: controller.signal,
    });
    const text = await res.text();
    let data = null;
    if (text.trim()) {
      try {
        data = JSON.parse(text);
      } catch {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Gagal memproses request`);
        throw new Error("Response server tidak dapat dibaca");
      }
    }
    if (!res.ok) {
      const msg = data?.message || data?.error || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    if (data && typeof data === "object" && data.status === false) {
      throw new Error(data.message || "Request gagal diproses");
    }
    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Request timeout. Coba lagi.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Temp Mail API ──────────────────────────────────────────────

async function tempNew(timeoutMs = 45000) {
  const am = getAmConfig();
  const url = new URL(am.base + "/tempmail");
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json", "User-Agent": "Nova-MD/21.0" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let data = null;
  if (text.trim()) {
    try { data = JSON.parse(text); } catch {
      throw new Error("Response temp mail tidak valid");
    }
  }
  if (data?.status === false) throw new Error(data?.message || "Gagal membuat temp mail");
  return data;
}

async function tempRead(email, timeoutMs = 45000) {
  const am = getAmConfig();
  const url = new URL(am.base + "/tempmail-read");
  url.searchParams.set("email", email);
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json", "User-Agent": "Nova-MD/21.0" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let data = null;
  if (text.trim()) {
    try { data = JSON.parse(text); } catch {
      throw new Error("Response inbox tidak valid");
    }
  }
  if (data?.status === false) throw new Error(data?.message || "Gagal membaca inbox");
  return data;
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
  } catch {
    return false;
  }
}

function htmlDecode(value) {
  return String(value)
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#47;/gi, "/")
    .replace(/&#64;/gi, "@")
    .replace(/&nbsp;/gi, " ");
}

function extractEmails(value, depth = 0) {
  const out = [];
  const seen = new Set();
  const EMBEDDED_RE = /[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+/g;

  function pushEmail(raw) {
    const candidate = String(raw).trim().replace(/^[()[\]{}<>.,;:'"]+|[()[\]{}<>.,;:'"]+$/g, "");
    if (!validEmail(candidate)) return;
    const low = candidate.toLowerCase();
    if (low.includes("alight-creative.firebaseapp.com") || low.startsWith("noreply@") || low.startsWith("reply@")) return;
    if (!seen.has(low)) { seen.add(low); out.push(candidate); }
  }

  function walk(node, d = 0) {
    if (node === null || node === undefined || d > 14) return;
    if (typeof node === "string") {
      const matches = htmlDecode(node).match(EMBEDDED_RE) || [];
      for (const m of matches) pushEmail(m);
      return;
    }
    if (Array.isArray(node)) { for (const item of node) walk(item, d + 1); return; }
    if (typeof node === "object") {
      const priority = ["email", "address", "mail", "email_address", "emailAddress", "emails", "accounts", "account", "result", "data", "results", "items"];
      for (const key of priority) {
        const foundKey = Object.keys(node).find(k => k.toLowerCase() === key.toLowerCase());
        if (foundKey !== undefined) walk(node[foundKey], d + 1);
      }
      for (const [k, v] of Object.entries(node)) {
        if (!priority.includes(k.toLowerCase())) walk(v, d + 1);
      }
    }
  }

  walk(value);
  return out;
}

function firstBulkEmail(data) {
  const emails = extractEmails(data);
  return emails[0] || "";
}

function findPath(obj, path) {
  let cur = obj;
  for (const part of String(path).split(".")) {
    if (cur === null || cur === undefined) return undefined;
    const key = Object.keys(cur).find(k => k.toLowerCase() === part.toLowerCase());
    cur = key !== undefined ? cur[key] : undefined;
  }
  return cur;
}

function firstString(value, ...paths) {
  for (const path of paths) {
    const found = findPath(value, path);
    if (found !== undefined && found !== null) {
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
    const status = data.status;
    if (status === true) {
      const msg = firstString(data, "message", "msg", "result.message", "data.message");
      if (msg) return msg;
    }
    const dataField = data.data;
    if (dataField) return prettyPayload(dataField);
    const resultField = data.result;
    if (resultField) return prettyPayload(resultField);
    const msg = firstString(data, "message", "msg");
    if (msg) return msg;
    return JSON.stringify(data, null, 2);
  }
  return String(data);
}

function latestAlightURL(data, baseline = new Set(), sinceTs = 0) {
  const URL_RE = /https?:\/\/[^\s"'<>]+/gi;
  function walk(node, d = 0) {
    const urls = [];
    if (node === null || node === undefined || d > 14) return urls;
    if (typeof node === "string") {
      const matches = htmlDecode(node).match(URL_RE) || [];
      for (const m of matches) urls.push(m);
      return urls;
    }
    if (Array.isArray(node)) {
      for (const item of node) urls.push(...walk(item, d + 1));
      return urls;
    }
    if (typeof node === "object") {
      for (const v of Object.values(node)) urls.push(...walk(v, d + 1));
    }
    return urls;
  }

  const allUrls = walk(data);
  for (const url of allUrls) {
    if (validAlightURL(url) && !baseline.has(url)) return url;
  }
  return "";
}

function getMailBaseline(data) {
  const baseline = new Set();
  if (!data) return baseline;
  const URL_RE = /https?:\/\/[^\s"'<>]+/gi;
  function walk(node, d = 0) {
    if (node === null || node === undefined || d > 14) return;
    if (typeof node === "string") {
      const matches = htmlDecode(node).match(URL_RE) || [];
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

// ─── Main Handler ───────────────────────────────────────────────

async function pluginMain(m, { sock, conn, config: cfg }) {
  const text = m.text || "";
  const args = m.args || text.trim().split(/\s+/).slice(1);
  const command = (m.command || text.trim().split(/\s+/)[0] || "").toLowerCase();

  // .ampremcreate
  if (["ampremcreate", "amcreate"].includes(command)) {
    return handleAmpremCreate(m, sock);
  }

  // .tempmail
  if (["tempmail", "temp"].includes(command)) {
    return handleTempMail(m, sock, args);
  }

  // .amprem <subcommand>
  if (["amprem", "am", "alightmotion", "alightprem"].includes(command)) {
    return handleAmprem(m, sock, args);
  }
}

async function handleAmprem(m, sock) {
  const args = m.args || [];
  if (!args.length) {
    const help = `.amprem bulk <jumlah> — Create bulk AM premium\n.amprem send <email> — Kirim verifikasi ke email\n.amprem verify <email> — Auto verify via polling\n.amprem verify <email> <link> — Verify manual dengan link`;
    return sendReplyWithNav(m, sock, claraWrap("ALIGHT MOTION PREMIUM", help));
  }

  const action = String(args[0]).toLowerCase();

  if (action === "bulk") {
    if (args.length < 2) return m.reply(claraWrap("AMPREM BULK", "Masukkan jumlah.\nContoh: .amprem bulk 5"));
    if (!/^\d+$/.test(String(args[1]))) return m.reply(claraWrap("AMPREM BULK", "Jumlah harus angka.\nContoh: .amprem bulk 5"));

    const amount = Number(args[1]);
    const am = getAmConfig();
    if (amount < 1 || amount > am.maxBulk) {
      return m.reply(claraWrap("AMPREM BULK", `Jumlah harus 1 sampai ${am.maxBulk}.\nContoh: .amprem bulk 5`));
    }
    return runBulk(m, sock, amount);
  }

  if (action === "send") {
    if (args.length < 2) return m.reply(claraWrap("AMPREM SEND", "Masukkan email.\nContoh: .amprem send email@gmail.com"));
    const email = String(args[1]).trim().toLowerCase();
    if (!validEmail(email)) return m.reply(claraWrap("AMPREM SEND", "Email tidak valid.\nContoh: .amprem send email@gmail.com"));
    return runSend(m, sock, email);
  }

  if (action === "verify") {
    if (args.length < 2) return m.reply(claraWrap("AMPREM VERIFY", "Masukkan email.\nContoh: .amprem verify email@gmail.com"));
    const email = String(args[1]).trim().toLowerCase();
    if (!validEmail(email)) return m.reply(claraWrap("AMPREM VERIFY", "Email tidak valid.\nContoh: .amprem verify email@gmail.com"));

    if (args.length >= 3) {
      const link = args.slice(2).join(" ").trim();
      if (!validAlightURL(link)) return m.reply(claraWrap("AMPREM VERIFY", "Link verifikasi tidak valid. Gunakan full link Alight Creative dari email."));
      return runVerify(m, sock, email, link, false);
    }
    return startVerifySession(m, sock, email);
  }

  return m.reply(claraWrap("AMPREM", `Fitur tidak dikenal.\n\n.amprem bulk 5\n.amprem send email@gmail.com\n.amprem verify email@gmail.com`));
}

async function runBulk(m, sock, amount) {
  try {
    await m.react("🕐");
    const result = await amGet("bulk", { amount }, 90000);
    const text = prettyPayload(result);
    if (!text) return m.reply(claraWrap("AMPREM BULK", "Hasil bulk tidak dapat dibaca."));

    await m.react("✅");

    const safeText = text.length > 50000 ? `${text.slice(0, 50000)}\n\n...hasil dipotong.` : text;
    return m.reply(claraWrap("AMPREM BULK", `Jumlah: ${amount}\n\n${safeText}`));
  } catch (error) {
    await m.react("✅");
    return m.reply(claraWrap("AMPREM BULK ERROR", error.message || "Gagal memproses bulk request."));
  }
}

async function runSend(m, sock, email) {
  try {
    await m.react("🕐");
    await amGet("send", { email }, 60000);
    await m.react("✅");
    return m.reply(claraWrap("AMPREM SEND", `Email verifikasi berhasil dikirim ke ${email}`));
  } catch (error) {
    await m.react("✅");
    return m.reply(claraWrap("AMPREM SEND ERROR", error.message || "Gagal mengirim email."));
  }
}

async function startVerifySession(m, sock, email) {
  try {
    await m.react("🕐");
    await amGet("send", { email }, 60000);

    const key = sessionKey(m);
    verifySessions.set(key, { email, expiresAt: Date.now() + 10 * 60 * 1000 });

    await m.react("✅");
    return m.reply(claraWrap("AMPREM VERIFY", `Email verifikasi sudah dikirim ke ${email}\n\n1. Cek folder Spam\n2. Buka email dari noreply, tekan "Laporkan bukan spam"\n3. Buka emailnya lagi dari menu Utama\n4. Tekan lama "Login ke Alight Creative", lalu salin full link\n5. Kirim/reply full link tadi ke bot\n\nLink berlaku sekitar 3-5 menit\nWaktu sesi bot: 10 menit`));
  } catch (error) {
    await m.react("✅");
    return m.reply(claraWrap("AMPREM VERIFY ERROR", error.message || "Gagal memulai sesi verifikasi."));
  }
}

async function runVerify(m, sock, email, link, fromSession) {
  try {
    await m.react("🕐");
    const result = await amGet("verify", { email, link }, 60000);
    if (fromSession) verifySessions.delete(sessionKey(m));
    await m.react("✅");
    const text = prettyPayload(result) || "Verifikasi berhasil.";
    return m.reply(claraWrap("AMPREM VERIFY", text));
  } catch (error) {
    await m.react("✅");
    return m.reply(claraWrap("AMPREM VERIFY ERROR", error.message || "Gagal verifikasi."));
  }
}

async function handleAmpremCreate(m, sock) {
  const args = m.args || [];
  if (args.length) return m.reply(claraWrap("AMPREMCREATE", `Gunakan .ampremcreate tanpa input.`));

  const key = sessionKey(m);
  const current = createSessions.get(key);
  if (current && Date.now() < current.expiresAt) {
    return m.reply(claraWrap("AMPREMCREATE", "Sesi ampremcreate masih berjalan. Selesaikan login atau tunggu sesi berakhir."));
  }
  createSessions.delete(key);

  try {
    await m.react("🕐");
    const bulk = await amGet("bulk", { amount: 1 }, 60000);
    const email = firstBulkEmail(bulk);
    if (!validEmail(email)) {
      await m.react("✅");
      return m.reply(claraWrap("AMPREMCREATE", "Email ampremcreate tidak ditemukan dari hasil bulk."));
    }

    let baseline = new Set();
    try {
      const inbox = await tempRead(email, 12000);
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

    // Poll for login link
    pollAmpremCreate(key, session, m, sock).catch(() => {});
  } catch (error) {
    await m.react("✅");
    return m.reply(claraWrap("AMPREMCREATE ERROR", error.message || "Gagal memulai ampremcreate."));
  }
}

async function pollAmpremCreate(key, session, m, sock) {
  try {
    while (!session.cancelled && Date.now() < session.expiresAt) {
      await new Promise(resolve => setTimeout(resolve, 4000));

      let inbox;
      try {
        inbox = await tempRead(session.email, 12000);
      } catch { continue; }

      const link = latestAlightURL(inbox, session.baseline, session.startedAt);
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

async function handleTempMail(m, sock, args) {
  const first = String(args[0] || "").toLowerCase();

  if (!args.length || ["new", "create", "buat"].includes(first)) {
    return createTemp(m, sock);
  }

  if (["read", "cek", "inbox"].includes(first)) {
    const email = String(args[1] || "").trim();
    if (!email) return m.reply(claraWrap("TEMP MAIL", "Masukkan email.\nContoh: .tempmail read email@domain.com"));
    if (!validEmail(email)) return m.reply(claraWrap("TEMP MAIL", "Email tidak valid."));
    return readTemp(m, sock, email);
  }

  if (validEmail(args[0])) {
    return readTemp(m, sock, args[0]);
  }

  return m.reply(claraWrap("TEMP MAIL", "Gunakan:\n.tempmail — Buat email baru\n.tempmail read [email] — Cek inbox"));
}

async function createTemp(m, sock) {
  try {
    await m.react("🕐");
    const result = await tempNew();
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

async function readTemp(m, sock, email) {
  try {
    await m.react("🕐");
    const result = await tempRead(email);
    const text = prettyPayload(result);
    await m.react("✅");
    if (!text) return m.reply(claraWrap("TEMP MAIL", `Email: ${email}\nInbox masih kosong.`));
    const safeText = text.length > 50000 ? `${text.slice(0, 50000)}\n\n...pesan dipotong.` : text;
    return m.reply(claraWrap("TEMP MAIL INBOX", `Email: ${email}\n\n${safeText}`));
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

    if (session && !m.text?.startsWith(".") && /^https?:\/\//i.test(text)) {
      if (Date.now() >= session.expiresAt) {
        verifySessions.delete(key);
      } else if (validAlightURL(text)) {
        await runVerify(m, ctx.sock, session.email, text.trim(), true);
        return;
      } else {
        await m.reply(claraWrap("AMPREM VERIFY", "Link bukan link login Alight Creative. Kirim full link dari email."));
        return;
      }
    }

    await pluginMain(m, ctx);
  },
};
