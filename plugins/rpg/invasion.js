// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Invasion — Territory invasion events

import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "invasion",
  alias: ["invasion"],
  aliases: ["invasion", "serangwilayah"],
  category: "rpg",
  description: "Invasi wilayah musuh, dapat loot & exp",
  usage: ".invasion",
  example: ".invasion",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 120, energi: 5, isEnabled: true,
};

const INVASION_RESULTS = [
  { text: "Kamu menyerbu wilayah musuh dan menang!", win: true, reward: { gold: 300, exp: 200 } },
  { text: "Pertempuran sengit, kamu berhasil merebut harta", win: true, reward: { gold: 500, exp: 300, item: "goldOre" } },
  { text: "Musuh terlalu kuat, kamu terpaksa mundur", win: false, penalty: { hp: 50 } },
  { text: "Invasi sukses! Wilayah ditaklukkan", win: true, reward: { gold: 1000, exp: 500, item: "mithrilOre" } },
];

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("invasion", "RPG belum siap. Ketik .daftar dulu.", "error"));
    if ((rpg.energy || 0) < 30) return m.reply(claraWrap("invasion", "Energi tidak cukup. Butuh 30 energi.", "info"));

    await m.react("🕒");
    const result = INVASION_RESULTS[Math.floor(Math.random() * INVASION_RESULTS.length)];
    rpg.energy = (rpg.energy || 0) - 30;

    let msg = "╭─「 *ɪɴᴠᴀsɪᴏɴ* 」\n│ ⚔️ Kamu memulai invasi ke wilayah musuh!\n│\n";

    if (result.win) {
      if (result.reward.gold) { rpg.gold = (rpg.gold || 0) + result.reward.gold; msg += "│ " + result.text + "\n│ 💰 +" + result.reward.gold + " Gold\n"; }
      if (result.reward.exp) { rpg.exp = (rpg.exp || 0) + result.reward.exp; msg += "│ ⭐ +" + result.reward.exp + " EXP\n"; }
      if (result.reward.item) {
        rpg.inventory = rpg.inventory || {};
        rpg.inventory[result.reward.item] = (rpg.inventory[result.reward.item] || 0) + 1;
        msg += "│ 🎎 +1x " + result.reward.item + "\n";
      }
      rpg.totalKills = (rpg.totalKills || 0) + 5;
    } else {
      if (result.penalty?.hp) { rpg.hp = Math.max(1, (rpg.hp || 100) - result.penalty.hp); msg += "│ " + result.text + "\n│ 💔 -" + result.penalty.hp + " HP\n"; }
    }
    msg += "│ ⚡ Sisa energi: " + rpg.energy + "\n╰──────────";
    saveRpg(m, rpg);
    await m.react("🐣");
    return m.reply(msg);
  } catch (e) {
    console.error("invasion error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("invasion", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
