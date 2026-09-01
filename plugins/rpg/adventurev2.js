// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Adventure v2 — Richer random events, skill-based encounters, party buffs

import {
  ensureRpg, saveRpg, addExp, addGold, addGems, useEnergy,
  addItem, removeItem, getEquipStats, regenHP, regenMana, regenEnergy,
  ITEM_DB, checkCooldown, setCooldown, formatTime
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "adventurev2",
  alias: ["adventurev2", "petualangv2", "jelajahv2"],
  category: "rpg",
  description: "Petualangan v2 — 10 event types, combat, puzzle, merchant, shrine",
  usage: ".adventurev2",
  example: ".adventurev2",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

const ADV2_ENERGY = 15;
const ADV2_COOLDOWN = 2 * 60 * 1000;

const EVENTS = [
  // Treasure (20%)
  { type: "treasure", weight: 20,
    minExp: 80, maxExp: 250, minGold: 40, maxGold: 150,
    drops: [{ item: "goldOre", chance: 40, min: 1, max: 3 }, { item: "pearl", chance: 20, min: 1, max: 1 }, { item: "hpPotion", chance: 50, min: 1, max: 2 }],
    msgs: ["Peti harta tersembunyi di gua!", "Emas terkubur di bawah reruntuhan!", "Harta karun pirate ditemukan!"] },

  // Monster fight (18%)
  { type: "monster", weight: 18,
    minExp: 120, maxExp: 350, minGold: 60, maxGold: 200,
    msgs: ["Serigama kelaparan menyerang!", "Goblin menyergang!", "Skeleton bangkit dari kubur!"] },

  // Trap (10%)
  { type: "trap", weight: 10,
    minExp: 10, maxExp: 40,
    msgs: ["Lubang jebakan!", "Panah beracun menancap!", "Gas beracun!"] },

  // Merchant (12%)
  { type: "merchant", weight: 12,
    msgs: ["Pedagang traveling menawarkan item!", "Merchant misterius muncul!"] },

  // Shrine (8%)
  { type: "shrine", weight: 8,
    msgs: ["Kuil kuno bersinar!", "Air suci di altar!"] },

  // Treasure cave (8%)
  { type: "cave", weight: 8,
    minExp: 100, maxExp: 200, minGold: 50, maxGold: 120,
    drops: [{ item: "goldOre", chance: 60, min: 2, max: 4 }, { item: "mithrilOre", chance: 15, min: 1, max: 1 }],
    msgs: ["Gua dengan kilauan emas!", "Kristal berharga di dinding gua!"] },

  // Fairy (6%)
  { type: "fairy", weight: 6,
    msgs: ["Bidadari hutan muncul!", "Makhluk ajaib memberkati!"] },

  // Bandit ambush (8%)
  { type: "bandit", weight: 8,
    minExp: 80, maxExp: 200, minGold: 30, maxGold: 100,
    msgs: ["Bandit jalanan!", "Perampok menyergang!"] },

  // Ancient scroll (5%)
  { type: "scroll", weight: 5,
    minExp: 150, maxExp: 300,
    msgs: ["Gulungan kuno ditemukan!", "Teks kuno terbuka!"] },

  // Nothing (5%)
  { type: "nothing", weight: 5,
    msgs: ["Perjalanan biasa saja.", "Tidak menemukan apapun."] },
];

function rollEvent() {
  const total = EVENTS.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of EVENTS) { r -= e.weight; if (r <= 0) return e; }
  return EVENTS[0];
}

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("adventurev2", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const cd = checkCooldown(m, "lastAdventureV2");
    if (cd) {
      await m.react("🚫");
      return m.reply(claraWrap("adventurev2", `Cooldown tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < ADV2_ENERGY) {
      await m.react("🚫");
      return m.reply(claraWrap("adventurev2", `Energi kurang! Butuh *${ADV2_ENERGY}*. Energy: *${rpg.energy}/${rpg.maxEnergy}*`, "warn"));
    }

    useEnergy(m, ADV2_ENERGY, sock);

    const event = rollEvent();
    const msg = event.msgs[Math.floor(Math.random() * event.msgs.length)];
    let expGain = 0, goldGain = 0, gemGain = 0;
    let drops = [];
    let extraText = "";
    let hpChange = 0;
    let title = "ᴘᴇᴛᴜᴀʟᴀɴɢ ᴠ2";

    switch (event.type) {
      case "treasure":
      case "cave": {
        expGain = Math.floor(Math.random() * (event.maxExp - event.minExp + 1)) + event.minExp;
        goldGain = Math.floor(Math.random() * (event.maxGold - event.minGold + 1)) + event.minGold;
        if (event.drops) {
          for (const d of event.drops) {
            if (Math.random() * 100 < d.chance) {
              const qty = Math.floor(Math.random() * (d.max - d.min + 1)) + d.min;
              drops.push({ item: d.item, qty });
              addItem(m, d.item, qty);
            }
          }
        }
        addExp(m, expGain);
        addGold(m, goldGain);
        title = event.type === "cave" ? "ɢᴜᴀ ʜᴀʀᴛᴀ" : "ʜᴀʀᴛᴀ ᴋᴀʀᴜɴ";
        break;
      }

      case "monster":
      case "bandit": {
        const equip = getEquipStats(m);
        const playerAtk = rpg.atk + equip.atk;
        const playerDef = rpg.def + equip.def;
        const enemyHp = 80 + rpg.level * 12;
        const enemyAtk = 10 + rpg.level * 3;

        let rounds = 0, dmgTaken = 0, eHp = enemyHp;
        while (eHp > 0 && dmgTaken < rpg.hp && rounds < 10) {
          rounds++;
          const crit = Math.random() * 100 < (rpg.critRate + equip.critRate);
          const dmg = Math.max(1, Math.floor(playerAtk * (crit ? 1.5 : 1) * (1 - 10 / 110)));
          eHp -= dmg;
          if (eHp <= 0) break;
          if (Math.random() * 100 < (rpg.evasion + equip.evasion)) continue;
          dmgTaken += Math.max(1, Math.floor(enemyAtk * (1 - playerDef / (playerDef + 100))));
        }

        if (eHp <= 0) {
          expGain = Math.floor(Math.random() * (event.maxExp - event.minExp + 1)) + event.minExp;
          goldGain = Math.floor(Math.random() * (event.maxGold - event.minGold + 1)) + event.minGold;
          addExp(m, expGain);
          addGold(m, goldGain);
          hpChange = -dmgTaken;
          title = event.type === "bandit" ? "sᴇʀᴀɴɢᴀɴ ʙᴀɴᴅɪᴛ" : "ᴇɴᴄᴏᴜɴᴛᴇʀ";
        } else {
          hpChange = -dmgTaken;
          extraText = `\n│ 💀 Kalah dari musuh!\n`;
          title = event.type === "bandit" ? "ʙᴀɴᴅɪᴛ" : "ᴍᴏɴsᴛᴇʀ";
        }
        break;
      }

      case "trap": {
        hpChange = -Math.floor(rpg.maxHp * (0.1 + Math.random() * 0.15));
        expGain = Math.floor(Math.random() * (event.maxExp - event.minExp + 1)) + event.minExp;
        addExp(m, expGain);
        extraText = `\n│ 💥 HP berkurang: *${Math.abs(hpChange)}*\n`;
        title = "ᴊᴇʙᴀᴋᴀɴ";
        break;
      }

      case "merchant": {
        const items = ["hpPotion", "mpPotion", "energyDrink", "cookedMeat", "bread", "hpPotion"];
        const freeItem = items[Math.floor(Math.random() * items.length)];
        addItem(m, freeItem, 1);
        drops.push({ item: freeItem, qty: 1 });
        extraText = `\n│ 🎁 Dapat *${ITEM_DB[freeItem]?.name || freeItem}* gratis!\n`;
        title = "ᴘᴇᴅᴀɢᴀɴɢ";
        break;
      }

      case "shrine": {
        const heal = Math.floor(rpg.maxHp * 0.5);
        const mana = Math.floor(rpg.maxMana * 0.5);
        const energy = Math.floor(rpg.maxEnergy * 0.3);
        regenHP(m, heal);
        regenMana(m, mana);
        regenEnergy(m, energy);
        expGain = 50 + Math.floor(Math.random() * 100);
        addExp(m, expGain);
        hpChange = heal;
        extraText = `\n│ ✨ Blessing: HP +${heal} | Mana +${mana} | Energy +${energy}\n`;
        title = "ᴋᴜɪʟ sᴀᴋʀᴀʟ";
        break;
      }

      case "fairy": {
        // Random buff: gems, exp, or item
        const buffType = Math.floor(Math.random() * 3);
        if (buffType === 0) {
          gemGain = 2 + Math.floor(Math.random() * 3);
          addGems(m, gemGain);
          extraText = `\n│ 🧚 Hadiah: *+${gemGain} gems*!\n`;
        } else if (buffType === 1) {
          expGain = 200 + Math.floor(Math.random() * 200);
          addExp(m, expGain);
          extraText = `\n│ 🧚 Blessing: *+${expGain} EXP*!\n`;
        } else {
          const rareItems = ["mithrilOre", "dragonScale", "rebirthStone"];
          const rareItem = rareItems[Math.floor(Math.random() * rareItems.length)];
          addItem(m, rareItem, 1);
          drops.push({ item: rareItem, qty: 1 });
          extraText = `\n│ 🧚 Hadiah: *+1x ${ITEM_DB[rareItem]?.name || rareItem}*!\n`;
        }
        title = "ʙɪᴅᴀᴅᴀʀɪ";
        break;
      }

      case "scroll": {
        expGain = Math.floor(Math.random() * (event.maxExp - event.minExp + 1)) + event.minExp;
        addExp(m, expGain);
        // Scroll gives skill point (if level high enough)
        if (rpg.level >= 20 && Math.random() < 0.3) {
          rpg.skillPoints = (rpg.skillPoints || 0) + 1;
          saveRpg(m, { skillPoints: rpg.skillPoints });
          extraText = `\n│ 📜 Gulungan kuno! *+1 Skill Point!*\n`;
        } else {
          // Just exp + gold
          goldGain = 50 + Math.floor(Math.random() * 100);
          addGold(m, goldGain);
          extraText = `\n│ 📜 Pengetahuan kuno! *+${expGain} EXP, +${goldGain} gold*\n`;
        }
        title = "ɢᴜʟᴜɴɢᴀɴ ᴋᴜɴᴏ";
        break;
      }

      case "nothing":
      default: {
        expGain = 10 + Math.floor(Math.random() * 20);
        addExp(m, expGain);
        title = "ᴘᴇᴛᴜᴀʟᴀɴɢ";
        break;
      }
    }

    // Save HP changes
    if (hpChange < 0) {
      const newHp = Math.max(1, rpg.hp + hpChange);
      saveRpg(m, { hp: newHp });
    }

    setCooldown(m, "lastAdventureV2", ADV2_COOLDOWN);

    let dropText = "";
    if (drops.length > 0) {
      dropText = drops.map(d => `+${d.qty}x ${ITEM_DB[d.item]?.name || d.item}`).join(", ");
    }

    const freshRpg = ensureRpg(m, m.pushName);

    await m.react("🐣");
    let out = `╭─「 *${title}* 」\n`;
    out += `│ 🗺️ ${msg}\n`;
    out += `│\n`;
    if (expGain > 0) out += `│ ✦ EXP: *+${expGain}*\n`;
    if (goldGain > 0) out += `│ 💰 Gold: *+${goldGain}*\n`;
    if (gemGain > 0) out += `│ 💎 Gems: *+${gemGain}*\n`;
    if (dropText) out += `│ 📦 Item: *${dropText}*\n`;
    if (extraText) out += extraText;
    out += `│\n`;
    out += `│ ❤️ HP: *${freshRpg.hp}/${freshRpg.maxHp}*\n`;
    out += `│ ⚡ Energy: *${freshRpg.energy}/${freshRpg.maxEnergy}*\n`;
    out += `╰──────────`;

    return m.reply(out);
  } catch (err) {
    console.error("adventurev2 error:", err);
    await m.react("❌");
    return m.reply(claraWrap("adventurev2", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
