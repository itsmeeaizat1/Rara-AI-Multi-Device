// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { claraHeader,
    separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "gamble",
  alias: ["bet", "taruhan", "judi", "roulette", "slot"],
  category: "game",
  description: "Taruh gold kamu untuk menang lebih banyak",
  usage: ".gamble <jumlah>",
  example: ".gamble 100",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig, db }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const amount = parseInt(m.text?.trim() || "0", 10);

    if (!amount || amount <= 0) {
      const text =
        claraWrap("Cara Pakai", [`  ┊  ➶ Penggunaan: *${prefix}gamble <jumlah gold>*`,
          `  ┊  ➶ Contoh: *${prefix}gamble 100*`,
          "  ┊  ➶ Minimal: *10 Gold*",
          "  ┊  ➶ Maksimal: *10000 Gold*"].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "gamble");
      return { handled: true };
    }

    const win = Math.random() < 0.4;
    const multiplier = win ? Math.floor(Math.random() * 3) + 2 : 0;
    const result = win ? amount * multiplier : -amount;

    const emoji = win ? "🎉" : "💀";
    const status = win ? "MENANG" : "KALAH";

    const text =
      claraWrap("Gamble", "🎰") +
      "\n\n" +
      claraWrap("HaꜱIl", [
        `  ┊  ➶ Taruhan: *${amount} Gold*`,
        `  ┊  ➶ Hasil: *${result} Gold*`,
        `  ┊  ➶ Multiplier: *${win ? "x" + multiplier : "x0"}*`,
        `  ┊  ➶ Status: *${status}*`,
      ]) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Ketik ${prefix}gamble untuk main lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "gamble");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("gamble", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
