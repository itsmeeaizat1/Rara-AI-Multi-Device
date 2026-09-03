// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {  claraHeader,  separator, tipText, claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import axios from "axios";

const pluginConfig = {
  name: "hadith", alias: ["hadith"], category: "islami",
  alias: ["hadith"],
  description: "Cari hadis Bukhari & Muslim", usage: ".hadith <kata kunci>",
  example: ".hadith sabar", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 10, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const query = m.text?.trim();
    if (!query) {
      await m.reply(novaCaption({
  emoji: "☪️",
  name: "hadith",
  description: "Cari hadis Bukhari & Muslim",
  usage: `${prefix}hadith <kata kunci>`,
  example: `${prefix}hadith sabar`,
}) + "\n" + tipText(`Ketik ${prefix}menu untuk kembali`));
      return { handled: true };
    }
    const { data } = await axios.get(`https://api.hadith.gading.dev/books/search`, {
      params: { q: query, limit: 5 }, timeout: 10000,
    });
    if (!data?.data?.items?.length) {
      await m.reply(claraWrap("Hadis", [`Kata kunci: *${query}*`, "Coba kata kunci lain"].join("\n")));
      return { handled: true };
    }
    let text = claraWrap("Hasil Cari Hadis", "📖") + "\n\n";
    for (const item of data.data.items.slice(0, 5)) {
      text += claraWrap(item.book || "Hadis", [
        `Nomor: *${item.number || item.hadithNumber || "-"}*`,
        `Isi: ${item.arabic || item.text || "-"}`,
      ]) + "\n\n";
    }
    text +=  tipText(`Ketik ${prefix}menu untuk kembali`);
    await m.reply(claraWrap("hadith", text));
  } catch (e) {
    await m.reply(novaError("Religi", [`Alasan: *${e.message}*`].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };