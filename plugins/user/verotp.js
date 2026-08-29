// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "verotp",
  alias: ["verotp"],
  category: "user",
  description: "Verifikasi kode OTP untuk pendaftaran email",
  usage: ".verotp <kode>",
  example: ".verotp 123456",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
  skipRegistration: true,
};

const MAX_ATTEMPTS = config.emailOtp?.maxAttempts || 3;
const DEFAULT_REWARDS = { koin: 30000, energi: 300, exp: 300000 };

function getSessionKey(jid) {
  return String(jid || "").replace(/[^0-9]/g, "");
}

function getOtpSession(jid) {
  const key = getSessionKey(jid);
  const session = global.emailOtpSessions?.[key];
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    if (session.timeout) clearTimeout(session.timeout);
    delete global.emailOtpSessions[key];
    return null;
  }
  return session;
}

function clearOtpSession(jid) {
  const key = getSessionKey(jid);
  const session = global.emailOtpSessions?.[key];
  if (session?.timeout) clearTimeout(session.timeout);
  delete global.emailOtpSessions[key];
}

async function handler(m, { args, sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);

  if (user?.isRegistered) {
    return await m.reply(claraWrap("verotp", "✅ Kamu sudah terdaftar!"));
  }

  const session = getOtpSession(m.sender);
  if (!session) {
    let txt = `Gak ada sesi OTP aktif nih!\n\n`;
    txt += `Daftar dulu dengan: \`${m.prefix}regmail <nama>, <email>\``;
    return await m.reply( txt, { commandName: "verotp" });
  }

  if (!args[0]) {
    let txt = `🔑 *ᴠᴇʀɪꜰɪᴋᴀꜱɪ ᴏᴛᴘ*\n\n`;
    txt += `Masukkan kode OTP yang dikirim ke email:\n`;
    txt += `\`${m.prefix}verotp <kode>\`\n\n`;
    txt += `Contoh: \`${m.prefix}verotp 123456\``;
    return await m.reply( txt, { commandName: "verotp" });
  }

  const inputOtp = args[0].trim();
  if (inputOtp !== session.otp) {
    session.attempts++;

    if (session.attempts >= MAX_ATTEMPTS) {
      clearOtpSession(m.sender);
      let txt = `Kode OTP salah ${MAX_ATTEMPTS}x!\n\n`;
      txt += `Sesi dibatalkan. Silakan daftar ulang:\n`;
      txt += `\`${m.prefix}regmail <nama>, <email>\``;
      await m.reply(claraWrap("verotp", txt));
      return;
    }

    const remaining = MAX_ATTEMPTS - session.attempts;
    let txt = `Kode OTP salah!\n\n`;
    txt += `Sisa percobaan: *${remaining}x*\n`;
    txt += `Ketik: \`${m.prefix}verotp <kode>\``;
    await m.reply(claraWrap("verotp", txt));
    return;
  }

  try {
    const rewards = config.registration?.rewards || DEFAULT_REWARDS;
    const alreadyClaimed = user?.hasClaimedRegisterReward || false;
    const serial = user?.regSerial || generateSerialNumber();

    db.setUser(m.sender, {
      isRegistered: true,
      regName: session.name,
      regEmail: session.email,
      regSerial: serial,
      regAge: user?.regAge || null,
      regGender: user?.regGender || null,
      lastRegisteredAt: new Date().toISOString(),
      registrationCount: (user?.registrationCount || 0) + 1,
      hasClaimedRegisterReward: !alreadyClaimed ? true : user.hasClaimedRegisterReward,
    });

    if (!alreadyClaimed) {
      const currentEnergi = user?.energi || 0;
      const currentKoin = user?.koin || 0;
      const currentExp = user?.exp || 0;

      db.setUser(m.sender, {
        energi: currentEnergi + rewards.energi,
        koin: currentKoin + rewards.koin,
        exp: currentExp + rewards.exp,
        hasClaimedRegisterReward: true,
      });
    }

    await db.save();
    clearOtpSession(m.sender);

    let txt = `╭──「 *ᴠᴇʀɪꜰɪᴇᴅ* 」\n`;
    txt += `│ 📛 Nama: *${session.name}*\n`;
    txt += `│ 📧 Email: *${session.email}*\n`;
    txt += `│ 🔑 SN: *${serial}*\n`;
    txt += `╰┈┈┈┈┈┈┈┈\n\n`;

    if (!alreadyClaimed) {
      txt += `╭──「 *ʀᴇᴡᴀʀᴅꜱ* 」\n`;
      txt += `│ 💰 +${rewards.koin.toLocaleString("id-ID")} Koin\n`;
      txt += `│ ⚡ +${rewards.energi} Energi\n`;
      txt += `│ ⭐ +${rewards.exp.toLocaleString("id-ID")} EXP\n`;
      txt += `╰┈┈┈┈┈┈┈┈\n\n`;
    }

    txt += `Selamat datang di ${config.bot?.name || "Nova AI"}!\n`;
    txt += `Ketik \`${m.prefix}menu\` untuk melihat fitur`;

    await m.reply( txt, { commandName: "verotp" });
  } catch (e) {
    console.error("[VerOTP] Error:", e.message);
    await m.reply(novaError("VerOTP", "Ada error saat verifikasi nih, coba lagi ya"));
  }
}

export { pluginConfig as config, handler };
