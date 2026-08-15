// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { 
  separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, addGold, savePlayer } from "../../src/lib/nova-rpg-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "upgrade",
  alias: ["upg", "tingkatkan", "upgrade"],
  category: "game",
  description: "Upgrade stats RPG kamu",
  usage: ".upgrade <stat>",
  example: ".upgrade atk",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const COSTS = { atk: 200, def: 200, hp: 150, spd: 250 };
const BONUS = { atk: 5, def: 5, hp: 10, spd: 4 };

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const stat = m.text?.trim().toLowerCase();

    if (!stat || !(stat in COSTS)) {
      const text =
        claraWrap("Cara Pakai", ["◦ *ATK* - Upgrade attack - 200 Gold",
          "◦ *DEF* - Upgrade defense - 200 Gold",
          "◦ *HP* - Upgrade health - 150 Gold",
          "◦ *SPD* - Upgrade speed - 250 Gold"].join("\n")) +
        "\n\n" +
        claraWrap("ɪɴꜰᴏ", [`◦ Penggunaan: *${prefix}upgrade <stat>*`, `◦ Contoh: *${prefix}upgrade atk*`].join("\n")) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "upgrade");
      return { handled: true };
    }

    const cost = COSTS[stat];
    const bonus = BONUS[stat];
    const player = getPlayer(m);
    const gold = player?.gold || 0;

    if (gold < cost) {
      const text =
        claraWrap("Upgrade", [`◦ Stat: *${stat.toUpperCase()}*`,
          `◦ Biaya: *${cost} Gold*`,
          `◦ Saldo: *${gold} Gold*`,
          "◦ Status: *Gold tidak cukup*"].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}daily untuk klaim gold harian`) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "upgrade");
      return { handled: true };
    }

    addGold(m, -cost);

    const rpg = player?.rpg || {};
    const updated = { ...rpg };

    if (stat === "atk") updated.atk = (updated.atk || 0) + bonus;
    if (stat === "def") updated.def = (updated.def || 0) + bonus;
    if (stat === "hp") updated.hp = (updated.hp || 0) + bonus;
    if (stat === "spd") updated.spd = (updated.spd || 0) + bonus;

    savePlayer(m, { rpg: updated });

    const after = getPlayer(m)?.rpg || {};
    const text =
      claraWrap("Upgrade", [`◦ Stat: *${stat.toUpperCase()}*`,
        `◦ Bonus: *+${bonus}*`,
        `◦ Biaya: *${cost} Gold*`,
        `◦ Sisa Gold: *${after.gold || 0} Gold*`,
        "◦ Status: *Berhasil*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "upgrade");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("upgrade", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
