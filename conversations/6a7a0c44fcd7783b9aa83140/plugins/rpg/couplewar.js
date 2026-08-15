import { 
  separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "couplewar",
  alias: ["cwar", "war couple", "duelpasangan"],
  category: "rpg",
  description: "Duel pasangan vs pasangan lain di grup",
  usage: ".couplewar @target_pasangan",
  example: ".couplewar @628xxx",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const user = db.getUser(m.sender);
    const rpg = user?.rpg || {};
    const myPartner = rpg.spouse || rpg.dating;
    const target = m.mentionedJid?.[0];

    if (!myPartner) {
      const text =
        claraWrap("Couple War", [`◦ Status: *Belum punya pasangan*`,
          `◦ Mau perang sama siapa? Jomblo kok adu pasangan?`].join("\n")) + "\n" +
        tipText(`Ketik ${prefix}jadian @target untuk punya pasangan`);

      await sendReplyWithNav(sock, m, text, "couplewar");
      return { handled: true };
    }

    if (!target) {
      const text =
        claraWrap("Couple War", [`◦ Cara pakai: *${prefix}couplewar @target*`,
          `◦ Tag salah satu pasangan lawan`,
          `◦ Pasanganmu vs Pasangan lawan`,
          `◦ Pemenang dapat affection + exp + gold`,
          `◦ Kalah juga dapat consolation prize`].join("\n")) + "\n" +
        tipText(`Tag pasangan yang mau diwar`);

      await sendReplyWithNav(sock, m, text, "couplewar");
      return { handled: true };
    }

    if (target === m.sender) {
      const text =
        claraWrap("Couple War", [`◦ Status: *War diri sendiri?*`,
          `◦ Itu namanya skizofrenia bukan perang`].join("\n")) + "\n" +
        tipText(`Tag orang lain`);

      await sendReplyWithNav(sock, m, text, "couplewar");
      return { handled: true };
    }

    // Cooldown 1 jam
    const cd = db.checkCooldown(m.sender, "couplewar", 3600);
    if (cd) {
      const mins = Math.floor(cd / 60);
      const text =
        claraWrap("Couple War", [`◦ Status: *Masih cooldown*`,
          `◦ Tunggu: *${mins} menit lagi*`,
          `◦ Jangan terlalu sering perang, capek lho`].join("\n")) + "\n" +
        tipText(`Tunggu sebentar ya`);

      await sendReplyWithNav(sock, m, text, "couplewar");
      return { handled: true };
    }

    const targetUser = db.getUser(target);
    const targetRpg = targetUser?.rpg || {};
    const targetPartner = targetRpg.spouse || targetRpg.dating;

    if (!targetPartner) {
      const text =
        claraWrap("Couple War", [`◦ Target: *${targetUser?.name || target.split("@")[0]}*`,
          `◦ Status: *Jomblo! Tidak punya pasangan*`,
          `◦ Ngga bisa war pasangan kalau lawan jomblo!`].join("\n")) + "\n" +
        tipText(`Tag orang yang punya pasangan`);

      await sendReplyWithNav(sock, m, text, "couplewar");
      return { handled: true };
    }

    const myName = m.pushName || user?.name || "Player";
    const myPartnerName = db.getUser(myPartner)?.name || myPartner.split("@")[0];
    const targetName = targetUser?.name || target.split("@")[0];
    const targetPartnerName = db.getUser(targetPartner)?.name || targetPartner.split("@")[0];

    // Hitung power berdasarkan affection + exp + level
    const myAffection = rpg.affection || 0;
    const myExp = rpg.exp || 0;
    const myLevel = rpg.level || 1;
    const myPower = myAffection + myExp + (myLevel * 50) + Math.floor(Math.random() * 100);

    const targetAffection = targetRpg.affection || 0;
    const targetExp = targetRpg.exp || 0;
    const targetLevel = targetRpg.level || 1;
    const targetPower = targetAffection + targetExp + (targetLevel * 50) + Math.floor(Math.random() * 100);

    const iWin = myPower >= targetPower;
    const powerDiff = Math.abs(myPower - targetPower);

    let winAffection, winExp, winGold, lossAffection, lossExp, lossGold;

    if (iWin) {
      winAffection = Math.floor(powerDiff * 0.1) + 20;
      winExp = Math.floor(Math.random() * 30) + 50;
      winGold = Math.floor(Math.random() * 80) + 100;

      lossAffection = -(Math.floor(Math.random() * 5) + 5);
      lossExp = Math.floor(Math.random() * 10) + 10;
      lossGold = Math.floor(Math.random() * 20) + 20;

      // Apply ke kita (menang)
      rpg.affection = Math.max(0, (rpg.affection || 0) + winAffection);
      rpg.exp = (rpg.exp || 0) + winExp;
      rpg.koin = (rpg.koin || 0) + winGold;
      rpg.warWin = (rpg.warWin || 0) + 1;
      db.setUser(m.sender, { rpg });

      const partnerRpg = db.getUser(myPartner)?.rpg || {};
      partnerRpg.affection = (partnerRpg.affection || 0) + winAffection;
      partnerRpg.exp = (partnerRpg.exp || 0) + winExp;
      partnerRpg.koin = (partnerRpg.koin || 0) + winGold;
      db.setUser(myPartner, { rpg: partnerRpg });

      // Apply ke lawan (kalah)
      targetRpg.affection = Math.max(0, (targetRpg.affection || 0) + lossAffection);
      targetRpg.exp = (targetRpg.exp || 0) + lossExp;
      targetRpg.koin = (targetRpg.koin || 0) + lossGold;
      targetRpg.warLose = (targetRpg.warLose || 0) + 1;
      db.setUser(target, { rpg: targetRpg });

      const targetPartnerRpg = db.getUser(targetPartner)?.rpg || {};
      targetPartnerRpg.affection = Math.max(0, (targetPartnerRpg.affection || 0) + lossAffection);
      targetPartnerRpg.exp = (targetPartnerRpg.exp || 0) + lossExp;
      targetPartnerRpg.koin = (targetPartnerRpg.koin || 0) + lossGold;
      db.setUser(targetPartner, { rpg: targetPartnerRpg });
    } else {
      // Lawan menang
      winAffection = Math.floor(powerDiff * 0.1) + 20;
      winExp = Math.floor(Math.random() * 30) + 50;
      winGold = Math.floor(Math.random() * 80) + 100;

      lossAffection = -(Math.floor(Math.random() * 5) + 5);
      lossExp = Math.floor(Math.random() * 10) + 10;
      lossGold = Math.floor(Math.random() * 20) + 20;

      rpg.affection = Math.max(0, (rpg.affection || 0) + lossAffection);
      rpg.exp = (rpg.exp || 0) + lossExp;
      rpg.koin = (rpg.koin || 0) + lossGold;
      rpg.warLose = (rpg.warLose || 0) + 1;
      db.setUser(m.sender, { rpg });

      const partnerRpg = db.getUser(myPartner)?.rpg || {};
      partnerRpg.affection = Math.max(0, (partnerRpg.affection || 0) + lossAffection);
      partnerRpg.exp = (partnerRpg.exp || 0) + lossExp;
      partnerRpg.koin = (partnerRpg.koin || 0) + lossGold;
      db.setUser(myPartner, { rpg: partnerRpg });

      targetRpg.affection = (targetRpg.affection || 0) + winAffection;
      targetRpg.exp = (targetRpg.exp || 0) + winExp;
      targetRpg.koin = (targetRpg.koin || 0) + winGold;
      targetRpg.warWin = (targetRpg.warWin || 0) + 1;
      db.setUser(target, { rpg: targetRpg });

      const targetPartnerRpg = db.getUser(targetPartner)?.rpg || {};
      targetPartnerRpg.affection = (targetPartnerRpg.affection || 0) + winAffection;
      targetPartnerRpg.exp = (targetPartnerRpg.exp || 0) + winExp;
      targetPartnerRpg.koin = (targetPartnerRpg.koin || 0) + winGold;
      db.setUser(targetPartner, { rpg: targetPartnerRpg });
      db.save();
    }

    db.setCooldown(m.sender, "couplewar", 3600);

    const winnerTeam = iWin
      ? `${myName} & ${myPartnerName}`
      : `${targetName} & ${targetPartnerName}`;
    const winnerAff = iWin ? winAffection : winAffection;
    const winnerExp = iWin ? winExp : winExp;
    const winnerGold = iWin ? winGold : winGold;

    const text =
      claraWrap("Couple War", [`◦ Team 1: *${myName} & ${myPartnerName}*`,
        `◦ Power: *${myPower}*`,
        `◦ Team 2: *${targetName} & ${targetPartnerName}*`,
        `◦ Power: *${targetPower}*`].join("\n")) + "\n\n" +
      claraWrap("pemenang", [`◦ Pemenang: *${winnerTeam}*`, `◦ Affection: *+${winnerAff}*`, `◦ EXP: *+${winnerExp}*`, `◦ Gold: *+${winnerGold}*`, `◦ Power Gap: *${powerDiff}*`].join("\n")) + "\n\n" +
      separator("━", 22) + "\n" +
      tipText(`War lagi 1 jam lagi ${prefix}couplewar @target`);

    await sock.sendMessage(m.chat, {
      text,
      mentions: [m.sender, myPartner, target, targetPartner],
    });

    return { handled: true };
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) + "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("couplewar", text));
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
