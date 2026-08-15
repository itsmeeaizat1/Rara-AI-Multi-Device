// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "kiss",
  alias: ["cium", "kissme", "kisspasangan"],
  category: "rpg",
  description: "Cium pasangan, cooldown 1 jam biar spesial",
  usage: ".kiss",
  example: ".kiss",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const KISS_MESSAGES = [
  "{user} mencium {partner} pelan di pipi... manis banget!",
  "{user} kasih kiss ke {partner}, bikin semua orang iri!",
  "{user} nyium {partner} di dahi... penuh kasih sayang",
  "{user} cium {partner} tiba-tiba, bikin {partner} merona!",
  "Ciuman dari {user} ke {partner} berlangsung lama... romantis!",
  "{user} kecup {partner} di pipi kanan dan kiri, dongo liatnya",
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
        claraWrap("Kiss", [`◦ Status: *Belum punya pasangan*`,
          `◦ Nyium siapa? Angin?`].join("\n")) + "\n" +
        tipText(`Ketik ${prefix}jadian @target untuk punya pasangan`);

      await sendReplyWithNav(sock, m, text, "kiss");
      return { handled: true };
    }

    const partner = db.getUser(partnerJid);
    const partnerName = partner?.name || partnerJid.split("@")[0];
    const userName = m.pushName || user?.name || "Player";

    // Cooldown 1 jam — kiss itu spesial
    const cd = db.checkCooldown(m.sender, "kiss", 3600);
    if (cd) {
      const mins = Math.floor(cd / 60);
      const text =
        claraWrap("Kiss", [`◦ Status: *Masih cooldown*`,
          `◦ Tunggu: *${mins} menit lagi*`,
          `◦ Ciuman itu spesial, jangan buru-buru`].join("\n")) + "\n" +
        tipText(`Sabar ya, 1 jam sekali biar spesial`);

      await sendReplyWithNav(sock, m, text, "kiss");
      return { handled: true };
    }

    const msg = KISS_MESSAGES[Math.floor(Math.random() * KISS_MESSAGES.length)]
      .replace(/{user}/g, userName)
      .replace(/{partner}/g, partnerName);

    // Kiss kasih affection lebih besar dari cuddle
    const affectionGain = Math.floor(Math.random() * 10) + 15; // 15-25
    rpg.affection = (rpg.affection || 0) + affectionGain;
    rpg.kissCount = (rpg.kissCount || 0) + 1;
    db.setUser(m.sender, { rpg });

    const partnerRpg = partner?.rpg || {};
    partnerRpg.affection = (partnerRpg.affection || 0) + affectionGain;
    db.setUser(partnerJid, { rpg: partnerRpg });
    db.save();

    db.setCooldown(m.sender, "kiss", 3600);

    const totalAffection = rpg.affection;
    const bondLevel = Math.floor(totalAffection / 100) + 1;

    const text =
      claraWrap("Kiss", [`◦ ${msg}`,
        `◦ Affection: *+${affectionGain}*`,
        `◦ Total Affection: *${totalAffection}*`,
        `◦ Bond Level: *${bondLevel}*`,
        `◦ Total Kiss: *${rpg.kissCount}*`].join("\n")) + "\n" +
      tipText(`Cium lagi dalam 1 jam ya ${prefix}kiss`);

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

    await m.reply(claraWrap("kiss", text));
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
