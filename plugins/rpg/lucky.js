// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "lucky",
  alias: ["lucky", "luck", "hokirpg"],
  category: "game",
  description: "Coba peruntunganmu",
  usage: ".lucky",
  example: ".lucky",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 60,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const roll = Math.random() * 100;
    let result = "";
    if (roll < 10) result = "Ulang tahun, dapat 100 Gold!";
    else if (roll < 30) result = "Dapat kupon 50 Gold.";
    else if (roll < 55) result = "Dapat 20 Gold.";
    else result = "Tidak dapat apa-apa hari ini.";

    const text =
      claraWrap("Lucky", [`╎❏ Hasil: *${result}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}lucky untuk coba lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "lucky");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`╎❏ Status: *Gagal*`,
        `╎❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("lucky", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
