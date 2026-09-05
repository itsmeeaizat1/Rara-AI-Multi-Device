// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "case",
  alias: ["case"],
  category: "tools",
  description: "Buat case/laporan",
  usage: ".case <deskripsi>",
  example: ".case Bug di fitur RPG",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const desc = m.text?.trim();

    if (!desc) {
      const text =
        novaCaption({
  emoji: "🛠️",
  name: "case",
  description: "Buat case/laporan",
  usage: `${prefix}case <deskripsi>`,
  example: `${prefix}case Bug di fitur RPG`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "case");
      return { handled: true };
    }

    const text =
      claraWrap("Case", [`Deskripsi: *${desc}*`,
        `Pelapor: *${m.pushName || m.sender}*`,
        "Status: *ᴛᴇʀᴋɪʀɪᴍ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}case <deskripsi> untuk buat laporan lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.react("🐣");
    await m.reply(claraWrap("case", text));
  } catch (error) {
    await m.react("❌");
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("Tools", "Gagal nih, coba lagi ya");

    await m.reply( text, "case");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
