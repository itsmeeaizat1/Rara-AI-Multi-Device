import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "kado",
  alias: ["kadopasangan", "giftlove", "lovegift"],
  category: "rpg",
  description: "Kasih kado ke pasangan (pilih item dari inventory)",
  usage: ".kado <nama item>",
  example: ".kado Potion",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

// Kado affection bonus per item rarity
const KADO_VALUE = {
  potion: 10,
  sword: 25,
  shield: 20,
  bow: 22,
  armor: 30,
  ring: 50,
  flower: 15,
  chocolate: 20,
  gem: 40,
  crystal: 45,
  feather: 8,
  scale: 35,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const user = db.getUser(m.sender);
    const rpg = user?.rpg || {};
    const partnerJid = rpg.spouse || rpg.dating;
    const args = m.body?.replace(/^[!.#]\S+\s*/, "").trim();

    if (!partnerJid) {
      const text =
        claraWrap("Kado", [`◦ Status: *Belum punya pasangan*`,
          `◦ Kasih kado ke siapa? Ke bot?`].join("\n")) + "\n" +
        tipText(`Ketik ${prefix}jadian @target untuk punya pasangan`);

      await sendReplyWithNav(sock, m, text, "kado");
      return { handled: true };
    }

    if (!args) {
      const text =
        claraWrap("Kado", [`◦ Cara pakai: *${prefix}kado <nama item>*`,
          `◦ Contoh: *${prefix}kado Potion*`,
          `◦ Contoh: *${prefix}kado Flower*`,
          `◦ Kasih item dari inventory ke pasangan`,
          `◦ Dapat affection bonus sesuai item`].join("\n")) + "\n" +
        tipText(`Cek inventory: ${prefix}inventory`);

      await sendReplyWithNav(sock, m, text, "kado");
      return { handled: true };
    }

    const partner = db.getUser(partnerJid);
    const partnerName = partner?.name || partnerJid.split("@")[0];
    const userName = m.pushName || user?.name || "Player";
    const inventory = user.inventory || {};

    // Cari item di inventory (case insensitive)
    const itemName = Object.keys(inventory).find(
      (k) => k.toLowerCase() === args.toLowerCase()
    );

    if (!itemName || (inventory[itemName] || 0) <= 0) {
      const text =
        claraWrap("Kado", [`◦ Status: *Item tidak ada*`,
          `◦ Item: *${args}*`,
          `◦ Cek inventory kamu dulu ya`].join("\n")) + "\n" +
        tipText(`Ketik ${prefix}inventory untuk cek item`);

      await sendReplyWithNav(sock, m, text, "kado");
      return { handled: true };
    }

    // Kurangi item dari pengirim
    inventory[itemName] = (inventory[itemName] || 0) - 1;
    if (inventory[itemName] <= 0) delete inventory[itemName];
    db.setUser(m.sender, { inventory });

    // Tambah item ke pasangan
    const partnerInv = partner?.inventory || {};
    partnerInv[itemName] = (partnerInv[itemName] || 0) + 1;
    db.setUser(partnerJid, { inventory: partnerInv });

    // Affection bonus
    const itemValue = KADO_VALUE[itemName.toLowerCase()] || 5;
    const affectionGain = itemValue + Math.floor(Math.random() * 5);
    rpg.affection = (rpg.affection || 0) + affectionGain;
    rpg.giftCount = (rpg.giftCount || 0) + 1;
    db.setUser(m.sender, { rpg });

    const partnerRpg = partner?.rpg || {};
    partnerRpg.affection = (partnerRpg.affection || 0) + affectionGain;
    db.setUser(partnerJid, { rpg: partnerRpg });
    db.save();

    const totalAffection = rpg.affection;
    const bondLevel = Math.floor(totalAffection / 100) + 1;

    const text =
      claraWrap("Kado", [`◦ Dari: *${userName}*`,
        `◦ Untuk: *${partnerName}*`,
        `◦ Item: *${itemName}*`,
        `◦ Affection: *+${affectionGain}*`,
        `◦ Total Affection: *${totalAffection}*`,
        `◦ Bond Level: *${bondLevel}*`,
        `◦ Total Kado: *${rpg.giftCount}*`].join("\n")) + "\n" +
      tipText(`Kasih kado lagi ${prefix}kado <item>`);

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

    await m.reply(claraWrap("kado", text));
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
