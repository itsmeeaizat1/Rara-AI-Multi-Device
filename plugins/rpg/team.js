// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "team",
  alias: ["guildv2", "klanv2", "teamv2", "timv2"],
  category: "rpg",
  description: "Buat atau kelola tim/guild",
  usage: ".team <nama>",
  example: ".team NovaSquad",
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
    const name = m.text?.trim();

    if (!name) {
      const text =
        claraWrap("Cara Pakai", [`  ┊  ➶ Penggunaan: *${prefix}team <nama>*`,
          `  ┊  ➶ Contoh: *${prefix}team NovaSquad*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "team");
      return { handled: true };
    }

    const db = getDatabase();
    const rpg = db.getUser(m.sender)?.rpg || {};
    const guild = rpg.guild || null;

    if (!guild) {
      db.setUser(m.sender, {
        rpg: { ...rpg, guild: name, rank: rpg.rank || "member" },
      });
    }

    const text =
      claraWrap("Team", [`  ┊  ➶ Team: *${name}*`,
        `  ┊  ➶ Member: *${m.pushName || m.sender}*`,
        `  ┊  ➶ Role: *${guild ? "anggota" : "leader"}*`,
        "  ┊  ➶ Status: *SUCCESS*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}team <nama> untuk buat team lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await sendReplyWithNav(sock, m, text, "team");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("team", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
