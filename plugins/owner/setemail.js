// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { isEmailConfigured, getEmailUser, setEmailDb } from "../../src/lib/nova-email.js";
import config from "../../config.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "setemail",
  alias: ["setemail"],
  category: "owner",
  description: "Set email SMTP untuk fitur registrasi OTP",
  usage: ".setemail <email> <app-password>",
  example: ".setemail bot@gmail.com aaaa bbbb cccc dddd",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { args, sock, isOwner }) {
  if (!isOwner) return;

  const db = getDatabase();
  setEmailDb(db);

  if (!args[0]) {
    let txt = `📧 *set email smtp*\n\n`;
    txt += `Konfigurasi email untuk kirim OTP registrasi.\n\n`;
    txt += `*Cara Pakai:*\n`;
    txt += `\`${m.prefix}setemail <email> <app-password>\`\n\n`;
    txt += `*Contoh (Gmail):*\n`;
    txt += `\`${m.prefix}setemail bot@gmail.com aaaa bbbb cccc dddd\`\n\n`;

    if (isEmailConfigured()) {
      txt += `✅ Status: Aktif\n`;
      txt += `📧 Email: *${getEmailUser()}*\n\n`;
      txt += `\`${m.prefix}setemail info\` untuk lihat status\n`;
      txt += `\`${m.prefix}setemail test\` untuk test kirim email\n`;
      txt += `\`${m.prefix}setemail off\` untuk matikan`;
    } else {
      txt += `❌ Status: Belum dikonfigurasi\n\n`;
      txt += `*Cara dapat Gmail App Password:*\n`;
      txt += `1. Buka Google Account Settings\n`;
      txt += `2. Security > 2-Step Verification\n`;
      txt += `3. App passwords > buat password baru\n`;
      txt += `4. Gunakan 16-karakter password tersebut`;
    }

    return await m.reply( txt, { commandName: "setemail" });
  }

  const input = args.join(" ").trim();

  if (input.toLowerCase() === "off") {
    config.emailOtp.enabled = false;
    config.emailOtp.user = "";
    config.emailOtp.pass = "";
    db.setSetting("emailOtp", { enabled: false });
    return await m.reply(claraWrap("Setemail", "✅ Email SMTP dimatikan."));
  }

  if (input.toLowerCase() === "info") {
    let txt = `📧 *INFO EMAIL SMTP*\n\n`;
    if (isEmailConfigured()) {
      txt += `✅ Status: *Aktif*\n`;
      txt += `📧 Email: *${getEmailUser()}*\n`;
      txt += `🌐 Host: *${config.emailOtp?.host || "smtp.gmail.com"}*\n`;
      txt += `🔌 Port: *${config.emailOtp?.port || 587}*\n`;
      txt += `🔒 Secure: *${config.emailOtp?.secure ? "Yes" : "No"}*\n\n`;
      txt += `\`${m.prefix}setemail info\` untuk lihat status\n`;
      txt += `\`${m.prefix}setemail test\` untuk test kirim email\n`;
      txt += `\`${m.prefix}setemail off\` untuk matikan`;
    } else {
      txt += `❌ Status: *Belum dikonfigurasi*\n\n`;
      txt += `Set dengan: \`${m.prefix}setemail <email> <app-password>\``;
    }
    return await m.reply( txt, { commandName: "setemail" });
  }

  if (input.toLowerCase() === "test") {
    if (!isEmailConfigured()) {
      return await m.reply(claraWrap("setemail", "❌ Email belum dikonfigurasi! Set dulu dengan `.setemail <email> <password>`"));
    }

    try {
      const { sendOtpEmail } = await import("../../src/lib/nova-email.js");
      await sendOtpEmail(getEmailUser(), "000000", config.bot?.name || "Nova AI");
      return await m.reply(claraWrap("Setemail", "✅ Test email berhasil dikirim! Cek inbox kamu."));
    } catch (e) {
      return await m.reply(claraWrap("setemail", `❌ Test gagal: ${e.message}`));
    }
  }

  const parts = input.split(/\s+/);
  const email = parts[0];
  const password = parts.slice(1).join(" ").replace(/\s+/g, "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return await m.reply(claraWrap("Setemail", "❌ Format email tidak valid!"));
  }

  if (!password || password.length < 8) {
    return await m.reply(claraWrap("Setemail", "❌ Password terlalu pendek! Gunakan App Password (16 karakter untuk Gmail)."));
  }

  config.emailOtp.user = email;
  config.emailOtp.pass = password;
  config.emailOtp.enabled = true;

  db.setSetting("emailOtp", {
    enabled: true,
    user: email,
    pass: password,
    fromName: config.bot?.name || "Nova AI",
    host: config.emailOtp.host || "smtp.gmail.com",
    port: config.emailOtp.port || 587,
    secure: config.emailOtp.secure || false,
  });

  let txt = `✅ *Email SMTP Berhasil Diset!*\n\n`;
  txt += `📧 Email: *${email}*\n`;
  txt += `🔒 Password: *${"*".repeat(password.length)}*\n`;
  txt += `🌐 Host: *${config.emailOtp.host || "smtp.gmail.com"}*\n`;
  txt += `🔌 Port: *${config.emailOtp.port || 587}*\n\n`;
  txt += `Sekarang user bisa daftar dengan:\n`;
  txt += `\`${m.prefix}regmail <nama>, <email>\``;

  await m.reply( txt, { commandName: "setemail" });
}

export { pluginConfig as config, handler };
