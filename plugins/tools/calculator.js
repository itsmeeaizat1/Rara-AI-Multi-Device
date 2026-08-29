// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "calculator",
  alias: ["calculator", "calc"],
  category: "tools",
  description: "Kalkulator matematika",
  usage: ".calc <ekspresi>",
  example: ".calc 5 + 3 * 2",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const ALLOWED = /^[0-9+\-*/().% ]+$/;

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const expr = m.text?.trim();

    if (!expr) {
      const text =
        novaCaption({
  emoji: "🛠️",
  name: "calculator",
  description: "Kalkulator matematika",
  usage: `${prefix}calc <ekspresi>`,
  example: `${prefix}calc 5 + 3 * 2`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "calculator");
      return { handled: true };
    }

    if (!ALLOWED.test(expr)) {
      const text =
        claraWrap("Calculator", [`│ Ekspresi: *${expr}*`,
          "│ Status: *ᴇᴋꜱᴘʀᴇꜱɪ ᴛɪᴅᴀᴋ ᴅɪᴅᴜᴋᴜɴɢ*"].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}calc <ekspresi> untuk menghitung lagi`) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

      await m.reply(claraWrap("calculator", text));
      return { handled: true };
    }

    let result;
    try {
      // eslint-disable-next-line no-new-func
      result = new Function(`return ${expr}`)();
    } catch {
      result = "ERROR";
    }

    const text =
      claraWrap("Calculator", [`│ Ekspresi: *${expr}*`,
        `│ Hasil: *${result}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}calc <ekspresi> untuk menghitung lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(claraWrap("calculator", text));
  } catch (error) {
    const text =
      novaError("Tools", "Gagal nih, coba lagi ya");

    await m.reply( text, "calculator");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
