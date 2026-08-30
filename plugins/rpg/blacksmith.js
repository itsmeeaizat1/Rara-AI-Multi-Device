import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "blacksmith",
  alias: ["blacksmith", "tempa", "forge"],
  category: "rpg",
  description: "Sistem Pandai Besi untuk upgrade level dan ATK senjata",
  usage: ".blacksmith <info|upgrade [nama_senjata]>",
  example: ".blacksmith upgrade Pedang Kayu",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react('🕒');
    const db = await getDatabase();
    const sender = m.sender;
    const subCmd = (m.args[0] || "").toLowerCase();

    // Get weapon data
    let weapon = (await db.getPlayerData?.(sender, "weapon")) || {
      name: "Pedang Besi",
      level: 0,
      baseAtk: 20,
      gold: 2500,
    };

    if (typeof weapon.level !== "number") weapon.level = 0;
    if (typeof weapon.baseAtk !== "number") weapon.baseAtk = 20;

    const currentLevel = weapon.level;
    const maxLevel = 20;
    const currentAtk = weapon.baseAtk + currentLevel * 5;
    const upgradeCost = Math.max(500, (currentLevel + 1) * 500);

    if (subCmd === "info" || !subCmd) {
      let msg = `╭──「 *BLACKSMITH FORGE* 」\n`;
      msg += `│ ⚔️ *Senjata:* ${weapon.name}\n`;
      msg += `│ 📊 *Level:* ${currentLevel} / ${maxLevel}\n`;
      msg += `│ 💥 *Total ATK:* ${currentAtk} (+${currentLevel * 5})\n`;
      msg += `│ 💰 *Biaya Upgrade:* ${upgradeCost} Gold\n`;
      msg += `│ 🎲 *Tingkat Keberhasilan:* 80%\n│\n`;
      msg += `│ *Catatan Upgrade:*\n`;
      msg += `│ • Setiap level menambah +5 ATK\n`;
      msg += `│ • Gagal tempa: senjata tidak hilang/turun level\n│\n`;
      msg += `│ Perintah Upgrade:\n`;
      msg += `│ ${m.prefix}blacksmith upgrade <nama_senjata>\n`;
      msg += `╰──────────`;
      await m.react('🐣');
      return m.reply(msg);
    }

    if (subCmd === "upgrade" || subCmd === "tempa") {
      if (currentLevel >= maxLevel) {
        await m.react('❌');
        return m.reply(
          claraWrap(
            "blacksmith",
            `Senjata *${weapon.name}* sudah mencapai level maksimal (${maxLevel})!`,
            "error"
          )
        );
      }

      // Check gold
      const currentGold = weapon.gold !== undefined ? weapon.gold : 5000;
      if (currentGold < upgradeCost) {
        await m.react('❌');
        return m.reply(
          claraWrap(
            "blacksmith",
            `Gold tidak cukup untuk tempa senjata!\n\nBiaya: ${upgradeCost} Gold | Punya: ${currentGold} Gold`,
            "error"
          )
        );
      }

      // Deduct gold
      weapon.gold = currentGold - upgradeCost;

      // Custom weapon name if provided
      const inputName = m.args.slice(1).join(" ");
      if (inputName && weapon.level === 0) {
        weapon.name = inputName;
      }

      // 80% success, 20% fail
      const roll = Math.random() * 100;
      const isSuccess = roll <= 80;

      if (isSuccess) {
        weapon.level += 1;
        const newAtk = weapon.baseAtk + weapon.level * 5;
        await db.setPlayerData?.(sender, "weapon", weapon);

        let msg = `╭──「 *UPGRADE SUCCESS* 」\n`;
        msg += `│ ⚒️ Berhasil menempa *${weapon.name}*!\n`;
        msg += `│  \n`;
        msg += `│ 📊 Level Baru: *+${weapon.level}* / ${maxLevel}\n`;
        msg += `│ 💥 Total ATK: *${newAtk}* (+5 ATK)\n`;
        msg += `│ 💰 Biaya: -${upgradeCost} Gold\n`;
        msg += `╰──────────`;

        await m.react('🐣');
        return m.reply(msg);
      } else {
        await db.setPlayerData?.(sender, "weapon", weapon);

        let msg = `╭──「 *UPGRADE FAILED* 」\n`;
        msg += `│ 💥 Tempaan gagal! Percikan api membakar material.\n`;
        msg += `│  \n`;
        msg += `│ 🛡️ Senjata *${weapon.name}* tetap di Level *${currentLevel}*.\n`;
        msg += `│ 💰 Biaya terpakai: -${upgradeCost} Gold\n`;
        msg += `╰──────────`;

        await m.react('❌');
        return m.reply(msg);
      }
    }

    await m.react('❌');
    return m.reply(
      claraWrap(
        "blacksmith",
        `Gunakan perintah:\n\n• ${m.prefix}blacksmith info — Cek status senjata & biaya\n• ${m.prefix}blacksmith upgrade <nama_senjata> — Upgrade senjata`,
        "guide"
      )
    );
  } catch (err) {
    console.error("blacksmith error:", err);
    await m.react('❌');
    return m.reply(claraWrap("blacksmith", err.message || "Terjadi kesalahan pada sistem Pandai Besi.", "error"));
  }
}

export { pluginConfig, pluginConfig as config, handler };
