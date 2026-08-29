// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import {  claraWrap, claraLine, novaCaption } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "onlypc",
  alias: ["onlypc"],
  category: "owner",
  description: "Toggle mode bot hanya di private chat",
  usage: ".onlypc on/off",
  example: ".onlypc on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const option = m.text?.toLowerCase()?.trim();

  if (!option) {
    const current = db.setting("onlyPc") || false;
    return m.reply(novaCaption({
  emoji: "💬",
  name: "onlypc",
  description: "Toggle mode bot hanya di private chat",
  usage: `${m.prefix}onlypc on/off`,
  example: `${m.prefix}onlypc on`,
}), "onlypc");
  }

  if (option === "on") {
    db.setting("onlyPc", true);
    db.setting("onlyGc", false);
    return m.reply(claraWrap("onlypc", `💬 *Only Private Aktif*\n\n` +
        `Bot hanya bisa diakses di private chat\n` +
        `Mode Only Group dinonaktifkan`));
  }

  if (option === "off") {
    db.setting("onlyPc", false);
    return m.reply(
      `💬 *Only Private Nonaktif*\n\n` +
        `Bot bisa diakses di mana saja`
    );
  }

  return m.reply(claraWrap("Onlypc", `❌ *Opsi Tidak Valid*\n\nGunakan *${m.prefix}onlypc on* atau *${m.prefix}onlypc off*`));
}

export { pluginConfig as config, handler };
