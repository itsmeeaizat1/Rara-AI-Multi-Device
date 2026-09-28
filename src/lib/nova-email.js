// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Engine email automation: kirim via SMTP (nodemailer) + baca inbox via IMAP (imapflow + mailparser, lazy-load).
import { getDatabase } from "./nova-database.js";

const KNOWN_HOSTS = {
  "gmail.com": { smtp: "smtp.gmail.com", imap: "imap.gmail.com" },
  "googlemail.com": { smtp: "smtp.gmail.com", imap: "imap.gmail.com" },
  "outlook.com": { smtp: "smtp-mail.outlook.com", imap: "outlook.office365.com" },
  "hotmail.com": { smtp: "smtp-mail.outlook.com", imap: "outlook.office365.com" },
  "live.com": { smtp: "smtp-mail.outlook.com", imap: "outlook.office365.com" },
  "yahoo.com": { smtp: "smtp.mail.yahoo.com", imap: "imap.mail.yahoo.com" },
};

export function validateEmailAddr(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || ""));
}

function db() {
  const database = getDatabase();
  if (!database.data.email) database.data.email = null;
  return database;
}

export function setEmailConfig(address, password, smtpHost, imapHost) {
  if (!validateEmailAddr(address)) return { ok: false, error: "alamat email gak valid" };
  if (!password || String(password).length < 4) return { ok: false, error: "password / app-password kosong atau terlalu pendek" };
  const domain = String(address).split("@")[1].toLowerCase();
  const known = KNOWN_HOSTS[domain] || { smtp: smtpHost || "smtp." + domain, imap: imapHost || "imap." + domain };
  const d = db();
  d.data.email = {
    address: String(address).trim(),
    pass: String(password),
    smtpHost: known.smtp,
    smtpPort: 587,
    imapHost: known.imap,
    imapPort: 993,
    setAt: new Date().toISOString(),
  };
  return { ok: true, config: { ...d.data.email, pass: "***" } };
}

export function setEmailHosts(smtpHost, imapHost) {
  const cfg = db().data.email;
  if (!cfg) return { ok: false, error: "email belum diatur: .email set <alamat> <password> dulu" };
  if (smtpHost) cfg.smtpHost = smtpHost;
  if (imapHost) cfg.imapHost = imapHost;
  return { ok: true };
}

export function getEmailConfig() { return db().data.email || null; }
export function clearEmailConfig() { db().data.email = null; return { ok: true }; }

let _transportForTest = null;
export function _setTransportForTest(fn) { _transportForTest = fn; }

export async function sendEmail(to, subject, body) {
  const cfg = getEmailConfig();
  if (!cfg) return { ok: false, error: "email belum diatur: .email set <alamat> <password>" };
  if (!validateEmailAddr(to)) return { ok: false, error: "alamat tujuan gak valid: " + to };
  const nodemailer = await import("nodemailer");
  const transporter = _transportForTest || nodemailer.default.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort,
    secure: false,
    auth: { user: cfg.address, pass: cfg.pass },
  });
  const info = await transporter.sendMail({
    from: '"Nova Bot" <' + cfg.address + ">",
    to: String(to).trim(),
    subject: String(subject || "(tanpa subjek)"),
    text: String(body || ""),
  });
  return { ok: true, id: (info && info.messageId) || "?" };
}

export async function readEmails(limit = 5) {
  const cfg = getEmailConfig();
  if (!cfg) return { ok: false, error: "email belum diatur: .email set <alamat> <password>" };
  const n = Math.min(Math.max(parseInt(limit, 10) || 5, 1), 10);
  const { ImapFlow } = await import("imapflow");
  const { simpleParser } = await import("mailparser");
  const client = new ImapFlow({
    host: cfg.imapHost,
    port: cfg.imapPort,
    secure: true,
    auth: { user: cfg.address, pass: cfg.pass },
    logger: false,
    emitLogs: false,
  });
  const out = [];
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const total = (client.mailbox && client.mailbox.exists) || 0;
      if (!total) return { ok: true, mails: [] };
      for (let seq = Math.max(1, total - n + 1); seq <= total; seq++) {
        const msg = await client.fetchOne(String(seq), { source: true });
        if (!msg || !msg.source) continue;
        const parsed = await simpleParser(msg.source);
        out.push({
          from: (parsed.from && parsed.from.text) || "?",
          subject: parsed.subject || "(tanpa subjek)",
          date: parsed.date ? new Date(parsed.date).toISOString().slice(0, 16).replace("T", " ") : "?",
          snippet: String(parsed.text || "").replace(/\s+/g, " ").trim().slice(0, 300),
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
  return { ok: true, mails: out.reverse() };
}
