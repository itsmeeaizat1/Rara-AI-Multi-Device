import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "upgrade2",
  alias: ["upgrade2", "up2", "equipupgrade2", "tempa2"],
  category: "rpg",
  description: "Penempaan dan upgrade equipment v2 (Weapon, Armor, Accessory) hingga Level 10 Legendary",
  usage: ".upgrade2 list\n.upgrade2 <weapon|armor|accessory>",
  example: ".upgrade2 weapon",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const EQUIP_TYPES = {
  weapon: { name: "Weapon (Senjata)", emoji: "⚔️", stat: "ATK" },
  armor: { name: "Armor (Zirah)", emoji: "🛡️", stat: "DEF" },
  accessory: { name: "Accessory (Aksesoris)", emoji: "💍", stat: "HP/Luck" },
};

function getSuccessRate(targetLevel) {
  if (targetLevel <= 5) return 90;
  if (targetLevel <= 8) return 70;
  if (targetLevel === 9) return 50;
  if (targetLevel === 10) return 30;
  return 0;
}

async function handler(m, { sock }) {
  await m.react("🕒");
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const input = (m.args[0] || "").toLowerCase().trim();

    const equipData = await db.getPlayerData?.(sender, "upgrade2") || { weapon: 0, armor: 0, accessory: 0 };
    equipData.weapon = equipData.weapon || 0;
    equipData.armor = equipData.armor || 0;
    equipData.accessory = equipData.accessory || 0;

    if (!input || input === "list" || input === "status") {
      let listMsg = `╭─「 *EQUIPMENT UPGRADE V2* 」\n`;
      listMsg += `│ Status Equipment Kamu:\n│\n`;
      for (const [key, info] of Object.entries(EQUIP_TYPES)) {
        const lvl = equipData[key] || 0;
        const status = lvl >= 10 ? "⚡ LEGENDARY ⚡" : `Lvl ${lvl}/10`;
        listMsg += `│ ${info.emoji} *${info.name}*: ${status}\n`;
        if (lvl < 10) {
          const nextLvl = lvl + 1;
          const cost = nextLvl * nextLvl * 100;
          const rate = getSuccessRate(nextLvl);
          listMsg += `│    ➔ Upgrade Lvl ${nextLvl}: *${cost.toLocaleString()} Gold* (Rate: *${rate}%*)\n`;
        }
      }
      listMsg += `│\n│ 💡 *Penggunaan:* ${m.prefix}upgrade2 <weapon|armor|accessory>\n`;
      listMsg += `│ 📝 *Contoh:* ${m.prefix}upgrade2 weapon\n`;
      listMsg += `╰──────────`;
      await m.react("🐣");
      return m.reply(listMsg);
    }

    const type = Object.keys(EQUIP_TYPES).find(k => k === input || input.includes(k));
    if (!type) {
      await m.react("❌");
      return m.reply(claraWrap("upgrade2", `Pilihan equipment "*${input}*" tidak valid.\n\nPilih salah satu: *weapon*, *armor*, atau *accessory*.\nKetik *${m.prefix}upgrade2 list* untuk melihat status.`, "error"));
    }

    const currentLvl = equipData[type] || 0;
    if (currentLvl >= 10) {
      await m.react("🐣");
      return m.reply(claraWrap("upgrade2", `*${EQUIP_TYPES[type].name}* kamu sudah mencapai *Level Maksimal 10 (⚡ LEGENDARY STATUS ⚡)*!`, "guide"));
    }

    const targetLvl = currentLvl + 1;
    const cost = targetLvl * targetLvl * 100;
    const rate = getSuccessRate(targetLvl);

    const profile = await db.getPlayerData?.(sender, "profile") || { gold: 5000 };
    profile.gold = profile.gold || 0;

    if (profile.gold < cost && !m.isOwner) {
      await m.react("❌");
      return m.reply(claraWrap("upgrade2", `Gold tidak cukup! Membutuhkan *${cost.toLocaleString()} Gold* untuk tempa ke Level ${targetLvl}, kamu hanya memiliki *${profile.gold.toLocaleString()} Gold*.`, "error"));
    }

    if (!m.isOwner) {
      profile.gold -= cost;
    }

    const roll = Math.floor(Math.random() * 100) + 1;
    const isSuccess = roll <= rate;

    let msg = `╭─「 *BLACKSMITH FORGE V2* 」\n`;
    msg += `│ 🔨 *Tempat Penempaan Besi*\n`;
    msg += `│ ${EQUIP_TYPES[type].emoji} Target: *${EQUIP_TYPES[type].name}*\n`;
    msg += `│ 📊 Tingkat: *Lvl ${currentLvl}* ➔ *Lvl ${targetLvl}*\n`;
    msg += `│ 💰 Biaya: *${cost.toLocaleString()} Gold*\n`;
    msg += `│ 🎯 Peluang Sukses: *${rate}%*\n│\n`;
    msg += `│ 💥 *Animasi Penempaan:*\n`;
    msg += `│ KELANG! KELANG! Api tempa membara dan palu menghantam besi murni...\n│\n`;

    if (isSuccess) {
      equipData[type] = targetLvl;
      msg += `│ ✨ *HASIL: BERHASIL!* 🎉\n`;
      if (targetLvl === 10) {
        msg += `│ ⚡ *CONGRATULATIONS!* Equipment telah mencapai status *⚡ LEGENDARY STATUS ⚡*!\n`;
      } else {
        msg += `│ 🌟 *${EQUIP_TYPES[type].name}* milikmu naik ke *Level ${targetLvl}*!\n`;
      }
    } else {
      msg += `│ ❌ *HASIL: GAGAL!* 💥\n`;
      msg += `│ 💨 Tempaan retak dan gagal berkilau. Level tetap di *Lvl ${currentLvl}*, namun Gold hangus!\n`;
    }

    msg += `│\n│ 💰 Sisa Gold: *${profile.gold.toLocaleString()} Gold*\n`;
    msg += `╰──────────`;

    await db.setPlayerData?.(sender, "profile", profile);
    await db.setPlayerData?.(sender, "upgrade2", equipData);

    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("upgrade2 error:", err);
    await m.react("❌");
    return m.reply(claraWrap("upgrade2", err.message || "Terjadi kesalahan saat upgrade equipment.", "error"));
  }
}

export { pluginConfig, pluginConfig as config, handler };
