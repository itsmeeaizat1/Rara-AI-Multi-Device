// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { raraError, raraEmpty, raraGuide, raraNoInput,  tipText,  raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "translate",
  alias: ["translate"],
  category: "tools",
  description: "Terjemahkan teks ke bahasa lain",
  usage: ".translate <bahasa> <teks>",
  example: ".translate en Halo, apa kabar?",
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
    const args = m.text?.trim().split(/\s+/);
    const lang = args?.[0];
    const text = args?.slice(1).join(" ");

    if (!lang || !text) {
      const text =
        raraCaption({
  emoji: "🌐",
  name: "translate",
  description: "Terjemahkan teks ke bahasa lain",
  usage: `${prefix}translate <bahasa> <teks>`,
  example: `${prefix}translate en Halo, apa kabar?`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "translate");
      return { handled: true };
    }

    let translated = text;
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=id&tl=${encodeURIComponent(lang)}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      const json = await res.json();
      translated = json?.[0]?.map((s) => s?.[0]).join("") || text;
    } catch (e) { console.error('[translate.js]:', e.message); }

    const replyText =
      raraWrap("Translate", ["Dari: *id*",
        `Ke: *${lang}*`,
        `Teks Asli: *${text}*`,
        `Hasil: *${translated}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}translate <bahasa> <teks> untuk menerjemahkan lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.react("🐣");
    await m.reply(replyText);
  } catch (error) {
    await m.react("❌");
    const text =
      raraError("Tools", "Gagal nih, coba lagi ya");

    await m.reply( text, "translate");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
