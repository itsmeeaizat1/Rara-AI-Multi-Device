// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "kbbi",
  alias: ["kbbi", "kamus2", "kbbi5"],
  category: "tools",
  description: "Cek arti kata di KBBI",
  usage: ".kbbi <kata>",
  example: ".kbbi mobil",
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
    const word = m.text?.trim();

    if (!word) {
      const text =
        claraWrap("Cara Pakai", [`◦ Penggunaan: *${prefix}kbbi <kata>*`,
          `◦ Contoh: *${prefix}kbbi mobil*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "kbbi");
      return { handled: true };
    }

    let meaning = "-";
    try {
      const res = await fetch(`https://api.dicode.xyz/api/kbbi?kata=${encodeURIComponent(word)}`);
      const json = await res.json();
      meaning = json.meaning || json.arti || meaning;
    } catch {}

    const text =
      claraWrap("KBBI", [`◦ Kata: *${word}*`,
        `◦ Arti: *${meaning}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}kbbi <kata> untuk cek arti lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(claraWrap("kbbi", text));
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, text, "kbbi");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
