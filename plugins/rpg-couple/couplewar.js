// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// RPG Cinta — Couple War (Duel pasangan vs pasangan lain)

import { ensureRpg, getRpgData, addExp, addGold } from "../../src/lib/rara-rpg-service.js";
import {
  getCintaData, getCouplePower, getLovePower, addAffection,
  WAR_COOLDOWN_HOURS, formatDurasi
} from "../../src/lib/rara-rpg-cinta.js";
import { checkCooldown } from "../../src/lib/rara-rpg-service.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraGameBox, gameCTA, raraRpgBox, raraRpgGuide } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "couplewar",
  alias: ["couplewar"],
  category: "rpg couple",
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
      return m.reply(raraRpgBox("Couple War", [
        "Kamu belum punya pasangan!",
        "Jomblo mau war sama siapa?",
      ], "warn"));
    }

    let targetJid = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
    if (!targetJid) {
      return m.reply(raraRpgGuide("couplewar", "Duel pasangan kamu vs pasangan orang lain!", `${m.prefix}couplewar @target`, "Tag salah satu pasangan lawan"));
    }

    if (targetJid === m.sender) {
      return m.reply(raraRpgBox("Couple War", "War sama diri sendiri? Itu skizofrenia", "error"));
    }

    if (targetJid === myCinta.spouse) {
      return m.reply(raraRpgBox("Couple War", "Nggak bisa war sama pasangan sendiri!", "error"));
    }

    ensureRpg({ sender: targetJid, pushName: targetJid.split("@")[0] }, targetJid.split("@")[0]);
    const targetCinta = getCintaData({ sender: targetJid, pushName: targetJid.split("@")[0] });

    if (!targetCinta.spouse) {
      return m.reply(raraRpgBox("Couple War", [
        `@${targetJid.split("@")[0]} belum punya pasangan!`,
        "Jomblo vs jomblo namanya duel bukan couple war",
      ], "warn"));
    }

    // Cooldown check
    const cd = checkCooldown(m, "couplewar");
    if (cd) {
      return m.reply(raraRpgBox("Couple War", `Cooldown: ${formatDurasi(cd)} lagi`, "warn"));
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

    await m.reply(raraGameBox({
      title: "rpg cinta", icon: "⚔️",
      flavor: iWin ? "🏆 *PASANGANMU MENANG!*" : "💥 *PASANGANMU KALAH!*",
      body: [
        `Team 1 : ${myName} & ${myPartnerName}`,
        `│ • Couple Power : ${myCouplePower} | Roll : +${myRoll} | Final : ${myFinalPower}`,
        "",
        `Team 2 : ${targetName} & ${targetPartnerName}`,
        `│ • Couple Power : ${targetCouplePower} | Roll : +${targetRoll} | Final : ${targetFinalPower}`,
        "",
        `│ • 🏆 Pemenang : ${winnerTeam}`,
        `│ • 💕 Affection : +${winAff} | ✨ EXP : +${winExp} | 💰 Gold : +${winGold}`,
        `│ • Kalah (${loserTeam}) : 💕 ${lossAff} | ✨ +${lossExp} | 💰 +${lossGold}`,
      ].join("\n"),
      cta: gameCTA("couplewar"),
    }));
    await m.react(iWin ? "🏆" : "💥");
  } catch (e) {
    console.error("[couplewar] Error:", e.message);
  }
}

export { pluginConfig as config, handler };
