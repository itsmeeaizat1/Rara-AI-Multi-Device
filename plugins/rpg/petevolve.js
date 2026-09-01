// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// petevolve.js — Pet Evolution System (Evolve pet to higher stages)
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "petevolve",
  alias: ["petevolve", "evolvepet", "petevolution"],
  category: "rpg",
  description: "Evolusi pet milikmu ke stage yang lebih tinggi untuk meningkatkan +50% atribut stat!",
  usage: ".petevolve (cek status evolusi)\n.petevolve do (lakukan evolusi)\n.petevolve buyfood\n.petevolve buycrystal",
  example: ".petevolve do",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const EVOLUTION_STAGES = {
  dragon: [
    { stage: 1, name: "Dragon", emoji: "🐉", atk: 50, def: 30 },
    { stage: 2, name: "Dragon King", emoji: "🐲", atk: 75, def: 45 },
    { stage: 3, name: "Dragon God", emoji: "⚡🐉", atk: 112, def: 67 },
  ],
  wolf: [
    { stage: 1, name: "Wolf", emoji: "🐺", atk: 40, def: 25 },
    { stage: 2, name: "Wolf Alpha", emoji: "🐺👑", atk: 60, def: 37 },
    { stage: 3, name: "Wolf Deity", emoji: "🌌🐺", atk: 90, def: 55 },
  ],
  cat: [
    { stage: 1, name: "Cat", emoji: "🐱", atk: 20, def: 15 },
    { stage: 2, name: "Cat Knight", emoji: "🐱⚔️", atk: 30, def: 22 },
    { stage: 3, name: "Cat Emperor", emoji: "🐱👑", atk: 45, def: 33 },
  ],
  phoenix: [
    { stage: 1, name: "Phoenix", emoji: "🔥", atk: 60, def: 20 },
    { stage: 2, name: "Phoenix Lord", emoji: "🔥👑", atk: 90, def: 30 },
    { stage: 3, name: "Phoenix Sun God", emoji: "☀️🦅", atk: 135, def: 45 },
  ],
  unicorn: [
    { stage: 1, name: "Unicorn", emoji: "🦄", atk: 35, def: 45 },
    { stage: 2, name: "Unicorn Royal", emoji: "🦄✨", atk: 52, def: 67 },
    { stage: 3, name: "Unicorn Celestial", emoji: "🌠🦄", atk: 78, def: 100 },
  ],
  tiger: [
    { stage: 1, name: "Tiger", emoji: "🐅", atk: 45, def: 30 },
    { stage: 2, name: "Tiger Lord", emoji: "🐅💥", atk: 67, def: 45 },
    { stage: 3, name: "Tiger Emperor", emoji: "🐅⚡", atk: 100, def: 67 },
  ],
  shark: [
    { stage: 1, name: "Shark", emoji: "🦈", atk: 55, def: 20 },
    { stage: 2, name: "Megalodon", emoji: "🦈🌊", atk: 82, def: 30 },
    { stage: 3, name: "Leviathan", emoji: "🌊🐉", atk: 123, def: 45 },
  ],
  eagle: [
    { stage: 1, name: "Eagle", emoji: "🦅", atk: 38, def: 22 },
    { stage: 2, name: "Eagle Commander", emoji: "🦅🛡️", atk: 57, def: 33 },
    { stage: 3, name: "Eagle Titan", emoji: "🦅🌩️", atk: 85, def: 49 },
  ],
};

async function handler(m, { sock }) {
  await m.react("🕒");
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const prefix = m.prefix || ".";
    const args = m.args || [];
    const subCmd = (args[0] || "").toLowerCase();

    let pet = await db.getPlayerData?.(sender, "pet");

    if (!pet || !pet.type) {
      await m.react("❌");
      return m.reply(
        claraWrap(
          "petevolve",
          `Kamu belum memiliki Pet untuk dievolusi!\n\nAdopsi pet terlebih dahulu menggunakan perintah *${prefix}pet adopt <tipe>*`,
          "error"
        )
      );
    }

    const typeKey = (pet.type || "dragon").toLowerCase();
    const stages = EVOLUTION_STAGES[typeKey] || EVOLUTION_STAGES.dragon;

    // Ensure stage, foodCount, crystals exist on pet data
    if (!pet.stage) pet.stage = 1;
    if (pet.foodCount === undefined) pet.foodCount = 5;
    if (pet.crystals === undefined) pet.crystals = 1;

    // Subcommand: BUYFOOD
    if (subCmd === "buyfood" || subCmd === "makanan") {
      const cost = 500;
      try { await db.addGold?.(sender, -cost); } catch {}
      pet.foodCount = (pet.foodCount || 0) + 1;
      await db.setPlayerData?.(sender, "pet", pet);
      await m.react("🐣");
      return m.reply(claraWrap("petevolve", `Berhasil membeli 1x Pet Food seharga 500 Gold!\n\nTotal Pet Food kamu: *${pet.foodCount}* Pcs`, "guide"));
    }

    // Subcommand: BUYCRYSTAL
    if (subCmd === "buycrystal" || subCmd === "kristal") {
      const cost = 2000;
      try { await db.addGold?.(sender, -cost); } catch {}
      pet.crystals = (pet.crystals || 0) + 1;
      await db.setPlayerData?.(sender, "pet", pet);
      await m.react("🐣");
      return m.reply(claraWrap("petevolve", `Berhasil membeli 1x Evolution Crystal seharga 2000 Gold!\n\nTotal Crystal kamu: *${pet.crystals}* Pcs`, "guide"));
    }

    // Current stage data
    const currentStageIdx = pet.stage - 1;
    const currentData = stages[currentStageIdx] || stages[0];

    // If max stage
    if (pet.stage >= 3) {
      let text = `╭─「 ✦ PET MAX EVOLUTION ✦ 」\n`;
      text += `│ ${currentData.emoji} Name : *${pet.name || currentData.name}*\n`;
      text += `│ 🌟 Stage : *Stage 3 (MAX GOD TIER)*\n`;
      text += `│ ⚔️ ATK : ${pet.atk || currentData.atk}\n`;
      text += `│ 🛡️ DEF : ${pet.def || currentData.def}\n`;
      text += `│\n`;
      text += `│ 🏆 Pet kamu telah mencapai kekuatan evolusi tertinggi!\n`;
      text += `╰────  •  ────`;
      await m.react("🐣");
      return m.reply(text);
    }

    const nextStageIdx = pet.stage; // 1 -> index 1 (stage 2), 2 -> index 2 (stage 3)
    const nextData = stages[nextStageIdx];

    // Syarat evolusi
    const reqFood = pet.stage === 1 ? 5 : 10;
    const reqGold = pet.stage === 1 ? 2000 : 5000;
    const reqCrystal = pet.stage === 1 ? 0 : 1;

    // Subcommand: DO / EVOLVE
    if (subCmd === "do" || subCmd === "evolve" || subCmd === "ganti") {
      // Check requirements
      const errors = [];
      if ((pet.foodCount || 0) < reqFood) errors.push(`Pet Food: ${pet.foodCount || 0}/${reqFood} (Beli dengan *${prefix}petevolve buyfood*)`);
      if ((pet.crystals || 0) < reqCrystal) errors.push(`Crystal: ${pet.crystals || 0}/${reqCrystal} (Beli dengan *${prefix}petevolve buycrystal*)`);

      if (errors.length > 0) {
        await m.react("❌");
        return m.reply(
          claraWrap(
            "petevolve",
            `Syarat evolusi ke Stage ${pet.stage + 1} (*${nextData.name}*) belum terpenuhi:\n\n❌ ${errors.join("\n❌ ")}\n💰 Membutuhkan ${reqGold.toLocaleString()} Gold`,
            "error"
          )
        );
      }

      // Execute evolution
      pet.foodCount -= reqFood;
      pet.crystals -= reqCrystal;
      try { await db.addGold?.(sender, -reqGold); } catch {}

      const oldName = pet.name || currentData.name;
      pet.stage += 1;
      pet.name = nextData.name;
      pet.emoji = nextData.emoji;
      pet.atk = Math.floor((pet.atk || currentData.atk) * 1.5);
      pet.def = Math.floor((pet.def || currentData.def) * 1.5);

      await db.setPlayerData?.(sender, "pet", pet);

      // Evolution Animation Box Output
      let animText = `╭─「 ✦ ANIMASI EVOLUSI PET ✦ 」\n`;
      animText += `│ ⚡ Pet kamu menyerap energi sihir kuno...\n`;
      animText += `│ ✨ Tubuh *${oldName}* dipenuhi aura cahaya terang!\n`;
      animText += `│ 💥 *BOOM! EVOLUSI BERHASIL!*\n`;
      animText += `│\n`;
      animText += `│ 🐾 Pet Baru : *${pet.emoji} ${pet.name}*\n`;
      animText += `│ 🌟 Tier Stage : *Stage ${pet.stage}*\n`;
      animText += `│ ⚔️ ATK Baru : *${pet.atk}* (+50% bonus)\n`;
      animText += `│ 🛡️ DEF Baru : *${pet.def}* (+50% bonus)\n`;
      animText += `╰────  •  ────`;

      await m.react("🐣");
      return m.reply(animText);
    }

    // Default: Show evolution progress & requirements
    let statusText = `╭─「 ✦ INFO EVOLUSI PET ✦ 」\n`;
    statusText += `│ 🐾 Pet Saat Ini : ${currentData.emoji} *${pet.name || currentData.name}*\n`;
    statusText += `│ 📊 Stage : *Stage ${pet.stage}/3*\n`;
    statusText += `│ ⚔️ ATK: ${pet.atk || currentData.atk} | 🛡️ DEF: ${pet.def || currentData.def}\n`;
    statusText += `│\n`;
    statusText += `│ 🎯 Target Evolusi : Stage ${pet.stage + 1} (*${nextData.emoji} ${nextData.name}*)\n`;
    statusText += `│ 📈 Bonus Stat : *+50% All Stats*\n`;
    statusText += `│\n`;
    statusText += `│ 📋 Syarat Evolusi Stage ${pet.stage + 1}:\n`;
    statusText += `│  • 🍖 Makanan Pet : ${pet.foodCount || 0}/${reqFood}\n`;
    statusText += `│  • 💰 Gold : ${reqGold.toLocaleString()} Gold\n`;
    if (reqCrystal > 0) {
      statusText += `│  • 🔮 Crystal : ${pet.crystals || 0}/${reqCrystal}\n`;
    }
    statusText += `│\n`;
    statusText += `│ 📌 Ketik *${prefix}petevolve do* untuk melakukan evolusi!\n`;
    statusText += `╰────  •  ────`;

    await m.react("🐣");
    return m.reply(statusText);
  } catch (err) {
    await m.react("❌");
    return m.reply(claraWrap("petevolve", `Terjadi kesalahan: ${err.message}`, "error"));
  }
}

export { pluginConfig, pluginConfig as config, handler };
