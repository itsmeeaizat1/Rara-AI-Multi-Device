// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Cinta — Couple War (Duel pasangan vs pasangan lain)

import { ensureRpg, getRpgData, addExp, addGold } from "../../src/lib/nova-rpg-service.js";
import {
  getCintaData, getCouplePower, getLovePower, addAffection,
  WAR_COOLDOWN_HOURS, formatDurasi
} from "../../src/lib/nova-rpg-cinta.js";
import { checkCooldown } from "../../src/lib/nova-rpg-service.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "couplewar",
  alias: ["cwar", "couplewarmatch", "duelpasangan"],
  category: "rpg",
  description: "Duel couple vs couple lain di grup",
  usage: ".couplewar @target",
  example: ".couplewar @628xxx",
  isOwner: false,
  isPremium: true,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const db = getDatabase();
    ensureRpg(m, m.pushName || "Player");
    const myCinta = getCintaData(m);

    if (!myCinta.spouse) {
      return m.reply(
        `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ *ᴄᴏᴜᴘʟᴇ ᴡᴀʀ*\n\n` +
        `  ┊ ➶ 💔 Kamu belum punya pasangan!\n` +
        `  ┊ ➶ Jomblo mau war sama siapa? 😂\n\n` +
        `❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`
      );
    }

    let targetJid = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
    if (!targetJid) {
      return m.reply(
        `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
        `  ┊ ➶ \`${m.prefix}couplewar @target\`\n` +
        `  ┊ ➶ Tag salah satu pasangan lawan\n\n` +
        `❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`
      );
    }

    if (targetJid === m.sender) {
      return m.reply(
        `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ *ᴄᴏᴜᴘʟᴇ ᴡᴀʀ*\n\n` +
        `  ┊ ➶ ❌ War sama diri sendiri? Itu skizofrenia 😂\n\n` +
        `❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`
      );
    }

    if (targetJid === myCinta.spouse) {
      return m.reply(
        `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ *ᴄᴏᴜᴘʟᴇ ᴡᴀʀ*\n\n` +
        `  ┊ ➶ ❌ Nggak bisa war sama pasangan sendiri! 😅\n\n` +
        `❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`
      );
    }

    ensureRpg({ sender: targetJid, pushName: targetJid.split("@")[0] }, targetJid.split("@")[0]);
    const targetCinta = getCintaData({ sender: targetJid, pushName: targetJid.split("@")[0] });

    if (!targetCinta.spouse) {
      return m.reply(
        `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ *ᴄᴏᴜᴘʟᴇ ᴡᴀʀ*\n\n` +
        `  ┊ ➶ 💔 @${targetJid.split("@")[0]} belum punya pasangan!\n` +
        `  ┊ ➶ Jomblo vs jomblo namanya duel bukan couple war 😂\n\n` +
        `❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`
      );
    }

    // Cooldown check
    const cd = checkCooldown(m, "couplewar");
    if (cd) {
      return m.reply(
        `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ *ᴄᴏᴜᴘʟᴇ ᴡᴀʀ*\n\n` +
        `  ┊ ➶ ⏳ Cooldown: *${formatDurasi(cd)}* lagi\n\n` +
        `❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`
      );
    }

    // Get couple powers
    const myName = m.pushName || m.sender.split("@")[0];
    const myPartnerName = myCinta.spouseName || myCinta.spouse.split("@")[0];
    const targetName = (db.getUser(targetJid)?.name) || targetJid.split("@")[0];
    const targetPartnerName = targetCinta.spouseName || targetCinta.spouse.split("@")[0];

    const myCouplePower = getCouplePower(m);
    const targetCouplePower = getCouplePower({ sender: targetJid, pushName: targetName });

    // Random factor (battle element)
    const myRoll = Math.floor(Math.random() * 100);
    const targetRoll = Math.floor(Math.random() * 100);
    const myFinalPower = myCouplePower + myRoll;
    const targetFinalPower = targetCouplePower + targetRoll;
    const iWin = myFinalPower >= targetFinalPower;
    const powerDiff = Math.abs(myFinalPower - targetFinalPower);

    // Rewards
    const winAff = Math.floor(powerDiff * 0.1) + 30;
    const winExp = Math.floor(Math.random() * 30) + 50;
    const winGold = Math.floor(Math.random() * 80) + 100;
    const lossAff = -(Math.floor(Math.random() * 5) + 10);
    const lossExp = Math.floor(Math.random() * 10) + 15;
    const lossGold = Math.floor(Math.random() * 20) + 20;

    if (iWin) {
      // Team 1 wins
      addAffection(m, winAff);
      addAffection({ sender: myCinta.spouse, pushName: myPartnerName }, winAff);
      addExp(m, winExp);
      addExp({ sender: myCinta.spouse, pushName: myPartnerName }, winExp);
      addGold(m, winGold);
      addGold({ sender: myCinta.spouse, pushName: myPartnerName }, winGold);

      addAffection({ sender: targetJid, pushName: targetName }, lossAff);
      addAffection({ sender: targetCinta.spouse, pushName: targetPartnerName }, lossAff);
      addExp({ sender: targetJid, pushName: targetName }, lossExp);
      addGold({ sender: targetJid, pushName: targetName }, lossGold);

      const myC = getCintaData(m);
      myC.warWin = (myC.warWin || 0) + 1;
      const myRpg = getRpgData(m);
      myRpg.cinta = myC;
      db.setUser(m.sender, myRpg);

      const tC = getCintaData({ sender: targetJid, pushName: targetName });
      tC.warLose = (tC.warLose || 0) + 1;
      const tRpg = getRpgData({ sender: targetJid, pushName: targetName });
      tRpg.cinta = tC;
      db.setUser(targetJid, tRpg);
      db.save();
    } else {
      // Team 2 wins
      addAffection({ sender: targetJid, pushName: targetName }, winAff);
      addAffection({ sender: targetCinta.spouse, pushName: targetPartnerName }, winAff);
      addExp({ sender: targetJid, pushName: targetName }, winExp);
      addExp({ sender: targetCinta.spouse, pushName: targetPartnerName }, winExp);
      addGold({ sender: targetJid, pushName: targetName }, winGold);
      addGold({ sender: targetCinta.spouse, pushName: targetPartnerName }, winGold);

      addAffection(m, lossAff);
      addAffection({ sender: myCinta.spouse, pushName: myPartnerName }, lossAff);
      addExp(m, lossExp);
      addGold(m, lossGold);

      const tC = getCintaData({ sender: targetJid, pushName: targetName });
      tC.warWin = (tC.warWin || 0) + 1;
      const tRpg = getRpgData({ sender: targetJid, pushName: targetName });
      tRpg.cinta = tC;
      db.setUser(targetJid, tRpg);

      const myC = getCintaData(m);
      myC.warLose = (myC.warLose || 0) + 1;
      const myRpg = getRpgData(m);
      myRpg.cinta = myC;
      db.setUser(m.sender, myRpg);
      db.save();
    }

    const winnerTeam = iWin ? `${myName} & ${myPartnerName}` : `${targetName} & ${targetPartnerName}`;
    const loserTeam = iWin ? `${targetName} & ${targetPartnerName}` : `${myName} & ${myPartnerName}`;

    let msg = `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ *ᴄᴏᴜᴘʟᴇ ᴡᴀʀ ⚔️*\n\n`;
    msg += `  🏠 *Team 1: ${myName} & ${myPartnerName}*\n`;
    msg += `  ┊ ➶ ⚔️ Couple Power: *${myCouplePower}*\n`;
    msg += `  ┊ ➶ 🎲 Roll: *+${myRoll}*\n`;
    msg += `  ┊ ➶ 💥 Final Power: *${myFinalPower}*\n\n`;
    msg += `  🏠 *Team 2: ${targetName} & ${targetPartnerName}*\n`;
    msg += `  ┊ ➶ ⚔️ Couple Power: *${targetCouplePower}*\n`;
    msg += `  ┊ ➶ 🎲 Roll: *+${targetRoll}*\n`;
    msg += `  ┊ ➶ 💥 Final Power: *${targetFinalPower}*\n\n`;
    msg += `  🏆 *Pemenang: ${winnerTeam}*\n`;
    msg += `  ┊ ➶ 💕 Affection: *+${winAff}*\n`;
    msg += `  ┊ ➶ ✨ EXP: *+${winExp}*\n`;
    msg += `  ┊ ➶ 💰 Gold: *+${winGold}*\n`;
    msg += `  ┊ ➶ 📊 Power Gap: *${powerDiff}*\n\n`;
    msg += `  💀 *Kalah: ${loserTeam}*\n`;
    msg += `  ┊ ➶ 💕 Affection: *${lossAff}*\n`;
    msg += `  ┊ ➶ ✨ EXP: *+${lossExp}*\n`;
    msg += `  ┊ ➶ 💰 Gold: *+${lossGold}*\n\n`;
    msg += `❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;

    await m.reply(msg);
    await m.react(iWin ? "🏆" : "💥");
  } catch (e) {
    console.error("[couplewar] Error:", e.message);
    try { await m.react("❌"); } catch {}
  }
}

export { pluginConfig as config, handler };
