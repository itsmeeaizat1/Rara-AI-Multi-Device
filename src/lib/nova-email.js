import nodemailer from "nodemailer";
import config from "../../config.js";

let transporter = null;
let transporterKey = "";
let cachedDb = null;

function getConfig() {
  if (cachedDb && cachedDb.setting) {
    const dbSetting = cachedDb.setting("emailOtp");
    if (dbSetting && typeof dbSetting === "object" && dbSetting.user) {
      return { ...config.emailOtp, ...dbSetting };
    }
  }
  return config.emailOtp || {};
}

export function setEmailDb(db) {
  cachedDb = db;
}

function getTransporter() {
  const cfg = getConfig();
  if (!cfg.user || !cfg.pass) return null;

  const key = `${cfg.user}:${cfg.pass}:${cfg.host}:${cfg.port}`;
  if (transporter && transporterKey === key) return transporter;

  transporter = nodemailer.createTransport({
    host: cfg.host || "smtp.gmail.com",
    port: cfg.port || 587,
    secure: cfg.secure || false,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });

  transporterKey = key;
  return transporter;
}

export function isEmailConfigured() {
  const cfg = getConfig();
  return !!(cfg.user && cfg.pass);
}

export function getEmailUser() {
  return getConfig().user || "";
}

export async function sendOtpEmail(toEmail, otpCode, botName) {
  const cfg = getConfig();
  const transport = getTransporter();
  if (!transport) {
    throw new Error("Email SMTP belum dikonfigurasi");
  }

  const fromName = cfg.fromName || botName || "Nova AI";
  const fromEmail = cfg.user;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <div style="background: #6C5CE7; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
        <h2 style="margin: 0; font-size: 22px;">${botName || "Nova AI"}</h2>
        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Verifikasi Pendaftaran</p>
      </div>
      <div style="background: #f8f9fa; padding: 28px; border-radius: 0 0 12px 12px; border: 1px solid #e0e0e0;">
        <p style="font-size: 15px; color: #333;">Hai! Berikut kode OTP untuk verifikasi pendaftaran kamu:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; background: #6C5CE7; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px 32px; border-radius: 10px;">${otpCode}</span>
        </div>
        <p style="font-size: 13px; color: #666; text-align: center;">Kode ini berlaku selama ${Math.round((cfg.ttlMs || 300000) / 60000)} menit</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">Jangan bagikan kode ini kepada siapapun.<br>Email ini dikirim otomatis oleh ${botName || "Nova AI"}.</p>
      </div>
    </div>
  `;

  const text = `Kode OTP untuk verifikasi pendaftaran ${botName || "Nova AI"}: ${otpCode}\n\nKode ini berlaku selama ${Math.round((cfg.ttlMs || 300000) / 60000)} menit.\nJangan bagikan kode ini kepada siapapun.`;

  const info = await transport.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: toEmail,
    subject: `Kode OTP - ${botName || "Nova AI"}`,
    text,
    html,
  });

  return info;
}
