// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { toVoiceNote } from "../../src/lib/nova-ffmpeg.js";
import fs from "fs";
import path from "path";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getAssetBuffer } from "../../src/lib/nova-asset-manager.js";
import {
  getCachedJid,
  isLid,
  isLidConverted,
  lidToJid,
} from "../../src/lib/nova-lid.js";
import config from "../../config.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { notifyUserRegister } from "../../src/lib/nova-saluran-broadcast.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "daftar",
  alias: ["daftar", "regis", "registeruser", "daftarcepat"],
  category: "user",
  description: "Daftar sebagai user bot melalui sesi reply interaktif",
  usage: ".daftar",
  example: ".daftar",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
  skipRegistration: true,
};

if (!global.registrationSessions) global.registrationSessions = {};

const SESSION_TIMEOUT = 300000;
const DEFAULT_REWARDS = { koin: 30000, energi: 300, exp: 300000 };

// Random bonus untuk first-time registration
function generateRandomBonus() {
  return {
    koin: Math.floor(Math.random() * 4) * 10000 + 10000,
    energi: Math.floor(Math.random() * 4) * 50 + 50,
    exp: Math.floor(Math.random() * 4) * 100000 + 100000,
  };
}
const REGISTRATION_IMAGE_CANDIDATES = [
  "nova-daftar",
  "nova",
];

function getRegistrationContextInfo() {
  const saluranId = config.saluran?.id || "120363400911374213@newsletter";
  const saluranName = config.saluran?.name || config.bot?.name || "Nova-AI";

  return {
    forwardingScore: 9999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: saluranId,
      newsletterName: saluranName,
      serverMessageId: 127,
    },
  };
}

function getRegistrationRequired(db) {
  return (
    db.setting("registrationRequired") ?? config.registration?.enabled ?? false
  );
}

function getRegistrationRewards() {
  return config.registration?.rewards || DEFAULT_REWARDS;
}

async function getRegistrationImage() {
  const { getCachedThumb } = await import("../../src/lib/nova-serialize.js");
  for (const key of REGISTRATION_IMAGE_CANDIDATES) {
    const buf = getAssetBuffer(key);
    if (buf) return buf;
  }

  return null;
}

function normalizeRegistrationName(input) {
  return String(input || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSessionText(input) {
  return String(input || "")
    .trim()
    .toLowerCase();
}

function shouldBypassRegistrationAnswer(m) {
  if (!m?.isCommand) return false;
  const command = String(m.command || "").toLowerCase();
  return ["daftar", "register", "reg", "bataldaftar"].includes(command);
}

function getRegistrationSessionKey(jid) {
  let normalized = String(jid || "").trim();
  if (!normalized) return "";
  if (isLid(normalized) || isLidConverted(normalized)) {
    normalized = getCachedJid(normalized) || lidToJid(normalized) || normalized;
  }
  const digits = normalized.replace(/[^0-9]/g, "");
  return digits || normalized.toLowerCase();
}

function getRegistrationSessionEntry(jid) {
  const sessionKey = getRegistrationSessionKey(jid);
  if (sessionKey && global.registrationSessions?.[sessionKey]) {
    return {
      key: sessionKey,
      session: global.registrationSessions[sessionKey],
    };
  }
  const legacyKey = String(jid || "").trim();
  if (legacyKey && global.registrationSessions?.[legacyKey]) {
    return { key: legacyKey, session: global.registrationSessions[legacyKey] };
  }
  return { key: sessionKey, session: null };
}

function clearRegistrationSession(jid) {
  const { key, session } = getRegistrationSessionEntry(jid);
  if (!session) return false;
  if (session.timeout) clearTimeout(session.timeout);
  delete global.registrationSessions[key];
  return true;
}

function createRegistrationSession(jid, chatJid) {
  const sessionKey = getRegistrationSessionKey(jid);
  clearRegistrationSession(sessionKey);

  const session = {
    step: "name",
    name: null,
    age: null,
    gender: null,
    chatJid,
    promptId: null,
    startedAt: Date.now(),
    timeout: setTimeout(() => {
      if (global.registrationSessions[sessionKey]) {
        delete global.registrationSessions[sessionKey];
      }
    }, SESSION_TIMEOUT),
  };

  global.registrationSessions[sessionKey] = session;
  return session;
}

function getQuotedMessageId(m) {
  return m.quoted?.id || m.quoted?.stanzaId || m.quoted?.key?.id || null;
}

function isReplyToSessionPrompt(m, session) {
  const quotedId = getQuotedMessageId(m);
  if (!session || m.chat !== session.chatJid || !m.quoted) return false;
  if (quotedId && session.promptId && quotedId === session.promptId)
    return true;
  if (m.quoted?.key?.fromMe) return true;
  return false;
}

async function sendRegistrationPrompt(sock, m, text, options = {}) {
  const image = options.useImage ? await getRegistrationImage() : null;
  if (image) {
    return await sock.sendMessage(
      m.chat,
      {
        image,
        caption: text,
        contextInfo: getRegistrationContextInfo(),
      },
      { quoted: m },
    );
  } else {
    return await m.reply(claraWrap("daftar", text));
  }
}

function buildRewardPreview(user) {
  const rewards = getRegistrationRewards();

  if (user?.hasClaimedRegisterReward) {
    return `🎁 *Status Bonus*\n> Bonus daftar pertama sudah pernah kamu klaim\n> Daftar ulang tidak mendapat reward lagi`;
  }

  return `🎁 *Bonus Daftar Pertama*\n> 💰 +${rewards.koin.toLocaleString("id-ID")} Koin\n> ⚡ +${rewards.energi} Energi\n> ⭐ +${rewards.exp.toLocaleString("id-ID")} EXP\n> 🎲 Plus random bonus limit/koin/exp!`;
}

function buildConfirmationRewardBlock(user) {
  const rewards = getRegistrationRewards();

  if (user?.hasClaimedRegisterReward) {
    return `╭┈┈⬡「 🎁 *Bonus* 」\n┃ Bonus daftar pertama sudah pernah diambil\n┃ Daftar ulang tidak mendapat reward lagi\n╰┈┈┈┈┈┈┈┈⬡`;
  }

  return `╭┈┈⬡「 🎁 *Rewards* 」\n┃ 💰 +${rewards.koin.toLocaleString("id-ID")} Koin\n┃ ⚡ +${rewards.energi} Energi\n┃ ⭐ +${rewards.exp.toLocaleString("id-ID")} EXP\n╰┈┈┈┈┈┈┈┈⬡`;
}

function buildSuccessRewardBlock(alreadyClaimedReward, randomBonus) {
  const rewards = getRegistrationRewards();

  if (alreadyClaimedReward) {
    return `╭┈┈⬡「 🎁 *Bonus* 」\n┃ Bonus daftar sudah pernah diklaim\n┃ Tidak ada reward tambahan kali ini\n╰┈┈┈┈┈┈┈┈⬡`;
  }

  return `╭┈┈⬡「 🎁 *Rewards* 」\n┃ 💰 +${rewards.koin.toLocaleString("id-ID")} Koin\n┃ ⚡ +${rewards.energi} Energi\n┃ ⭐ +${rewards.exp.toLocaleString("id-ID")} EXP\n╰┈┈┈┈┈┈┈┈⬡`;
}

function generateSerialNumber() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let part1 = "", part2 = "";
  for (let i = 0; i < 5; i++) part1 += chars[Math.floor(Math.random() * chars.length)];
  for (let i = 0; i < 5; i++) part2 += chars[Math.floor(Math.random() * chars.length)];
  return "NOVA-" + part1 + "-" + part2;
}

function buildUserDataBlock(name, age, gender, serial) {
  return (
    `╔┈┈「 📋 DATA 」\n` +
    `╎❏ 📛 Nama: *${name || "-"}*\n` +
    `╎❏ 🎂 Umur: *${age ? `${age} tahun` : "-"}*\n` +
    `╎❏ 👤 Gender: *${gender || "-"}*\n` +
    `╎❏ 🔑 SN: *${serial || "-"}*\n` +
    `╚┈┈❖`
  );
}

function buildWelcomeMessage(user, registrationRequired, prefix) {
  const benefits = [
    `🗂️ Data akun kamu tersimpan lebih rapi`,
    `${buildRewardPreview(user)}`,
  ];

  if (registrationRequired) {
    benefits.splice(
      1,
      0,
      `🔓 Setelah daftar kamu bisa mengakses semua command`,
    );
  }

  return (
    `╔┈┈「 📝 DAFTAR 」\n` +
    `╎❏ *Selamat datang di Menu Daftar!*\n\n` +
    `╎✨ Dengan daftar, data akun kamu jadi lebih aman\n` +
    `╎ dan pengalaman pakai bot jadi lebih lengkap.\n\n` +
    `╎❏ *Manfaat Daftar*\n` +
    `${benefits.map((item) => `╎❏ ${item}`).join("\n")}\n\n` +
    `╎❏ *Pertanyaan 1/4*\n` +
    `╎ > Siapa nama kamu?\n\n` +
    `╎❏ *Wajib reply pesan ini ya*\n` +
    `╎ > Untuk batal: reply \`batal\` atau ketik \`${prefix}bataldaftar\`\n\n` +
    `╎❏ *Metode Daftar Lainnya*\n` +
    `╎ > \`${prefix}daftar Nama, Umur\` - Daftar cepat\n` +
    `╎ > \`${prefix}daftarotomatis\` - Daftar via captcha (DM)\n` +
    `╎ > \`${prefix}regmail Nama, email\` - Daftar via email OTP\n` +
    `╚┈┈❖`
  );
}

function buildConfirmationPrompt(session, user) {
  return (
    `✅ *Pertanyaan 4/4*\n\n` +
    `Apakah data berikut sudah benar?\n\n` +
    `${buildUserDataBlock(session.name, session.age, session.gender)}\n\n` +
    `${buildConfirmationRewardBlock(user)}\n\n` +
    `🛠️ Kalau ada yang salah, kamu bisa revisi per bagian.\n\n` +
    `*Reply pesan ini dengan:*\n` +
    `\`ya\` untuk simpan\n` +
    `\`revisi nama\` untuk ubah nama\n` +
    `\`revisi umur\` untuk ubah umur\n` +
    `\`revisi gender\` untuk ubah gender\n` +
    `\`batal\` untuk batalkan`
  );
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);

  if (user?.isRegistered) {
    return m.reply(
      `✅ Kamu sudah terdaftar!\n\n` +
      `${buildUserDataBlock(user.regName, user.regAge, user.regGender, user.regSerial)}\n\n` +
      `Untuk unregister: \`${m.prefix}unreg\``,
    );
  }

  // Quick registration: .daftar Nama, Umur  (support koma ATAU titik sebagai pemisah)
  const quickArgs = m.text ? m.text.trim() : "";
  if (quickArgs) {
    // Coba parse: support "Nama, Umur" dan "Nama. Umur"
    let parts = null;
    if (quickArgs.includes(",")) {
      parts = quickArgs.split(",").map(s => s.trim());
    } else if (/\w\.\s*\d/.test(quickArgs)) {
      // Titik diikuti angka — split di titik terakhir sebelum angka
      const lastPeriodMatch = quickArgs.match(/^(.+?)\.+\s*(\d+.*)$/);
      if (lastPeriodMatch) {
        parts = [lastPeriodMatch[1].trim(), lastPeriodMatch[2].trim()];
      }
    }
    if (parts && parts.length >= 2 && parts[0] && parts[1]) {
      const name = normalizeRegistrationName(parts[0]);
      const age = Number(parts[1]);

      if (name.length < 2 || name.length > 30) {
        return m.reply(claraWrap("daftar", "❌ Nama harus 2-30 karakter!"));
      }
      if (!/^\d+$/.test(String(parts[1])) || Number.isNaN(age) || age < 1 || age > 100) {
        return m.reply(claraWrap("daftar", "❌ Umur tidak valid! Masukkan angka 1-100."));
      }

      const gender = parts[2] ? (parts[2].trim()) : null;
      let finalGender = null;
      if (gender) {
        if (/^(laki[-\s]?laki|cowok?|cowo|l|male|pria)$/i.test(gender)) {
          finalGender = "Laki-laki";
        } else if (/^(perempuan|cewek?|cewe|p|female|wanita)$/i.test(gender)) {
          finalGender = "Perempuan";
        }
      }

      const rewards = getRegistrationRewards();
      const alreadyClaimedReward = Boolean(user.hasClaimedRegisterReward);
      const now = new Date().toISOString();
      const registrationCount = Number(user.registrationCount || 0) + 1;
      const serial = user.regSerial || generateSerialNumber();

      db.setUser(m.sender, {
        isRegistered: true,
        regName: name,
        regAge: age,
        regGender: finalGender || "Tidak disebutkan",
        regSerial: serial,
        registeredAt: user.registeredAt || now,
        lastRegisteredAt: now,
        registrationCount,
        hasClaimedRegisterReward: true,
        unregisteredAt: null,
      });

      let randomBonus = null;
      if (!alreadyClaimedReward) {
        randomBonus = generateRandomBonus();
        db.updateKoin(m.sender, rewards.koin + randomBonus.koin);
        db.updateEnergi(m.sender, rewards.energi + randomBonus.energi);
        db.updateExp(m.sender, rewards.exp + randomBonus.exp);
      }
      await db.save();
      notifyUserRegister(sock, { name: name, age: age, gender: finalGender || "Tidak disebutkan", phoneNumber: m.sender.split("@")[0], serial: serial }).catch((e) => { console.error('[daftar.js]:', e.message); });

      await sock.sendMessage(m.chat, {
        text:
          `🎉 *Pendaftaran Berhasil!*\n\n` +
          `Selamat datang, *${name}*!\n\n` +
          `${buildUserDataBlock(name, age, finalGender || "Tidak disebutkan", serial)}\n\n` +
          `${buildSuccessRewardBlock(alreadyClaimedReward, randomBonus)}\n\n` +
          `🚀 Sekarang kamu sudah siap menggunakan bot!`,
        contextInfo: getRegistrationContextInfo(),
      }, { quoted: m });
      return;
    }
  }

  // Jika quickArgs ada tapi ga match format, lanjut ke sesi interaktif

  if (getRegistrationSessionEntry(m.sender).session) {
    return m.reply(
      `📝 Masih ada sesi pendaftaran aktif!\n\n` +
      `Reply pesan terakhir bot untuk melanjutkan\n` +
      `Atau ketik: \`${m.prefix}bataldaftar\``,
    );
  }

  const session = createRegistrationSession(m.sender, m.chat);
  const sent = await sendRegistrationPrompt(
    sock,
    m,
    buildWelcomeMessage(user, getRegistrationRequired(db), m.prefix),
    { useImage: true },
  );

  session.promptId = sent?.key?.id || null;

  // Kirim VN "Daftar dulu, Kak!" setelah menu daftar muncul
  try {
    const vnPath = path.join(process.cwd(), "assets", "audio", "vn_daftar_dulu_kak.mp3");
    if (fs.existsSync(vnPath)) {
      const vnBuffer = fs.readFileSync(vnPath);
      if (vnBuffer && vnBuffer.length > 0) {
        await sock.sendMessage(
          m.chat,
          { audio: await toVoiceNote(vnBuffer), mimetype: "audio/ogg; codecs=opus", ptt: true },
          { quoted: sent }
        );
      }
    }
  } catch (e) {
    console.error("[Daftar] VN error:", e.message);
  }

}

async function registrationAnswerHandler(m, sock) {
  if (!m.body) return false;
  if (shouldBypassRegistrationAnswer(m)) return false;

  const { session } = getRegistrationSessionEntry(m.sender);
  if (!session) return false;
  if (m.chat !== session.chatJid) return false;

  const text = m.body.trim();
  const lowText = normalizeSessionText(text);
  const db = getDatabase();

  if (["batal", "cancel", "batalkan"].includes(lowText)) {
    clearRegistrationSession(m.sender);
    await m.reply(
      `❌ Pendaftaran dibatalkan.\n\n> Mulai lagi dengan: \`${m.prefix}daftar\``,
    );
    return true;
  }

  if (session.step === "name") {
    const name = normalizeRegistrationName(text);

    if (name.length < 2 || name.length > 30) {
      await m.reply(claraWrap("daftar", `❌ Nama harus 2-30 karakter!`));
      return true;
    }

    session.name = name;
    session.step = "age";

    const sent = await sendRegistrationPrompt(
      sock,
      m,
      `🎂 *Pertanyaan 2/4*\n\n` +
      `Halo *${name}* 👋\n\n` +
      `Berapa umurmu?\n\n` +
      `📌 Umur hanya boleh *1 - 100* tahun\n` +
      `📩 Reply pesan ini dengan angka umur kamu\n\n` +
      `Contoh: \`17\``,
    );

    session.promptId = sent?.key?.id || session.promptId;
    return true;
  }

  if (session.step === "age") {
    const age = Number(text);

    if (!/^\d+$/.test(text) || Number.isNaN(age) || age < 1 || age > 100) {
      await m.reply(
        `❌ Umur tidak valid!\n\n> Masukkan angka umur dari *1 - 100* tahun`,
      );
      return true;
    }

    session.age = age;
    session.step = "gender";

    const sent = await sendRegistrationPrompt(
      sock,
      m,
      `❓ *Pertanyaan 3/4*\n\n` +
      `Kamu cowo atau cewe?\n\n` +
      `┃ 👦 *Cowo* / *Cowok* / *Laki-laki* / *L*\n` +
      `┃ 👧 *Cewe* / *Cewek* / *Perempuan* / *P*\n\n` +
      `📩 Reply pesan ini dengan jawabanmu`,
    );

    session.promptId = sent?.key?.id || session.promptId;
    return true;
  }

  if (session.step === "gender") {
    let gender = null;

    if (/^(laki[-\s]?laki|cowok?|cowo|l|male|pria)$/i.test(lowText)) {
      gender = "Laki-laki";
    } else if (/^(perempuan|cewek?|cewe|p|female|wanita)$/i.test(lowText)) {
      gender = "Perempuan";
    }

    if (!gender) {
      await m.reply(
        `❌ Gender tidak valid!\n\n` +
        `Balas dengan: *Cowo* / *Cowok* / *Laki-laki* / *L*\n` +
        `Atau: *Cewe* / *Cewek* / *Perempuan* / *P*`,
      );
      return true;
    }

    session.gender = gender;
    session.step = "confirm";

    const user = db.getUser(m.sender) || {};
    const sent = await sendRegistrationPrompt(
      sock,
      m,
      buildConfirmationPrompt(session, user),
    );

    session.promptId = sent?.key?.id || session.promptId;
    return true;
  }

  if (session.step === "revise_name") {
    const name = normalizeRegistrationName(text);

    if (name.length < 2 || name.length > 30) {
      await m.reply(claraWrap("daftar", `❌ Nama harus 2-30 karakter!`));
      return true;
    }

    session.name = name;
    session.step = "confirm";

    const user = db.getUser(m.sender) || {};
    const sent = await sendRegistrationPrompt(
      sock,
      m,
      buildConfirmationPrompt(session, user),
    );

    session.promptId = sent?.key?.id || session.promptId;
    return true;
  }

  if (session.step === "revise_age") {
    const age = Number(text);

    if (!/^\d+$/.test(text) || Number.isNaN(age) || age < 1 || age > 100) {
      await m.reply(
        `❌ Umur tidak valid!\n\n> Masukkan angka umur dari *1 - 100* tahun`,
      );
      return true;
    }

    session.age = age;
    session.step = "confirm";

    const user = db.getUser(m.sender) || {};
    const sent = await sendRegistrationPrompt(
      sock,
      m,
      buildConfirmationPrompt(session, user),
    );

    session.promptId = sent?.key?.id || session.promptId;
    return true;
  }

  if (session.step === "revise_gender") {
    let gender = null;

    if (/^(laki[-\s]?laki|cowok?|cowo|l|male|pria)$/i.test(lowText)) {
      gender = "Laki-laki";
    } else if (/^(perempuan|cewek?|cewe|p|female|wanita)$/i.test(lowText)) {
      gender = "Perempuan";
    }

    if (!gender) {
      await m.reply(
        `❌ Gender tidak valid!\n\n` +
        `Balas dengan: *Cowo* / *Cowok* / *Laki-laki* / *L*\n` +
        `Atau: *Cewe* / *Cewek* / *Perempuan* / *P*`,
      );
      return true;
    }

    session.gender = gender;
    session.step = "confirm";

    const user = db.getUser(m.sender) || {};
    const sent = await sendRegistrationPrompt(
      sock,
      m,
      buildConfirmationPrompt(session, user),
    );

    session.promptId = sent?.key?.id || session.promptId;
    return true;
  }

  if (session.step === "confirm") {
    if (["revisi nama", "ubah nama", "edit nama"].includes(lowText)) {
      session.step = "revise_name";

      const sent = await sendRegistrationPrompt(
        sock,
        m,
        `📛 *Revisi Nama*\n\n` +
        `Kirim nama yang benar ya.\n\n` +
        `📩 Reply pesan ini dengan nama baru kamu`,
      );

      session.promptId = sent?.key?.id || session.promptId;
      return true;
    }

    if (
      ["revisi umur", "ubah umur", "edit umur", "revisi usia"].includes(lowText)
    ) {
      session.step = "revise_age";

      const sent = await sendRegistrationPrompt(
        sock,
        m,
        `🎂 *Revisi Umur*\n\n` +
        `Kirim umur yang benar ya.\n\n` +
        `📌 Umur hanya boleh *1 - 100* tahun\n` +
        `📩 Reply pesan ini dengan angka umur baru kamu`,
      );

      session.promptId = sent?.key?.id || session.promptId;
      return true;
    }

    if (
      ["revisi gender", "ubah gender", "edit gender", "revisi jk"].includes(
        lowText,
      )
    ) {
      session.step = "revise_gender";

      const sent = await sendRegistrationPrompt(
        sock,
        m,
        `👤 *Revisi Gender*\n\n` +
        `Pilih gender yang benar ya.\n\n` +
        `┃ 👦 *Cowo* / *Cowok* / *Laki-laki* / *L*\n` +
        `┃ 👧 *Cewe* / *Cewek* / *Perempuan* / *P*\n\n` +
        `📩 Reply pesan ini dengan jawabanmu`,
      );

      session.promptId = sent?.key?.id || session.promptId;
      return true;
    }

    if (
      ["revisi", "ulang", "reset", "ulangi", "edit", "ubah"].includes(lowText)
    ) {
      await m.reply(
        `❌ Revisi belum spesifik!\n\n` +
        `Reply: \`revisi nama\`, \`revisi umur\`, atau \`revisi gender\``,
      );
      return true;
    }

    if (!["ya", "y", "iya", "yes", "lanjut", "confirm"].includes(lowText)) {
      await m.reply(
        `❌ Balasan tidak valid!\n\n> Reply: \`ya\`, \`revisi nama\`, \`revisi umur\`, \`revisi gender\`, atau \`batal\``,
      );
      return true;
    }

    const currentUser = db.getUser(m.sender) || {};
    const rewards = getRegistrationRewards();
    const alreadyClaimedReward = Boolean(currentUser.hasClaimedRegisterReward);
    const now = new Date().toISOString();
    const registrationCount = Number(currentUser.registrationCount || 0) + 1;
    const finalName = session.name;
    const finalAge = session.age;
    const finalGender = session.gender;
    const serial = currentUser.regSerial || generateSerialNumber();

    db.setUser(m.sender, {
      isRegistered: true,
      regName: finalName,
      regAge: finalAge,
      regGender: finalGender,
      regSerial: serial,
      registeredAt: currentUser.registeredAt || now,
      lastRegisteredAt: now,
      registrationCount,
      hasClaimedRegisterReward: true,
      unregisteredAt: null,
    });

    let randomBonus = null;
    if (!alreadyClaimedReward) {
      randomBonus = generateRandomBonus();
      db.updateKoin(m.sender, rewards.koin + randomBonus.koin);
      db.updateEnergi(m.sender, rewards.energi + randomBonus.energi);
      db.updateExp(m.sender, rewards.exp + randomBonus.exp);
    }

    await db.save();
    clearRegistrationSession(m.sender);
    notifyUserRegister(sock, { name: finalName, age: finalAge, gender: finalGender, phoneNumber: m.sender.split("@")[0], serial: serial }).catch((e) => { console.error('[daftar.js]:', e.message); });

    await sock.sendMessage(
      m.chat,
      {
        text:
          `🎉 *Pendaftaran Berhasil!*\n\n` +
          `Selamat datang, *${finalName}*!\n\n` +
          `${buildUserDataBlock(finalName, finalAge, finalGender, serial)}\n\n` +
          `${buildSuccessRewardBlock(alreadyClaimedReward, randomBonus)}\n\n` +
          `🚀 Sekarang kamu sudah siap menggunakan bot!`,
        contextInfo: getRegistrationContextInfo(),
      },
      { quoted: m },
    );

    return true;
  }

  return false;
}

export {
  pluginConfig as config,
  handler,
  registrationAnswerHandler,
  clearRegistrationSession,
};
