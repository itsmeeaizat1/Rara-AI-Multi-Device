// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader,  separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from "axios";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "hadith", alias: ["hadisreligi", "hadithreligi", "hadis3"], category: "religi",
  description: "Cari hadis Bukhari & Muslim", usage: ".hadith <kata kunci>",
  example: ".hadith sabar", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: true, cooldown: 10, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const query = m.text?.trim();
    if (!query) {
      await m.reply(claraWrap("Cari Hadis", [`◦ Penggunaan: *${prefix}hadith <kata kunci>*`,
        `◦ Contoh: *${prefix}hadith sabar*`,
        "◦ Sumber: Hadis Bukhari & Muslim"].join("\n")) + "\n" + tipText(`Ketik ${prefix}menu untuk kembali`));
      return { handled: true };
    }
    const { data } = await axios.get(`https://api.hadith.gading.dev/books/search`, {
      params: { q: query, limit: 5 }, timeout: 10000,
    });
    if (!data?.data?.items?.length) {
      await m.reply(claraWrap("Hadis", [`◦ Kata kunci: *${query}*`, "◦ Coba kata kunci lain"].join("\n")));
      return { handled: true };
    }
    let text = claraWrap("Hasil Cari Hadis", "📖") + "\n\n";
    for (const item of data.data.items.slice(0, 5)) {
      text += claraWrap(item.book || "Hadis", [
        `◦ Nomor: *${item.number || item.hadithNumber || "-"}*`,
        `◦ Isi: ${item.arabic || item.text || "-"}`,
      ]) + "\n\n";
    }
    text += separator("━", 22) + "\n" + tipText(`Ketik ${prefix}menu untuk kembali`);
    await m.reply(claraWrap("hadith", text));
  } catch (e) {
    await m.reply(claraWrap("Gagal", [`◦ Alasan: *${e.message}*`].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };