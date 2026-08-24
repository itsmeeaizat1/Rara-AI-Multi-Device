// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import * as timeHelper from "../../src/lib/nova-time.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "terima",
  alias: ["terima"],
  category: "fun",
  description: "Menerima tembakan dari seseorang",
  usage: ".terima @tag",
  example: ".terima @628xxx",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const celebrationQuotes = [
  "Semoga langgeng sampai ke pelaminan! 💍",
  "Dari teman jadi cinta, indahnya! 💕",
  "Love is in the air! 💖",
  "Couple goals detected! 💑",
  "Jangan lupa undang pas nikah ya! 💒",
  "Selamat menempuh hidup berduaan! 🥰",
  "Chemistry-nya kuat banget! 🔥",
  "Match made in heaven! ✨",
];

async function handler(m, { sock }) {
  const db = getDatabase();

  let shooterJid = null;

  if (m.quoted) {
    shooterJid = m.quoted.sender;
  } else if (m.mentionedJid?.[0]) {
    shooterJid = m.mentionedJid[0];
  }

  if (!shooterJid) {
    const sessions = global.jadianSessions || {};
    const mySession = Object.entries(sessions).find(
      ([key, val]) => val.target === m.sender && val.chat === m.chat,
    );

    if (mySession) {
      shooterJid = mySession[1].shooter;
    }
  }

  if (!shooterJid) {
    return m.reply( `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
        `Reply pesan tembakan + \`${m.prefix}terima\`\n` +
        `Atau \`${m.prefix}terima @tag\``, "terima");
  }

  if (shooterJid === m.sender) {
    return m.reply(claraWrap("terima", `❌ *ɢᴀɢᴀʟ*\n\nTidak bisa menerima diri sendiri!`));
  }

  if (shooterJid === m.botNumber) {
    return m.reply(claraWrap("terima", `❌ *ɢᴀɢᴀʟ*\n\nBot tidak bisa pacaran!`));
  }

  let shooterData = db.getUser(shooterJid) || {};
  let myData = db.getUser(m.sender) || {};

  if (!shooterData.fun) shooterData.fun = {};
  if (!myData.fun) myData.fun = {};

  if (
    shooterData.fun.pasangan !== m.sender &&
    shooterData.fun.tembakTarget !== m.sender
  ) {
    return m.reply(claraWrap("terima", `❌ *ᴛɪᴅᴀᴋ ᴍᴇɴᴇᴍʙᴀᴋ*\n\n` +
        `@${shooterJid.split("@")[0]} tidak sedang menembakmu`));
  }

  shooterData.fun.pasangan = m.sender;
  shooterData.fun.jadiPacar = Date.now();
  delete shooterData.fun.tembakTarget;
  myData.fun.pasangan = shooterJid;
  myData.fun.jadiPacar = Date.now();

  if (!shooterData.fun.terimaCount) shooterData.fun.terimaCount = 0;
  shooterData.fun.terimaCount++;

  db.setUser(shooterJid, shooterData);
  db.setUser(m.sender, myData);
  db.save();

  const sessionKey = `${m.chat}_${m.sender}`;
  if (global.jadianSessions?.[sessionKey]) {
    delete global.jadianSessions[sessionKey];
  }

  const quote =
    celebrationQuotes[Math.floor(Math.random() * celebrationQuotes.length)];
  const dateStr = timeHelper.formatFull("dddd, DD MMMM YYYY");

  const ctx = saluranCtx();
  ctx.mentionedJid = [m.sender, shooterJid];

  await m.reply(claraWrap("terima", `💕 *WIDIHHHH, CIE CIE DITERIMA* @${shooterJid.split("@")[0]}\n\n` +
      `@${m.sender.split("@")[0]} dan @${shooterJid.split("@")[0]} resmi pacaran\n\n` +
      `Semoga langgeng dan bahagia 💍`));
}

export { pluginConfig as config, handler };
