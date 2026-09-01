// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Nebang — Cut trees for wood (different tree types, scaling)

import {
  ensureRpg, addExp, addGold, useEnergy, addItem, ITEM_DB,
  checkCooldown, setCooldown, formatTime
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "nebang",
  alias: ["nebang", "tebang", "menebang", "woodcutting"],
  category: "rpg",
  description: "Menebang pohon untuk kayu dan gold",
  usage: ".nebang",
  example: ".nebang",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const NEBANG_ENERGY = 6;
const NEBANG_COOLDOWN = 45 * 1000;

const TREES = [
  { name: "Pohon Pinus", minLv: 1, gold: [5, 20], exp: [10, 25], drop: "pineWood", dropChance: 80 },
  { name: "Pohon Mahoni", minLv: 5, gold: [15, 40], exp: [20, 45], drop: "mahoganyWood", dropChance: 70 },
  { name: "Pohon Jati", minLv: 15, gold: [30, 70], exp: [35, 70], drop: "teakWood", dropChance: 60 },
  { name: "Pohon Ebony", minLv: 30, gold: [60, 120], exp: [50, 100], drop: "ebonyWood", dropChance: 50 },
  { name: "Pohon Mistik", minLv: 50, gold: [100, 250], exp: [80, 150], drop: "mysticWood", dropChance: 35 },
];

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("nebang", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const cd = checkCooldown(m, "lastNebang");
    if (cd) {
      await m.react("🚫");
      return m.reply(claraWrap("nebang", `Cooldown tebang tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < NEBANG_ENERGY) {
      await m.react("🚫");
      return m.reply(claraWrap("nebang", `Energi kurang! Butuh *${NEBANG_ENERGY}*. Energy: *${rpg.energy}/${rpg.maxEnergy}*`, "warn"));
    }

    // Pick tree based on level
    const available = TREES.filter(t => rpg.level >= t.minLv);
    const tree = available[Math.floor(Math.random() * available.length)];

    useEnergy(m, NEBANG_ENERGY, sock);

    const goldGain = Math.floor(Math.random() * (tree.gold[1] - tree.gold[0] + 1)) + tree.gold[0];
    const expGain = Math.floor(Math.random() * (tree.exp[1] - tree.exp[0] + 1)) + tree.exp[0];

    addGold(m, goldGain);
    addExp(m, expGain);

    // Drop wood
    let dropText = "";
    if (Math.random() * 100 < tree.dropChance) {
      const qty = Math.floor(Math.random() * 3) + 1;
      addItem(m, tree.drop, qty);
      dropText = `\n│ 🪵 +${qty}x ${ITEM_DB[tree.drop]?.name || tree.drop}`;
    }

    setCooldown(m, "lastNebang", NEBANG_COOLDOWN);

    await m.react("🐣");
    let msg = `╭─「 *ɴᴇʙᴀɴɢ* 」\n`;
    msg += `│ 🌲 Pohon: *${tree.name}*\n`;
    msg += `│ 🪓 Kamu menebang dengan susah payah...\n`;
    msg += `│\n`;
    msg += `│ 📦 *ʜᴀsɪʟ ɴᴇʙᴀɴɢ*\n`;
    msg += `│ 💰 Gold: *+${goldGain}*\n`;
    msg += `│ ✦ EXP: *+${expGain}*\n`;
    if (dropText) msg += dropText + "\n";
    msg += `│\n`;
    msg += `│ ⚡ Energy: *${rpg.energy - NEBANG_ENERGY}/${rpg.maxEnergy}*\n`;
    msg += `╰──────────`;

    return m.reply(msg);
  } catch (err) {
    console.error("nebang error:", err);
    await m.react("❌");
    return m.reply(claraWrap("nebang", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
