import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraHeader,
  separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { RPG_CATEGORIES } from "./rpgdashboardglobal.js";

const pluginConfig = {
  name: "rpgdashboard",
  alias: [
    "dashboardprofile", "dbprofile",
    "dashboardeconomy", "dbeconomy",
    "dashboardaction", "dbaction",
    "dashboardsocial", "dbsocial",
    "dashboardgame", "dbgame",
    "dashboardjob", "dbjob",
    "dashboardfarm", "dbfarm",
  ],
  category: "rpg",
  description: "Dashboard RPG per kategori",
  usage: ".dbeconomy / .dbaction / dll",
  example: ".dbeconomy",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// Map alias to category key
const ALIAS_MAP = {
  dashboardprofile: "profile",
  dbprofile: "profile",
  dashboardeconomy: "economy",
  dbeconomy: "economy",
  dashboardaction: "action",
  dbaction: "action",
  dashboardsocial: "social",
  dbsocial: "social",
  dashboardgame: "game",
  dbgame: "game",
  dashboardjob: "job",
  dbjob: "job",
  dashboardfarm: "farm",
  dbfarm: "farm",
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const usedCmd = (m.command || "").toLowerCase();

    let catKey = ALIAS_MAP[usedCmd];

    if (!catKey) {
      return m.reply(
        "Dashboard tidak ditemukan.\n\n" +
        "Tersedia:\n" +
        `${prefix}dbprofile — Profile & stats\n` +
        `${prefix}dbeconomy — Economy & gold\n` +
        `${prefix}dbaction — Battle & adventure\n` +
        `${prefix}dbsocial — Social & pet\n` +
        `${prefix}dbgame — Casino & gacha\n` +
        `${prefix}dbjob — Jobs & mini-games\n` +
        `${prefix}dbfarm — Farm & cooking\n\n` +
        `Atau ketik ${prefix}db untuk global dashboard`
      );
    }

    const cat = RPG_CATEGORIES.find((c) => c.key === catKey);
    if (!cat) {
      return m.reply(claraWrap("rpgdashboard", "Kategori tidak ditemukan."));
    }

    let text = claraHeader(`Dashboard ${cat.name}`, cat.emoji) + "\n\n";

    text += claraWrap("INFO", [`◦ Kategori: *${cat.name}*`, `◦ Total Command: *${cat.commands.length}*`].join("\n")) + "\n\n";

    text += separator("━", 30) + "\n";
    text += "DAFTAR COMMAND\n";
    text += separator("━", 30) + "\n\n";

    let num = 1;
    for (const item of cat.commands) {
      text += `${num}. ${prefix}${item.cmd}\n`;
      text += `   ${item.desc}\n`;
      num++;
    }

    text += "\n" + separator("━", 30) + "\n";

    const otherDashes = RPG_CATEGORIES
      .filter((c) => c.key !== catKey)
      .map((c) => `${c.emoji} ${prefix}db${c.key}`)
      .join("\n");

    text += tipText(`Dashboard lain:`) + "\n";
    text += otherDashes + "\n\n";
    text += tipText(`Ketik ${prefix}db untuk global dashboard`);

    await sendReplyWithNav(sock, m, text, "rpgdashboard");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("rpgdashboard", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler };
