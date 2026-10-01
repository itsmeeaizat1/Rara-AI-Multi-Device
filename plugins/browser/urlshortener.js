// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  novaWrap, novaCaption } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "urlshortener",
  alias: ["urlshortener"],
  category: "browser",
  description: "Pendekkan URL panjang",
  usage: ".urlshortener <link>",
  example: ".urlshortener https://example.com/very/long/url",
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
    const url = m.text?.trim();

    if (!url) {
      const text =
        novaCaption({
  emoji: "🛠️",
  name: "urlshortener",
  description: "Pendekkan URL panjang",
  usage: `${prefix}urlshortener <link>`,
  example: `${prefix}urlshortener https://example.com/very/long/url`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "urlshortener");
      return { handled: true };
    }

    let short = url;
    try {
      const apiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`;
      const res = await fetch(apiUrl);
      short = (await res.text()).trim() || short;
    } catch (e) { console.error('[urlshortener.js]:', e.message); }

    const text =
      novaWrap("URL Shortener", [`Original: *${url}*`,
        `Short: *${short}*`,
        "Status: *berhasil*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}urlshortener <link> untuk pendekkan lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.react("🐣");
    await m.reply(text, "urlshortener");
  } catch (error) {
    await m.react("❌");
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("Tools", "Gagal nih, coba lagi ya");

    await m.reply( text, "urlshortener");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
