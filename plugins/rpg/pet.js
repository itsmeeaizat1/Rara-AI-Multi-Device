// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// pet.js — Pet System (adopsi, feed, level up, battle)
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaGameBox, gameCTA, novaRpgBox } from "../../src/lib/nova-games.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";

const pluginConfig = {
  name: "pet",
  alias: ["pet", "mypet", "peliharaan", "adoptpet"],
  category: "rpg",
  description: "Pet system — adopsi, feed, level up, battle pet",
  usage: ".pet (cek pet)\n.pet adopt <type> (adopsi)\n.pet feed (beri makan)\n.pet battle (fight pet lain)",
  example: ".pet adopt dragon\n.pet feed",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

const PET_TYPES = [
  { type: "dragon", emoji: "🐉", baseAtk: 50, baseDef: 30, cost: 5000 },
  { type: "wolf", emoji: "🐺", baseAtk: 40, baseDef: 25, cost: 3000 },
  { type: "cat", emoji: "🐱", baseAtk: 20, baseDef: 15, cost: 1000 },
  { type: "phoenix", emoji: "🔥", baseAtk: 60, baseDef: 20, cost: 8000 },
  { type: "unicorn", emoji: "🦄", baseAtk: 35, baseDef: 45, cost: 6000 },
  { type: "tiger", emoji: "🐅", baseAtk: 45, baseDef: 30, cost: 4000 },
  { type: "shark", emoji: "🦈", baseAtk: 55, baseDef: 20, cost: 5000 },
  { type: "eagle", emoji: "🦅", baseAtk: 38, baseDef: 22, cost: 3500 },
];

async function getPetData(db, sender) {
  return await db.getPlayerData?.(sender, "pet") || null;
}

async function savePetData(db, sender, data) {
  await db.setPlayerData?.(sender, "pet", data);
}

async function handler(m, { sock }) {
  try {
    const subCmd = (m.args[0] || "").toLowerCase();
    const db = await getDatabase();

    // ADOPT
    if (subCmd === "adopt" || subCmd === "adopsi") {
      const petType = (m.args[1] || "").toLowerCase();
      if (!petType) {
        let list = "";
        PET_TYPES.forEach(p => {
          list += `${p.emoji} ${p.type} - ${p.cost} gold (ATK:${p.baseAtk} DEF:${p.baseDef})\n`;
        });
                return m.reply(list);
      }

      const petTemplate = PET_TYPES.find(p => p.type === petType);
      if (!petTemplate) {
        await m.react("❌");
        return m.reply(novaRpgBox("pet", `Pet "${petType}" tidak tersedia.`, "error"));
      }

      const existing = await getPetData(db, m.sender);
      if (existing && existing.type) {
        return m.reply(novaRpgBox("pet", `Kamu sudah punya pet: ${existing.emoji} *${existing.type}* (Lv.${existing.level}). Lepas dulu untuk adopsi baru.`, "error"));
      }

      // Cek gold
      try {
        const gold = await db.getGold?.(m.sender) || await db.getBalance?.(m.sender);
        if (gold < petTemplate.cost) {
          await m.react("❌");
          return m.reply(novaRpgBox("pet", `Gold tidak cukup! Butuh ${petTemplate.cost} gold.`, "error"));
        }
        await db.minGold?.(m.sender, petTemplate.cost) || await db.addBalance?.(m.sender, -petTemplate.cost);
      } catch {}

      const pet = {
        type: petTemplate.type,
        emoji: petTemplate.emoji,
        level: 1,
        exp: 0,
        atk: petTemplate.baseAtk,
        def: petTemplate.baseDef,
        hp: 100,
        hunger: 100,
        lastFed: Date.now(),
        battles: 0,
        wins: 0,
      };

      await savePetData(db, m.sender, pet);
      await m.react("🐣");
  await animGeneric(m, sock, "🐾", "Summoning Pet");
      return m.reply(novaGameBox({
        title: "pet", icon: "🐾",
        flavor: "🐾 *PET BARU DIADOPSI!*",
        body: [
          `│ • ${petTemplate.emoji} Pet : ${petTemplate.type}`,
          `│ • ⚔️ ATK : ${pet.atk} | 🛡️ DEF : ${pet.def} | ❤️ HP : ${pet.hp}`,
          "",
          `Jangan lupa feed dengan ${m.prefix}pet feed`,
        ].join("\n"),
        cta: gameCTA("pet"),
      }));
    }

    // CEK PET
    const pet = await getPetData(db, m.sender);
    if (!pet || !pet.type) {
      return m.reply(novaRpgBox("pet", `Kamu belum punya pet. Adopsi dengan: ${m.prefix}pet adopt <type>`, "guide"));
    }

    // FEED
    if (subCmd === "feed" || subCmd === "makan") {
      const now = Date.now();
      const lastFed = pet.lastFed || 0;
      const cooldown = 60 * 60 * 1000; // 1 jam

      if (now - lastFed < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastFed)) / 60000);
        return m.reply(novaRpgBox("pet", `Pet kamu masih kenyang! Tunggu ${remaining} menit lagi.`, "error"));
      }

      const feedCost = 50;
      try { await db.minGold?.(m.sender, feedCost); } catch {}

      pet.hunger = Math.min(100, pet.hunger + 40);
      pet.lastFed = now;
      pet.exp += 20;

      // Level up check
      const expNeeded = pet.level * 100;
      if (pet.exp >= expNeeded) {
        pet.level++;
        pet.exp -= expNeeded;
        pet.atk += 5;
        pet.def += 3;
        pet.hp += 10;
      }

      await savePetData(db, m.sender, pet);
      await m.react("🐣");
      return m.reply(novaGameBox({
        title: "pet", icon: "🍖",
        flavor: "🍖 *PET DIBERI MAKAN!*",
        body: [
          `│ • ${pet.emoji} Pet : ${pet.type}`,
          `│ • 🍖 Hunger : ${pet.hunger}/100`,
          `│ • ✨ EXP : +20`,
          ...(pet.level > 1 ? [`│ • 🎉 Level up! : Lv.${pet.level}`] : []),
        ].join("\n"),
        cta: gameCTA("pet"),
      }));
    }

    // BATTLE
    if (subCmd === "battle" || subCmd === "fight") {
      if (pet.hunger < 20) {
        return m.reply(novaRpgBox("pet", "Pet kamu kelaparan! Feed dulu.", "error"));
      }

      await m.react("🕒");

      // Generate enemy pet
      const enemyPet = PET_TYPES[Math.floor(Math.random() * PET_TYPES.length)];
      const enemyLevel = Math.max(1, pet.level + Math.floor(Math.random() * 3 - 1));
      const enemyAtk = enemyPet.baseAtk + (enemyLevel - 1) * 5;
      const enemyDef = enemyPet.baseDef + (enemyLevel - 1) * 3;

      // Simulasi battle
      const playerScore = pet.atk + pet.def + Math.random() * pet.hp;
      const enemyScore = enemyAtk + enemyDef + Math.random() * 100;
      const won = playerScore > enemyScore;

      pet.battles++;
      if (won) {
        pet.wins++;
        pet.exp += 50;
        const expNeeded = pet.level * 100;
        if (pet.exp >= expNeeded) {
          pet.level++;
          pet.exp -= expNeeded;
          pet.atk += 5;
          pet.def += 3;
          pet.hp += 10;
        }
        try { await db.addGold?.(m.sender, 200 + enemyLevel * 50); } catch {}
      }
      pet.hunger -= 20;

      await savePetData(db, m.sender, pet);
      await m.react("🐣");

      return m.reply(novaGameBox({
        title: "pet", icon: "🐾",
        flavor: won ? "🏆 *PET KAMU MENANG!*" : "💀 *PET KAMU KALAH!*",
        body: [
          `${pet.emoji} ${pet.type} Lv.${pet.level} vs ${enemyPet.emoji} ${enemyPet.type} Lv.${enemyLevel}`,
          "",
          ...(won ? [
            `│ • 💰 Reward : +${200 + enemyLevel * 50} gold`,
            `│ • ✨ EXP : +50`,
            ...(pet.level > 1 ? [`│ • 🎉 Level up! : Lv.${pet.level}`] : []),
          ] : []),
          `│ • 🍖 Hunger : -20 (${pet.hunger}/100)`,
          `│ • 📊 Record : ${pet.wins}W/${pet.battles - pet.wins}L`,
        ].join("\n"),
        cta: gameCTA("pet"),
      }));
    }

    // INFO (default)
    const hungerBar = "█".repeat(Math.floor(pet.hunger / 10)) + "░".repeat(10 - Math.floor(pet.hunger / 10));
    let msg = "";
    msg += `${pet.emoji} *${pet.type}*\n`;
    msg += `Level: *${pet.level}*\n`;
    msg += `EXP: *${pet.exp}/${pet.level * 100}*\n`;
    msg += `ATK: *${pet.atk}* | DEF: *${pet.def}*\n`;
    msg += `HP: *${pet.hp}*\n`;
    // FIX OWNER 2026-09-07: progress bar dikasih jarak baris kosong biar rapi
    msg += `Hunger:\n${hungerBar} ${pet.hunger}%\n\n`;
    msg += `Battles: *${pet.battles}* (${pet.wins}W/${pet.battles - pet.wins}L)\n`;
    msg += `
`;
    msg += `${m.prefix}pet feed - beri makan\n`;
    msg += `${m.prefix}pet battle - fight pet liar\n`;
        return m.reply(novaRpgBox("pet", msg));
  } catch (err) {
    console.error("pet error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("pet", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
