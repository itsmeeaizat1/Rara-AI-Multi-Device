// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "heal",
  alias: ["healv2", "heal", "potionv2", "obatv2"],
  category: "game",
  description: "Sembuhkan HP kamu",
  usage: ".heal",
  example: ".heal",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig, db }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    const healAmount = 50;
    const maxHp = 100;
    const currentHp = 40;
    const newHp = Math.min(maxHp, currentHp + healAmount);

    const text =
      claraWrap("Heal", [`  ┊  ➶ Heal: *+${healAmount}*`,
        `  ┊  ➶ HP: *${newHp}/${maxHp}*`,
        "  ┊  ➶ Item: *Potion*",
        "  ┊  ➶ Status: *Berhasil*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}heal untuk sembuh lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "heal");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("heal", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
