// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Rift — Portal dimensi, distortion, time travel

import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "rift",
  alias: ["rift"],
  aliases: ["rift", "distortion", "timetravel"],
  category: "rpg",
  description: "Portal dimensi, distortion zone, dan perjalanan waktu",
  usage: ".rift | .distortion | .timetravel",
  example: ".rift",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 60, energi: 3, isEnabled: true,
};

const RIFT_EFFECTS = [
  { text: "Mendapatkan ramuan langka", reward: { item: "elixir", count: 1 } },
  { text: "Mendapat 200 gold misterius", reward: { gold: 200 } },
  { text: "Kehilangan 50 HP", penalty: { hp: 50 } },
  { text: "Menemukan harta karun", reward: { gold: 500, exp: 100 } },
  { text: "Dimensi ganjil, dapat 100 EXP", reward: { exp: 100 } },
  { text: "Menemukan fragmen kristal", reward: { item: "mithrilOre", count: 1 } },
];

const DISTORTION_LOOT = ["potion", "elixir", "goldOre", "ironOre", "pearl"];
const DISTORTION_FLAVOR = ["Kabut misterius mengelilingimu", "Cermin waktu retak", "Lubang ke dimensi lain terbuka"];
const TIMETRAVEL_REWARDS = ["+200 EXP", "-100 gold", "skip cooldown", "+500 gold", "+1 skill point"];

async function handler(m, { sock, command }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("rift", "RPG belum siap. Ketik .daftar dulu.", "error"));

    if (command === "rift") {
      if ((rpg.energy || 0) < 20) return m.reply(claraWrap("rift", "Energi tidak cukup. Butuh 20 energi.", "info"));
      await m.react("🕒");
      const effect = RIFT_EFFECTS[Math.floor(Math.random() * RIFT_EFFECTS.length)];
      rpg.energy = (rpg.energy || 0) - 20;

      let resultText = "🌀 Kamu memasuki portal...\n";

      if (effect.reward) {
        if (effect.reward.gold) { rpg.gold = (rpg.gold || 0) + effect.reward.gold; resultText += "💰 +" + effect.reward.gold + " gold\n"; }
        if (effect.reward.exp) { rpg.exp = (rpg.exp || 0) + effect.reward.exp; resultText += "⭐ +" + effect.reward.exp + " EXP\n"; }
        if (effect.reward.item) {
          rpg.inventory = rpg.inventory || {};
          rpg.inventory[effect.reward.item] = (rpg.inventory[effect.reward.item] || 0) + (effect.reward.count || 1);
          resultText += "🎒 +" + (effect.reward.count || 1) + "x " + effect.reward.item + "\n";
        }
      }
      if (effect.penalty) {
        if (effect.penalty.hp) { rpg.hp = Math.max(1, (rpg.hp || 100) - effect.penalty.hp); resultText += "💔 -" + effect.penalty.hp + " HP\n"; }
      }
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("╭─「 *ʀɪғᴛ* 」\n│ " + effect.text + "\n│\n│ " + resultText + "│ ⚡ Sisa energi: " + rpg.energy + "\n╰──────────");
    }

    if (command === "distortion") {
      if ((rpg.energy || 0) < 15) return m.reply(claraWrap("distortion", "Energi tidak cukup. Butuh 15 energi.", "info"));
      await m.react("🕒");
      const loot = DISTORTION_LOOT[Math.floor(Math.random() * DISTORTION_LOOT.length)];
      const flavor = DISTORTION_FLAVOR[Math.floor(Math.random() * DISTORTION_FLAVOR.length)];
      const count = Math.floor(Math.random() * 3) + 1;

      rpg.energy = (rpg.energy || 0) - 15;
      rpg.inventory = rpg.inventory || {};
      for (let i = 0; i < count; i++) rpg.inventory[loot] = (rpg.inventory[loot] || 0) + 1;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("╭─「 *ᴅɪsᴛᴏʀᴛɪᴏɴ* 」\n│ " + flavor + "\n│\n│ 🎁 Kamu mendapat " + count + "x *" + loot + "* dari zona distorsi!\n╰──────────");
    }

    if (command === "timetravel") {
      const lastTT = rpg.lastTimetravel || 0;
      if (Date.now() - lastTT < 86400000) {
        const remaining = 86400000 - (Date.now() - lastTT);
        const hours = Math.floor(remaining / 3600000);
        return m.reply(claraWrap("timetravel", "Kamu sudah time travel hari ini. Coba " + hours + " jam lagi.", "info"));
      }
      await m.react("🕒");
      const reward = TIMETRAVEL_REWARDS[Math.floor(Math.random() * TIMETRAVEL_REWARDS.length)];
      rpg.lastTimetravel = Date.now();
      let effectText = reward;
      if (reward.includes("EXP")) { const amt = parseInt(reward.match(/\d+/)?.[0] || 200); rpg.exp = (rpg.exp || 0) + amt; }
      else if (reward.includes("gold") && reward.includes("-")) { const amt = parseInt(reward.match(/\d+/)?.[0] || 100); rpg.gold = Math.max(0, (rpg.gold || 0) - amt); }
      else if (reward.includes("gold") && !reward.includes("-")) { const amt = parseInt(reward.match(/\d+/)?.[0] || 500); rpg.gold = (rpg.gold || 0) + amt; }
      else if (reward.includes("skill point")) { rpg.skillPoints = (rpg.skillPoints || 0) + 1; }
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("╭─「 *ᴛɪᴍᴇ ᴛʀᴀᴠᴇʟ* 」\n│ ⌛ Kamu menjelajah waktu...\n│ Efek: *" + effectText + "*\n╰──────────");
    }
  } catch (e) {
    console.error("rift error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap(m.command || "rift", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
