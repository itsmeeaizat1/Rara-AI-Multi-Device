// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "cuddling",
  alias: ["peluk", "hug", "cuddle"],
  category: "rpg",
  description: "Peluk pasangan, +affection points",
  usage: ".cuddling",
  example: ".cuddling",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const CUDDLE_MESSAGES = [
  "{user} memeluk {partner} dengan erat... hangat banget!",
  "{user} nyangkul {partner} dari belakang, bikin baper!",
  "{user} meluk {partner} sambil bisikin 'jangan kemana-mana ya'",
  "{user} nyangkul {partner} sampai keduanya bungkam",
  "{user} memeluk {partner} pelan-pelan, penuh kasih sayang",
  "{user} ngeluk {partner} erat banget sampai {partner} susah napas",
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
        claraWrap("Cuddling", [`◦ Status: *Belum punya pasangan*`,
          `◦ Kamu jomblo, mau peluk siapa?`].join("\n")) + "\n" +
        tipText(`Ketik ${prefix}jadian @target untuk nembak seseorang`);

      await sendReplyWithNav(sock, m, text, "cuddling");
      return { handled: true };
    }

    const partner = db.getUser(partnerJid);
    const partnerName = partner?.name || partnerJid.split("@")[0];
    const userName = m.pushName || user?.name || "Player";

    const cd = db.checkCooldown(m.sender, "cuddling", 600);
    if (cd) {
      const text =
        claraWrap("Cuddling", [`◦ Status: *Masih cooldown*`,
          `◦ Tunggu: *${cd} detik lagi*`,
          `◦ Pelukan terlalu sering bikin pesimis lho`].join("\n")) + "\n" +
        tipText(`Sabar ya, kasih pasangan napas dulu`);

      await sendReplyWithNav(sock, m, text, "cuddling");
      return { handled: true };
    }

    const msg = CUDDLE_MESSAGES[Math.floor(Math.random() * CUDDLE_MESSAGES.length)]
      .replace(/{user}/g, userName)
      .replace(/{partner}/g, partnerName);

    const affectionGain = Math.floor(Math.random() * 5) + 5;
    rpg.affection = (rpg.affection || 0) + affectionGain;
    db.setUser(m.sender, { rpg });

    const partnerRpg = partner?.rpg || {};
    partnerRpg.affection = (partnerRpg.affection || 0) + affectionGain;
    db.setUser(partnerJid, { rpg: partnerRpg });
    db.save();

    db.setCooldown(m.sender, "cuddling", 600);

    const totalAffection = rpg.affection;
    const bondLevel = Math.floor(totalAffection / 100) + 1;

    const text =
      claraWrap("Cuddling", [`◦ ${msg}`,
        `◦ Affection: *+${affectionGain}*`,
        `◦ Total Affection: *${totalAffection}*`,
        `◦ Bond Level: *${bondLevel}*`].join("\n")) + "\n" +
      tipText(`Peluk lagi dalam 10 menit ya ${prefix}cuddling`);

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

    await m.reply(claraWrap("cuddling", text));
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
