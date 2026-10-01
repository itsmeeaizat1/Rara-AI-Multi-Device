// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import nodemailer from "nodemailer";
import config from "../../config.js";
import { getDatabase } from "./rara-database.js";

// In-memory store for OTP sessions. Keyed by sender JID (e.g. '628xxx@s.whatsapp.net')
if (!global.emailOtpSessions) global.emailOtpSessions = {};
// In-memory rate limit map for OTP sends
if (!global.emailOtpRateMap) global.emailOtpRateMap = {};

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RATE_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_RATE_MAX_PER_WINDOW = 1; // 1 OTP per window by default

function normalizeSender(sender) {
  if (!sender) return "";
  return String(sender).trim();
}

export function isEmailOtpEnabled() {
  return Boolean(config.emailOtp && config.emailOtp.enabled === true);
}

function createTransporter() {
  const cfg = config.emailOtp || {};
  // minimal validation
  const user = cfg.user || "";
  const pass = cfg.pass || "";
  const host = cfg.host || "smtp.gmail.com";
  const port = cfg.port || 587;
  const secure = !!cfg.secure;

  if (!user || !pass) {
    throw new Error("emailOtp: SMTP credentials not configured (config.emailOtp.user/pass)");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
}

async function persistState() {
  try {
    const db = getDatabase();
    if (!db) return;
    const payload = {
      sessions: global.emailOtpSessions || {},
      rateMap: global.emailOtpRateMap || {},
      updatedAt: Date.now(),
    };
    db.setting("emailOtpPersistence", payload);
    if (typeof db.save === "function") await db.save();
  } catch (e) {
    // ignore persistence errors
  }
}

function loadPersistedState() {
  try {
    const db = getDatabase();
    if (!db) return;
    const persisted = db.setting("emailOtpPersistence") || {};
    if (persisted.sessions && typeof persisted.sessions === "object") {
      global.emailOtpSessions = persisted.sessions;
    }
    if (persisted.rateMap && typeof persisted.rateMap === "object") {
      global.emailOtpRateMap = persisted.rateMap;
    }
  } catch (e) {
    // ignore
  }
}

// load persisted state at module init
loadPersistedState();

function checkRateLimit(key) {
  const cfg = config.emailOtp || {};
  const windowMs = Number(cfg.rateWindowMs ?? DEFAULT_RATE_WINDOW_MS);
  const maxPerWindow = Number(cfg.rateMaxPerWindow ?? DEFAULT_RATE_MAX_PER_WINDOW);
  const now = Date.now();

  if (!global.emailOtpRateMap[key]) {
    global.emailOtpRateMap[key] = { windowStart: now, count: 0 };
  }

  const entry = global.emailOtpRateMap[key];

  if (now - entry.windowStart > windowMs) {
    // reset window
    entry.windowStart = now;
    entry.count = 0;
  }

  if (entry.count >= maxPerWindow) {
    const retryAfterMs = windowMs - (now - entry.windowStart);
    throw new Error(
      `Rate limit exceeded. Try again in ${(Math.ceil(retryAfterMs / 1000))} seconds.`,
    );
  }

  // allowed, increment
  entry.count += 1;
  entry.lastSentAt = now;

  // persist asynchronously
  persistState().catch(() => {});
}

export async function sendOtp(sender, email) {
  if (!isEmailOtpEnabled()) throw new Error("Email OTP disabled in config");
  if (!email) throw new Error("Missing target email");

  const key = normalizeSender(sender);

  // rate-limit check (per-sender)
  try {
    checkRateLimit(key);
  } catch (err) {
    // surface rate limit error
    throw err;
  }

  const transporter = createTransporter();
  const code = generateCode();
  const now = Date.now();
  const expiresAt = now + (config.emailOtp?.ttlMs || DEFAULT_TTL_MS);
  const maxAttempts = config.emailOtp?.maxAttempts || DEFAULT_MAX_ATTEMPTS;

  const fromName = config.emailOtp?.fromName || config.bot?.name || "Rara Bot";
  const subject = `${fromName} — Kode Verifikasi (OTP)`;

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.5;">
      <h2 style="margin:0 0 8px 0">Kode Verifikasi</h2>
      <p style="margin:0 0 12px 0">Kode verifikasi <b>(${fromName})</b> untuk menyelesaikan pendaftaran kamu:</p>
      <p style="font-size:28px; font-weight:700; margin:8px 0">${code}</p>
      <p style="margin:12px 0 0 0; color:#666">Kode berlaku selama ${Math.round((expiresAt - now) / 60000)} menit. Jangan bagikan kode ini kepada siapapun.</p>
    </div>
  `;

  // send email
  const mailOptions = {
    from: `${fromName} <${config.emailOtp.user}>`,
    to: email,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    // if sending failed, rollback rate increment for fairness
    const entry = global.emailOtpRateMap[key];
    if (entry && entry.count) entry.count = Math.max(0, entry.count - 1);
    // persist rollback
    persistState().catch(() => {});
    throw new Error(`Gagal mengirim email: ${err.message}`);
  }

  global.emailOtpSessions[key] = {
    email,
    code,
    expiresAt,
    attemptsLeft: maxAttempts,
    createdAt: now,
  };

  // persist sessions
  persistState().catch(() => {});

  return {
    ok: true,
    email,
    expiresAt,
  };
}

export function verifyOtp(sender, inputCode) {
  const key = normalizeSender(sender);
  const session = global.emailOtpSessions[key];
  if (!session) {
    return { ok: false, reason: "expired" };
  }

  const now = Date.now();
  if (session.expiresAt && session.expiresAt <= now) {
    delete global.emailOtpSessions[key];
    // persist deletion
    persistState().catch(() => {});
    return { ok: false, reason: "expired" };
  }

  if (!session.attemptsLeft || session.attemptsLeft <= 0) {
    delete global.emailOtpSessions[key];
    persistState().catch(() => {});
    return { ok: false, reason: "max_attempts" };
  }

  if (String(inputCode).trim() === String(session.code)) {
    const email = session.email;
    delete global.emailOtpSessions[key];
    persistState().catch(() => {});
    return { ok: true, email };
  }

  // wrong code
  session.attemptsLeft = (session.attemptsLeft || 1) - 1;
  const attemptsLeft = session.attemptsLeft;
  if (attemptsLeft <= 0) {
    delete global.emailOtpSessions[key];
    persistState().catch(() => {});
    return { ok: false, reason: "max_attempts" };
  }

  // persist attempts decrement
  persistState().catch(() => {});

  return { ok: false, attemptsLeft };
}

export function clearOtpSession(sender) {
  const key = normalizeSender(sender);
  if (global.emailOtpSessions[key]) {
    delete global.emailOtpSessions[key];
    persistState().catch(() => {});
    return true;
  }
  return false;
}
