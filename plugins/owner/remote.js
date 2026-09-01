// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "remote",
  alias: ["remote"],
  category: "owner",
  description: "Kontrol bot dari jarak jauh",
  usage: ".remote <perintah>",
  example: ".remote eval 1+1",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {

    const text =
      claraWrap("Remote", ["│ Fitur remote control aktif.",
        "│ Gunakan perintah yang valid."].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("remote", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("Owner", "Gagal nih, coba lagi ya");

    await m.reply( text, "remote");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
