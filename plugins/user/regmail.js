// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { sendOtpEmail, isEmailConfigured, getEmailUser, setEmailDb } from "../../src/lib/rara-email.js";
import config from "../../config.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "regmail",
  alias: ["regmail"],
  category: "user",
  description: "Daftar bot dengan verifikasi email OTP",
  usage: ".regmail <nama>, <email>",
  example: ".regmail Aizat, aizat@gmail.com",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
  skipRegistration: true,
};

if (!global.emailOtpSessions) global.emailOtpSessions = {};
const OTP_TTL = config.emailOtp?.ttlMs || 5 * 60 * 1000;
const MAX_ATTEMPTS = config.emailOtp?.maxAttempts || 3;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getSessionKey(jid) {
  return String(jid || "").replace(/[^0-9]/g, "");
}

function createOtpSession(jid, name, email) {
  const key = getSessionKey(jid);
  if (global.emailOtpSessions[key]?.timeout) {
    clearTimeout(global.emailOtpSessions[key].timeout);
  }

  const otp = generateOtp();
  const session = {
    name,
    email,
    otp,
    attempts: 0,
    createdAt: Date.now(),
    expiresAt: Date.now() + OTP_TTL,
    timeout: setTimeout(() => {
      delete global.emailOtpSessions[key];
    }, OTP_TTL),
  };

  global.emailOtpSessions[key] = session;
  return session;
}

function getOtpSession(jid) {
  const key = getSessionKey(jid);
  const session = global.emailOtpSessions[key];
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    clearTimeout(session.timeout);
    delete global.emailOtpSessions[key];
    return null;
  }
  return session;
}

function clearOtpSession(jid) {
  const key = getSessionKey(jid);
  const session = global.emailOtpSessions[key];
  if (session?.timeout) clearTimeout(session.timeout);
  delete global.emailOtpSessions[key];
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function handler(m, { args, sock }) {
  const db = getDatabase();
  setEmailDb(db);
  const user = db.getUser(m.sender);

  if (user?.isRegistered) {
    let txt = `✅ Kamu sudah terdaftar!\n\n`;
    txt += `📛 Nama: *${user.regName || "-"}*\n`;
    txt += `📧 Email: *${user.regEmail || "-"}*\n`;
    txt += `🔑 SN: *${user.regSerial || "-"}*\n\n`;
    txt += `Untuk unregister: \`${m.prefix}unreg\``;
    return await m.reply( txt, { commandName: "regmail" });
  }

  if (!isEmailConfigured()) {
    let txt = `Sistem registrasi email belum dikonfigurasi nih\n\n`;
    txt += `Owner perlu set email SMTP dulu dengan:\n`;
    txt += `\`${m.prefix}setemail <email> <app-password>\`\n\n`;
    txt += `Atau gunakan \`${m.prefix}daftar\` untuk daftar tanpa email.`;
    return await m.reply(raraWrap("regmail", txt));
  }

  if (getOtpSession(m.sender)) {
    let txt = `📝 Kamu masih punya sesi OTP aktif!\n\n`;
    txt += `Ketik \`${m.prefix}verotp <kode>\` untuk verifikasi\n`;
    txt += `Atau tunggu ${Math.round(OTP_TTL / 60000)} menit sampai kedaluwarsa`;
    return await m.reply( txt, { commandName: "regmail" });
  }

  if (!args[0]) {
    let txt = `📧 *registrasi email*\n\n`;
    txt += `Daftar bot dengan verifikasi email OTP!\n\n`;
    txt += `*cara pakai:*\n`;
    txt += `\`${m.prefix}regmail <nama>, <email>\`\n\n`;
    txt += `*contoh:*\n`;
    txt += `\`${m.prefix}regmail Aizat, aizat@gmail.com\`\n\n`;
    txt += `Setelah itu, kode OTP akan dikirim ke email kamu.\n`;
    txt += `Verifikasi dengan: \`${m.prefix}verotp <kode>\``;
    return await m.reply( txt, { commandName: "regmail" });
  }

  const input = args.join(" ").split(",");
  if (input.length < 2) {
    let txt = `Format salah nih!\n\n`;
    txt += `\`${m.prefix}regmail <nama>, <email>\`\n`;
    txt += `Contoh: \`${m.prefix}regmail Aizat, aizat@gmail.com\``;
    return await m.reply( txt, { commandName: "regmail" });
  }

  const name = input[0].trim();
  const email = input[1].trim().toLowerCase();

  if (name.length < 2 || name.length > 30) {
    return await m.reply(raraError("RegMail", "Nama harus 2-30 karakter ya"));
  }

  if (!validateEmail(email)) {
    return await m.reply(raraError("RegMail", "Email gak valid! Contoh: nama@gmail.com"));
  }

  const existingUsers = db.data?.users || {};
  for (const [uid, u] of Object.entries(existingUsers)) {
    if (u.regEmail?.toLowerCase() === email && u.isRegistered) {
      return await m.reply(raraError("RegMail", "Email ini sudah terdaftar! Pakai email lain ya"));
    }
  }
  try {
    const botName = config.bot?.name || "Rara AI";
    const session = createOtpSession(m.sender, name, email);

    await sendOtpEmail(email, session.otp, botName);

    let txt = `✅ *Kode OTP Terkirim!*\n\n`;
    txt += `📬 Email: *${email}*\n`;
    txt += `📛 Nama: *${name}*\n\n`;
    txt += `Kode OTP sudah dikirim ke email kamu.\n`;
    txt += `Verifikasi dalam ${Math.round(OTP_TTL / 60000)} menit!\n\n`;
    txt += `Ketik: \`${m.prefix}verotp <kode>\`\n`;
    txt += `Contoh: \`${m.prefix}verotp 123456\``;

    await m.reply( txt, { commandName: "regmail" });
  } catch (e) {
    console.error("[Regmail] Error:", e.message);
    clearOtpSession(m.sender);
    let txt = `Gagal kirim OTP ke email nih!\n\n`;
    txt += `Error: ${e.message}\n\n`;
    txt += `Pastikan email valid dan SMTP terkonfigurasi dengan benar.`;
    await m.reply(raraWrap("regmail", txt));
  }
}

export { pluginConfig as config, handler };
