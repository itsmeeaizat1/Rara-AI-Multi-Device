// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { novaError, novaEmpty, novaGuide, novaNoInput, tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "kickall",
  alias: ["kickall"],
  category: "group",
  description: "Kick semua member grup kecuali admin",
  usage: ".kickall",
  example: ".kickall",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {

    const text =
      claraWrap("Kick All", ["Status: *ʙᴇʀʜᴀꜱɪʟ*",
        "Semua member non-admin telah dikick."].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("kickall", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
    await m.reply(novaError("KickAll", "Gagal nih, coba lagi ya"));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
