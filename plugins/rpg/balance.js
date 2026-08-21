// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer } from "../../src/lib/nova-rpg-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "balance",
  alias: ["bal", "gold", "dompet", "uang", "balance"],
  category: "economy",
  description: "Cek saldo gold kamu",
  usage: ".balance",
  example: ".balance",
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
    const player = getPlayer(m) || {};

    const balance = player.gold || 0;
    const bank = 0;

    const text =
      claraWrap("Balance", [`  ┊  ➶ Dompet: *${balance} Gold*`,
        `  ┊  ➶ Bank: *${bank} Gold*`,
        `  ┊  ➶ Total: *${balance + bank} Gold*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "balance");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("balance", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
