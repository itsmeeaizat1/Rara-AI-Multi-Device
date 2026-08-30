// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// guildwar.js — Guild War (guild vs guild battle)
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "guildwar",
  alias: ["guildwar", "perangguild", "gwar", "guildvs"],
  category: "rpg",
  description: "Guild War — guild vs guild, total power battle",
  usage: ".guildwar (info)\n.guildwar declare <guild_name> (deklarasi perang)\n.guildwar defend (bertahan)",
  example: ".guildwar declare Shadow Clan",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 60, energi: 10, isEnabled: true,
};

const ENEMY_GUILDS = [
  { name: "Shadow Clan", power: 5000, treasury: 10000, emoji: "🌑" },
  { name: "Crimson Order", power: 8000, treasury: 20000, emoji: "🔴" },
  { name: "Azure Brotherhood", power: 6500, treasury: 15000, emoji: "🔵" },
  { name: "Golden Legion", power: 10000, treasury: 30000, emoji: "🟡" },
  { name: "Frost Wolves", power: 7500, treasury: 18000, emoji: "❄️" },
  { name: "Dragon Slayers", power: 12000, treasury: 40000, emoji: "🐉" },
];

async function handler(m, { sock }) {
  try {
    const subCmd = (m.args[0] || "").toLowerCase();
    const db = await getDatabase();

    // Get player guild
    const guildData = await db.getPlayerData?.(m.sender, "guild") || null;
    if (!guildData || !guildData.name) {
      return m.reply(claraWrap("guildwar", `Kamu belum punya guild. Join guild dulu: ${m.prefix}guildrpg`, "guide"));
    }

    if (subCmd === "declare" || subCmd === "serang" || subCmd === "war") {
      const enemyName = m.args.slice(1).join(" ").trim();
      if (!enemyName) {
        let msg = `╭──「 *ᴇɴᴇᴍʏ ɢᴜɪʟᴅs* 」\n`;
        ENEMY_GUILDS.forEach(g => {
          msg += `│ ${g.emoji} ${g.name} — Power: ${g.power.toLocaleString()} | Treasury: ${g.treasury.toLocaleString()}g\n`;
        });
        msg += `│\n`;
        msg += `│ ${m.prefix}guildwar declare <nama guild>\n`;
        msg += `╰──────────`;
        return m.reply(msg);
      }

      const enemy = ENEMY_GUILDS.find(g => g.name.toLowerCase().includes(enemyName.toLowerCase()));
      if (!enemy) {
        await m.react("❌");
        return m.reply(claraWrap("guildwar", `Guild "${enemyName}" tidak ditemukan.`, "error"));
      }

      await m.react("🕒");

      // Calculate player guild power
      const playerPower = (guildData.power || guildData.totalPower || 3000) + Math.floor(Math.random() * 2000);
      const enemyPower = enemy.power + Math.floor(Math.random() * 2000);

      const won = playerPower > enemyPower;
      const margin = Math.abs(playerPower - enemyPower);

      let reward = 0;
      if (won) {
        reward = Math.floor(enemy.treasury * 0.3 + margin * 0.5);
        try { await db.addGold?.(m.sender, reward); } catch {}
        guildData.power = (guildData.power || 3000) + 500;
        guildData.wins = (guildData.wins || 0) + 1;
      } else {
        const loss = Math.floor(guildData.treasury * 0.1 || 500);
        try { await db.minGold?.(m.sender, loss); } catch {}
        guildData.losses = (guildData.losses || 0) + 1;
      }
      await db.setPlayerData?.(m.sender, "guild", guildData);

      await m.react("🐣");
      let msg = `╭──「 *ɢᴜɪʟᴅ ᴡᴀʀ* 」\n`;
      msg += `│ ${guildData.emoji || "🏰"} ${guildData.name}\n`;
      msg += `│ vs\n`;
      msg += `│ ${enemy.emoji} ${enemy.name}\n`;
      msg += `│\n`;
      msg += `│ Your Power: *${playerPower.toLocaleString()}*\n`;
      msg += `│ Enemy Power: *${enemyPower.toLocaleString()}*\n`;
      msg += `│\n`;
      if (won) {
        msg += `│ 🏆 *VICTORY!*\n`;
        msg += `│ Reward: *+${reward.toLocaleString()} gold*\n`;
        msg += `│ Guild Power: +500\n`;
      } else {
        msg += `│ 💀 *DEFEAT!*\n`;
        msg += `│ Kerugian: *-${loss || 500} gold*\n`;
      }
      msg += `│ Record: ${guildData.wins || 0}W / ${guildData.losses || 0}L\n`;
      msg += `╰──────────`;
      return m.reply(msg);
    }

    // INFO (default)
    let msg = `╭──「 *ɢᴜɪʟᴅ ᴡᴀʀ* 」\n`;
    msg += `│ Guild: ${guildData.emoji || "🏰"} *${guildData.name}*\n`;
    msg += `│ Power: *${(guildData.power || 3000).toLocaleString()}*\n`;
    msg += `│ Record: *${guildData.wins || 0}W / ${guildData.losses || 0}L*\n`;
    msg += `│\n`;
    msg += `│ ${m.prefix}guildwar declare <enemy> - serang!\n`;
    msg += `╰──────────`;
    return m.reply(msg);
  } catch (err) {
    console.error("guildwar error:", err);
    await m.react("❌");
    return m.reply(claraWrap("guildwar", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
