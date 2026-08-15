// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "sayang",
  alias: ["sayangpasangan", "iloveyou", "ily"],
  category: "rpg",
  description: "Ucapin sayang ke pasangan, streak harian",
  usage: ".sayang",
  example: ".sayang",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const SAYANG_MESSAGES = [
  "Sayang banget sama {partner}, gak bisa bayangin hidup tanpa {partner}",
  "{user} ngomong: 'I love you {partner}, more than anything!'",
  "{user} bilang: 'Kamu itu segalanya buat aku, {partner}'",
  "{user} nulis di status: 'Hanya {partner} yang isi hatiku'",
  "{user} bisik ke {partner}: 'I miss you, jangan pergi ya'",
  "{user} ngucap: 'Setiap hari sama {partner} itu berkah banget'",
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const user = db.getUser(m.sender);
    const rpg = user?.rpg || {};
    const partnerJid = rpg.spouse || rpg.dating;

    if (!partnerJid) {
      const text =
        claraWrap("Sayang", [`◦ Status: *Belum punya pasangan*`,
          `◦ Mau bilang sayang ke siapa? Ke bot?`].join("\n")) + "\n" +
        tipText(`Ketik ${prefix}jadian @target untuk punya pasangan`);

      await sendReplyWithNav(sock, m, text, "sayang");
      return { handled: true };
    }

    const partner = db.getUser(partnerJid);
    const partnerName = partner?.name || partnerJid.split("@")[0];
    const userName = m.pushName || user?.name || "Player";

    // Streak system — reset kalau lewat 1 hari
    const now = Date.now();
    const lastSayang = rpg.sayangLastAt || 0;
    const oneDay = 86400000;
    const elapsed = now - lastSayang;

    let streakBroken = false;
    if (lastSayang === 0) {
      rpg.sayangStreak = 1;
    } else if (elapsed > oneDay * 2) {
      rpg.sayangStreak = 1;
      streakBroken = true;
    } else if (elapsed >= oneDay) {
      rpg.sayangStreak = (rpg.sayangStreak || 0) + 1;
    } else {
      const text =
        claraWrap("Sayang", [`◦ Status: *Sudah ucap sayang hari ini*`,
          `◦ Streak: *${rpg.sayangStreak || 1} hari*`,
          `◦ Tunggu besok untuk lanjut streak`].join("\n")) + "\n" +
        tipText(`Ucap lagi besok ya ${prefix}sayang`);

      await sendReplyWithNav(sock, m, text, "sayang");
      return { handled: true };
    }

    rpg.sayangLastAt = now;
    db.setUser(m.sender, { rpg });

    // Affection bonus berdasarkan streak
    const streakBonus = Math.min((rpg.sayangStreak || 1) * 3, 30);
    const affectionGain = 5 + streakBonus;
    rpg.affection = (rpg.affection || 0) + affectionGain;
    db.setUser(m.sender, { rpg });

    const partnerRpg = partner?.rpg || {};
    partnerRpg.affection = (partnerRpg.affection || 0) + affectionGain;
    db.setUser(partnerJid, { rpg: partnerRpg });
    db.save();

    const msg = SAYANG_MESSAGES[Math.floor(Math.random() * SAYANG_MESSAGES.length)]
      .replace(/{user}/g, userName)
      .replace(/{partner}/g, partnerName);

    let streakInfo = `◦ Streak: *${rpg.sayangStreak} hari*`;
    if (streakBroken) {
      streakInfo = `◦ Streak: *${rpg.sayangStreak} hari* (reset!)`;
    } else if ((rpg.sayangStreak || 0) >= 7) {
      streakInfo = `◦ Streak: *${rpg.sayangStreak} hari* (on fire!)`;
    }

    const text =
      claraWrap("Sayang", [`◦ ${msg}`,
        `◦ Affection: *+${affectionGain}*`,
        streakInfo,
        `◦ Streak Bonus: *+${streakBonus}*`].join("\n")) + "\n" +
      tipText(`Ucap lagi besok ya ${prefix}sayang biar streak nggak putus`);

    await sock.sendMessage(m.chat, {
      text,
      mentions: [m.sender, partnerJid],
    });

    return { handled: true };
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) + "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("sayang", text));
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
