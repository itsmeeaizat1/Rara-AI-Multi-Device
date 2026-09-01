// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { toSC } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "infov2",
  alias: ["infov2"],
  category: "main",
  description: "Tampilkan info bot versi 2",
  usage: ".infov2",
  example: ".infov2",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const db = getDatabase();
    const users = Object.keys(db.users || {}).length;
    const groups = Object.keys(db.groups || {}).length;

    const text =
      
      "│ • " + toSC("Bot") + " : *" + (botConfig.bot?.name || "Nova AI") + "*\n" +
      "│ • " + toSC("Versi") + " : *" + (botConfig.bot?.version || "1.0.0") + "*\n" +
      "│ • " + toSC("Mode") + " : *" + (botConfig.mode || "public").toUpperCase() + "*\n" +
      "│ • " + toSC("Prefix") + " : *" + prefix + "*\n" +
      "│ • " + toSC("Users") + " : *" + users + "*\n" +
      "│ • " + toSC("Groups") + " : *" + groups + "*\n" +
      "";

    return m.reply(text);
  } catch (error) {
    return m.reply("❌ Gagal menampilkan info");
  }
}

export { pluginConfig as config, handler };
