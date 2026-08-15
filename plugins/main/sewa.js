import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "sewa",
  alias: ["sewa2", "sewamain", "sewabot2"],
  category: "info",
  description: "Info sewa bot",
  usage: ".sewa",
  example: ".sewa",
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

    const text =
      claraWrap("Sewa", ["◦ Bot ini dapat disewa.",
        "◦ Hubungi owner untuk info harga dan durasi."].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}owner untuk kontak owner`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("sewa", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, text, "sewa");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
