// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "couple",
  alias: ["couple", "couplestatus", "statuscouple"],
  category: "rpg",
  description: "Lihat status pasangan RPG kamu",
  usage: ".couple",
  example: ".couple",
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
    const rpg = db.getUser(m.sender)?.rpg || {};
    const partner = rpg.partner || null;

    if (!partner) {
      const text =
        claraWrap("Couple", ["◦ Kamu belum memiliki pasangan!",
          "",
          `◦ Cara 1: *${prefix}marry @member*`,
          `◦ Cara 2: *${prefix}propose @member*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "couple");
      return { handled: true };
    }

    const text =
      claraWrap("Couple", [`◦ Kamu: *${m.pushName || "Player"}*`,
        `◦ Pasangan: *${partner}*`,
        `◦ Status: *Married*`,
        "◦ Bonus: *+5% EXP*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "couple");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("couple", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
