// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA

import { raraError, raraEmpty, raraGuide, raraNoInput,  tipText,  raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";

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
  isPrivate: true,
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
        raraCaption({
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
      raraWrap("Case", [`Deskripsi: *${desc}*`,
        `Pelapor: *${m.pushName || m.sender}*`,
        "Status: *terkirim*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}case <deskripsi> untuk buat laporan lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.react("🐣");
    await m.reply(text, "case");
  } catch (error) {
    await m.react("❌");
    const prefix = botConfig.command?.prefix || ".";
    const text =
      raraError("Tools", "Gagal nih, coba lagi ya");

    await m.reply( text, "case");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
