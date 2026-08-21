// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraHeader,
    separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpgmenu",
  alias: ["rpgmenu", "rmenu", "rpghelp", "gamehelp"],
  category: "rpg",
  description: "Menu panduan RPG",
  usage: ".rpgmenu",
  example: ".rpgmenu",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    const categories = [
      { name: "Profile", commands: ["profile", "rank", "inventory", "equipment"] },
      { name: "Economy", commands: ["balance", "bank", "daily", "shop", "buy", "sell"] },
      { name: "Action", commands: ["hunt", "mine", "adventure", "boss", "battle"] },
      { name: "Social", commands: ["marry", "pet", "guild", "trade", "give"] },
      { name: "Game", commands: ["gacha", "dungeon", "event", "achievement"] },
      { name: "Premium", commands: ["autohunt", "petevolve", "darkmarket"] },
    ];

    let text = claraWrap("RPG Menu", "⚔️") + "\n\n";

    for (const cat of categories) {
      const cmds = cat.commands.map((cmd) => `  ┊  ➶ ${prefix}${cmd}`).join("\n");
      let boxTitle = cat.name.toUpperCase();
      if (cat.name === "Premium") {
        boxTitle = "PREMIUM 💎";
      }
      text += claraWrap(boxTitle, [cmds]) + "\n\n";
    }

    text += separator("━", 22) + "\n";
    text += tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "rpgmenu");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("rpgmenu", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler };
