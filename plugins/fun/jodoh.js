// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";
import path from "path";
import fs from "fs";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA } from "../../src/lib/nova-games.js";
const pluginConfig = {
  name: "jodoh",
  alias: ["jodoh"],
  category: "fun",
  description: "Jodohkan 2 member random dengan kecocokan",
  usage: ".jodoh",
  example: ".jodoh",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

let thumbFun = null;
try {
  const thumbPath = path.join(
    process.cwd(),
    "assets",
    "images",
    "nova-games.jpg",
  );
  if (fs.existsSync(thumbPath)) thumbFun = fs.readFileSync(thumbPath);
} catch (e) { console.error('[jodoh.js]:', e.message); }

const loveQuotes = [
  "Cinta sejati tidak pernah mengenal jarak 💕",
  "Dua hati yang bersatu takkan terpisahkan 💗",
  "Kalian seperti puzzle yang sempurna 🧩",
  "Match made in heaven!",
  "Chemistry-nya kuat banget! 🔥",
  "Couple goals banget sih kalian 💑",
  "Destiny brought you together 🌟",
  "Perfect match detected! 💘",
];

const compatibilityEmoji = (percent) => {
  if (percent >= 90) return "💕💕💕💕💕";
  if (percent >= 70) return "💕💕💕💕";
  if (percent >= 50) return "💕💕💕";
  if (percent >= 30) return "💕💕";
  return "💕";
};

const compatibilityText = (percent) => {
  if (percent >= 90) return "JODOH SEJATI! 💍";
  if (percent >= 70) return "Sangat Cocok! 💖";
  if (percent >= 50) return "Lumayan Cocok 💗";
  if (percent >= 30) return "Bisa Dicoba 💓";
  return "Butuh Usaha Lebih 💔";
};

const isRegistrationRequired = (db) => {
  return (
    db.setting("registrationRequired") ?? config.registration?.enabled ?? false
  );
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const botNumber = sock.user?.id?.split(":")[0] + "@s.whatsapp.net";

  let groupMeta;
  try {
    await m.react("🕒");
    groupMeta = m.groupMetadata;
  } catch (e) {
    await m.react("❌");
    return m.reply(claraWrap("jodoh", "Tidak bisa mengambil data grup!", "error"));
  }

  const participants = groupMeta.participants || [];
  const memberJids = participants
    .map((p) => p.jid || p.id)
    .filter((jid) => jid && jid !== botNumber);

  if (memberJids.length < 2) {
    return m.reply(claraWrap("jodoh", "Minimal ada 2 member untuk dijodohkan!", "error"));
  }

  const allUsers = db.getAllUsers();
  const registrationRequired = isRegistrationRequired(db);
  const registeredMembers = memberJids.filter((jid) => {
    const cleanJid = jid.replace(/@.+/g, "");
    return allUsers[cleanJid]?.isRegistered;
  });
  const registeredInGroup = memberJids.filter((jid) => {
    const cleanJid = jid.replace(/@.+/g, "");
    const user = allUsers[cleanJid];
    return user?.isRegistered && user.regGender;
  });

  if (registrationRequired && registeredMembers.length < 2) {
    return m.reply(
      claraWrap("jodoh", "Mode wajib daftar aktif. Minimal harus ada 2 member yang sudah terdaftar di grup ini!", "error"),
    );
  }

  let person1 = null;
  let person2 = null;
  let usedRegistration = false;

  if (registeredInGroup.length >= 2) {
    const males = registeredInGroup.filter((jid) => {
      const cleanJid = jid.replace(/@.+/g, "");
      return allUsers[cleanJid]?.regGender === "Laki-laki";
    });
    const females = registeredInGroup.filter((jid) => {
      const cleanJid = jid.replace(/@.+/g, "");
      return allUsers[cleanJid]?.regGender === "Perempuan";
    });

    if (males.length > 0 && females.length > 0) {
      person1 = males[Math.floor(Math.random() * males.length)];
      person2 = females[Math.floor(Math.random() * females.length)];
      usedRegistration = true;
    } else {
      const shuffled = registeredInGroup.sort(() => Math.random() - 0.5);
      person1 = shuffled[0];
      person2 = shuffled[1];
      usedRegistration = true;
    }
  }

  if (!person1 || !person2) {
    const candidateMembers = registrationRequired
      ? registeredMembers
      : memberJids;
    const shuffled = candidateMembers.sort(() => Math.random() - 0.5);
    person1 = shuffled[0];
    person2 = shuffled[1];
  }

  const compatibility = Math.floor(Math.random() * 100) + 1;
  const quote = loveQuotes[Math.floor(Math.random() * loveQuotes.length)];

  const user1Data = allUsers[person1.replace(/@.+/g, "")];
  const user2Data = allUsers[person2.replace(/@.+/g, "")];

  let label1 = "👨";
  let label2 = "👩";
  let name1 = `@${person1.split("@")[0]}`;
  let name2 = `@${person2.split("@")[0]}`;

  if (user1Data?.regGender === "Laki-laki") label1 = "👨";
  else if (user1Data?.regGender === "Perempuan") label1 = "👩";
  else label1 = Math.random() > 0.5 ? "👨" : "👩";

  if (user2Data?.regGender === "Laki-laki") label2 = "👨";
  else if (user2Data?.regGender === "Perempuan") label2 = "👩";
  else label2 = label1 === "👨" ? "👩" : "👨";

  if (user1Data?.regName)
    name1 = `*${user1Data.regName}* (@${person1.split("@")[0]})`;
  if (user2Data?.regName)
    name2 = `*${user2Data.regName}* (@${person2.split("@")[0]})`;

  const progressBar = (() => {
    const filled = Math.floor(compatibility / 10);
    const empty = 10 - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  })();

  const rows = [
    `│ • ${label1} ${name1}`,
    "│ • ❤️",
    `│ • ${label2} ${name2}`,
    // FIX OWNER 2026-09-07: bar kecocokan dikasih jarak biar gak dempet
    `│ • 💯 Kecocokan :`,
    `│`,
    `│ ${progressBar} ${compatibility}%`,
    `│`,
    `│ • ${compatibilityEmoji(compatibility)} Status : ${compatibilityText(compatibility)}`,
  ];
  if (usedRegistration) {
    rows.push("│ • 📋 Dijodohkan berdasarkan data registrasi");
  }
  if (registrationRequired) {
    rows.push("│ • 🔒 Mode wajib daftar, hanya member terdaftar yang dipilih");
  }
  rows.push(`│ • 💬 "${quote}"`);

  await m.react("🐣");
  await m.reply(novaGameBox({
    title: "jodoh random", icon: "💘",
    flavor: "💘 *JODOH RANDOM DIPILIH!*",
    body: rows.join("\n"),
    cta: gameCTA("jodoh"),
  }), { mentions: [person1, person2] });
}

export { pluginConfig as config, handler };
