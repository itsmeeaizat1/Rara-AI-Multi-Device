// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { 
  separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "job",
  alias: ["kerja", "work", "pekerjaan", "profesi"],
  category: "economy",
  description: "Ganti pekerjaan RPG kamu",
  usage: ".job <nama job>",
  example: ".job Warrior",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig, db }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const query = m.text?.trim();

    if (!query) {
      const text =
        claraWrap("Daftar Job", ["1. Warrior - ATK +10, DEF +5",
          "2. Mage - ATK +15, DEF +3",
          "3. Archer - ATK +12, DEF +4",
          "4. Healer - ATK +5, DEF +8",
          "5. Assassin - ATK +18, DEF +2"].join("\n")) +
        "\n\n" +
        claraWrap("Info", [`  ┊  ➶ Penggunaan: *${prefix}job <nama job>*`, `  ┊  ➶ Contoh: *${prefix}job Warrior*`].join("\n")) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "job");
      return { handled: true };
    }

    const text =
      claraWrap("Job", [`  ┊  ➶ Job: *${query}*`,
        "  ┊  ➶ Status: *Berhasil diganti*",
        "  ┊  ➶ ATK Bonus: *+10*",
        "  ┊  ➶ DEF Bonus: *+5*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "job");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("job", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
