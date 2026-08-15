// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "gift",
  alias: ["gift", "hadiahgift", "kadohadiah", "hadiahistimewa"],
  category: "rpg",
  description: "Beri hadiah ke pasangan untuk meningkatkan love",
  usage: ".gift <item> <jumlah>",
  example: ".gift diamond 1",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const user = db.getUser(m.sender);

    if (!user.rpg) user.rpg = {};

    if (!user.rpg.spouse) {
      const text = claraWrap("Belum Menikah", [
        "Kamu belum menikah!",
        `Nikah dulu dengan ${prefix}nikahmatch @user`
      ].join("\n"));
      await sendReplyWithNav(sock, m, text, "gift");
      return { handled: true };
    }

    const args = m.args || [];
    const itemKey = args[0]?.toLowerCase();
    const amount = parseInt(args[1]) || 1;

    if (!itemKey) {
      const text = claraWrap("Gift", [
        "Usage: " + prefix + "gift <item> <jumlah>",
        "Contoh: " + prefix + "gift diamond 1",
        "",
        "Pilih item dari inventory untuk diberikan ke pasangan"
      ].join("\n")) + "\n" + tipText("Item akan menambah love pasangan");
      await sendReplyWithNav(sock, m, text, "gift");
      return { handled: true };
    }

    user.inventory = user.inventory || {};

    if ((user.inventory[itemKey] || 0) < amount) {
      const text = claraWrap("Item Tidak Cukup", [
        "Item: " + itemKey,
        "Kamu punya: " + (user.inventory[itemKey] || 0),
        "Butuh: " + amount
      ].join("\n"));
      await sendReplyWithNav(sock, m, text, "gift");
      return { handled: true };
    }

    const spouseJid = user.rpg.spouse;
    const partner = db.getUser(spouseJid);

    if (!partner) {
      const text = claraWrap("Pasangan Tidak Ditemukan", [
        "Pasangan tidak ditemukan di database!"
      ].join("\n"));
      await sendReplyWithNav(sock, m, text, "gift");
      return { handled: true };
    }

    partner.inventory = partner.inventory || {};

    user.inventory[itemKey] -= amount;
    partner.inventory[itemKey] = (partner.inventory[itemKey] || 0) + amount;

    user.rpg.love = (user.rpg.love || 0) + amount * 10;
    if (!partner.rpg) partner.rpg = {};
    partner.rpg.love = (partner.rpg.love || 0) + amount * 10;

    db.setUser(m.sender, user);
    db.setUser(spouseJid, partner);
    db.save();

    const text = claraWrap("Gift Berhasil", [
      "Kamu memberikan " + amount + "x " + itemKey,
      "Untuk: @" + spouseJid.split("@")[0],
      "Love: +" + (amount * 10),
      "",
      "So sweet!"
    ].join("\n"));

    await sock.sendMessage(m.chat, {
      text: text,
      mentions: [spouseJid]
    });

    return { handled: true };
  } catch (error) {
    await m.reply("Error: " + error.message);
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
