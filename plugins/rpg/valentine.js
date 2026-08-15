// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "valentine",
  alias: ["valentineday", "vday", "cintasejati"],
  category: "rpg",
  description: "Event Valentine khusus pasangan, hadiah double affection",
  usage: ".valentine",
  example: ".valentine",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const user = db.getUser(m.sender);
    const rpg = user?.rpg || {};
    const partnerJid = rpg.spouse || rpg.dating;
    const now = Date.now();

    if (!partnerJid) {
      const text =
        claraWrap("Valentine", [`◦ Status: *Belum punya pasangan*`,
          `◦ Valentine tanpa pasangan? Ikut CP dulu ya`].join("\n")) + "\n" +
        tipText(`Ketik ${prefix}jadian @target untuk punya pasangan`);

      await sendReplyWithNav(sock, m, text, "valentine");
      return { handled: true };
    }

    // Cooldown 7 hari
    const lastValentine = rpg.lastValentine || 0;
    const cooldown = 7 * 86400000;

    if (lastValentine > 0 && (now - lastValentine) < cooldown) {
      const remaining = cooldown - (now - lastValentine);
      const daysLeft = Math.ceil(remaining / 86400000);
      const text =
        claraWrap("Valentine", [`◦ Status: *Sudah claim Valentine*`,
          `◦ Tunggu: *${daysLeft} hari lagi*`,
          `◦ Valentine event 1 minggu sekali!`].join("\n")) + "\n" +
        tipText(`Sambil nunggu: ${prefix}cuddling, ${prefix}kiss, ${prefix}sayang`);

      await sendReplyWithNav(sock, m, text, "valentine");
      return { handled: true };
    }

    const partner = db.getUser(partnerJid);
    const partnerName = partner?.name || partnerJid.split("@")[0];
    const userName = m.pushName || user?.name || "Player";
    const isMarried = !!rpg.spouse;
    const statusLabel = isMarried ? "Menikah" : "Pacaran";

    // Hadiah double affection
    const affectionGain = Math.floor(Math.random() * 30) + 50;
    const expBonus = Math.floor(Math.random() * 30) + 50;
    const goldBonus = Math.floor(Math.random() * 50) + 100;

    // Random Valentine gift
    const gifts = ["Rose Bouquet", "Chocolate Box", "Love Letter", "Teddy Bear", "Couple Ring", "Heart Pillow"];
    const gift = gifts[Math.floor(Math.random() * gifts.length)];

    rpg.affection = (rpg.affection || 0) + affectionGain;
    rpg.exp = (rpg.exp || 0) + expBonus;
    rpg.koin = (rpg.koin || 0) + goldBonus;
    rpg.lastValentine = now;
    rpg.valentineCount = (rpg.valentineCount || 0) + 1;
    db.setUser(m.sender, { rpg });

    const partnerRpg = partner?.rpg || {};
    partnerRpg.affection = (partnerRpg.affection || 0) + affectionGain;
    partnerRpg.exp = (partnerRpg.exp || 0) + expBonus;
    partnerRpg.koin = (partnerRpg.koin || 0) + goldBonus;
    partnerRpg.lastValentine = now;
    db.setUser(partnerJid, { rpg: partnerRpg });

    // Tambah gift ke inventory
    const inventory = user.inventory || {};
    inventory[gift] = (inventory[gift] || 0) + 1;
    db.setUser(m.sender, { inventory });

    const partnerInv = partner?.inventory || {};
    partnerInv[gift] = (partnerInv[gift] || 0) + 1;
    db.setUser(partnerJid, { inventory: partnerInv });
    db.save();

    const totalAffection = rpg.affection;
    const bondLevel = Math.floor(totalAffection / 100) + 1;

    const text =
      claraWrap("Valentine", [`◦ ${userName} & ${partnerName} merayakan Valentine!`,
        `◦ Status: *${statusLabel}*`,
        `◦ Gift: *${gift}* (berdua)`,
        `◦ Affection: *+${affectionGain}* (DOUBLE!)`,
        `◦ EXP: *+${expBonus}* (berdua)`,
        `◦ Gold: *+${goldBonus}* (berdua)`,
        `◦ Total Affection: *${totalAffection}*`,
        `◦ Bond Level: *${bondLevel}*`,
        `◦ Total Valentine: *${rpg.valentineCount}*`].join("\n")) + "\n" +
      tipText(`Valentine lagi minggu depan ${prefix}valentine`);

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

    await m.reply(claraWrap("valentine", text));
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
