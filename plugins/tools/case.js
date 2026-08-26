// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "case",
  alias: ["case", "report2", "reportcase"],
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
  try {
    const prefix = botConfig.command?.prefix || ".";
    const desc = m.text?.trim();

    if (!desc) {
      const text =
        claraWrap("Cara Pakai", [`│ ❏ Penggunaan: *${prefix}case <deskripsi>*`,
          `│ ❏ Contoh: *${prefix}case Bug di fitur RPG*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "case");
      return { handled: true };
    }

    const text =
      claraWrap("Case", [`│ ❏ Deskripsi: *${desc}*`,
        `│ ❏ Pelapor: *${m.pushName || m.sender}*`,
        "│ ❏ Status: *ᴛᴇʀᴋɪʀɪᴍ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}case <deskripsi> untuk buat laporan lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(claraWrap("case", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`│ ❏ Status: *ɢᴀɢᴀʟ*`,
        `│ ❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply( text, "case");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
