// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import {   separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "petevolve",
  alias: ["petevolusi", "evolvepet", "evolusipet"],
  category: "game",
  description: "Evolusi pet ke tier lebih tinggi (Premium only)",
  usage: ".petevolve (cek status) / .petevolve go (evolusi)",
  example: ".petevolve\n.petevolve go",
  isOwner: false,
  isPremium: true,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

// Tier system: Normal → Rare → Epic → Legendary → Mythic
const TIERS = [
  { name: "Normal", emoji: "⚪", statMult: 1.0, color: "biasa" },
  { name: "Rare", emoji: "🔵", statMult: 1.5, color: "biru" },
  { name: "Epic", emoji: "🟣", statMult: 2.0, color: "ungu" },
  { name: "Legendary", emoji: "🟡", statMult: 3.0, color: "emas" },
  { name: "Mythic", emoji: "🔴", statMult: 5.0, color: "merah" },
];

// Evolution requirements per tier
const EVO_REQUIREMENTS = [
  { from: 0, to: 1, gold: 5000, petLevel: 5, items: { "Crystal Biasa": 3 } },
  { from: 1, to: 2, gold: 15000, petLevel: 15, items: { "Crystal Langka": 5, "Essence Magic": 2 } },
  { from: 2, to: 3, gold: 50000, petLevel: 30, items: { "Crystal Epic": 10, "Dragon Scale": 3 } },
  { from: 3, to: 4, gold: 150000, petLevel: 50, items: { "Crystal Mythic": 20, "Phoenix Feather": 5, "Soul Stone": 3 } },
];

// Base pet stats per type
const PET_BASE_STATS = {
  cat: { hp: 50, atk: 8, def: 4, spd: 10, luck: 15 },
  dog: { hp: 60, atk: 12, def: 8, spd: 8, luck: 5 },
  bird: { hp: 35, atk: 6, def: 3, spd: 15, luck: 20 },
  fish: { hp: 40, atk: 5, def: 5, spd: 6, luck: 18 },
  rabbit: { hp: 45, atk: 7, def: 6, spd: 12, luck: 12 },
  lion: { hp: 80, atk: 18, def: 10, spd: 8, luck: 10 },
  wolf: { hp: 70, atk: 16, def: 12, spd: 12, luck: 8 },
  phoenix: { hp: 60, atk: 20, def: 6, spd: 18, luck: 15 },
  dragon: { hp: 100, atk: 25, def: 15, spd: 10, luck: 12 },
  thunderbunny: { hp: 55, atk: 15, def: 8, spd: 20, luck: 18 },
};

const PET_NAMES = {
  cat: "Kucing",
  dog: "Anjing",
  bird: "Burung",
  fish: "Ikan",
  rabbit: "Kelinci",
  lion: "Singa",
  wolf: "Serigala",
  phoenix: "Phoenix",
  dragon: "Naga",
  thunderbunny: "Thunder Bunny",
};

const PET_EMOJIS = {
  cat: "🐱", dog: "🐕", bird: "🐦", fish: "🐟", rabbit: "🐰",
  lion: "🦁", wolf: "🐺", phoenix: "🔥", dragon: "🐉", thunderbunny: "⚡",
};

function getPetStats(pet) {
  const base = PET_BASE_STATS[pet.type] || PET_BASE_STATS.cat;
  const tierIdx = pet.evoTier || 0;
  const mult = TIERS[tierIdx].statMult;
  return {
    hp: Math.floor(base.hp * mult * (1 + (pet.level - 1) * 0.05)),
    atk: Math.floor(base.atk * mult * (1 + (pet.level - 1) * 0.05)),
    def: Math.floor(base.def * mult * (1 + (pet.level - 1) * 0.05)),
    spd: Math.floor(base.spd * mult * (1 + (pet.level - 1) * 0.05)),
    luck: Math.floor(base.luck * mult * (1 + (pet.level - 1) * 0.05)),
  };
}

function hasItems(userInv, required) {
  for (const [item, qty] of Object.entries(required)) {
    if ((userInv?.[item] || 0) < qty) return false;
  }
  return true;
}

function consumeItems(userInv, required) {
  for (const [item, qty] of Object.entries(required)) {
    userInv[item] = (userInv[item] || 0) - qty;
    if (userInv[item] <= 0) delete userInv[item];
  }
}

async function handler(m, { sock, config: botConfig }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  const prefix = botConfig.command?.prefix || ".";

  if (!user.rpg) user.rpg = {};
  if (!user.inventory) user.inventory = {};

  const pet = user.rpg.pet;
  const args = m.args || [];
  const subCmd = args[0]?.toLowerCase();

  // No pet
  if (!pet || !pet.type) {
    return sendReplyWithNav(
      sock,
      m,
      claraWrap("Pet Evolve", ["Kamu belum punya pet!",
        `Adopsi dulu: \`${prefix}petshop buy cat\``].join("\n")) + "\n" +
      tipText("Fitur Premium: evolusi pet ke tier lebih tinggi"),
      "petevolve"
    );
  }

  const tierIdx = pet.evoTier || 0;
  const currentTier = TIERS[tierIdx];
  const maxTier = TIERS.length - 1;

  // Show status
  if (!subCmd || subCmd === "info" || subCmd === "cek") {
    const stats = getPetStats(pet);
    let text =
      claraWrap("Pet Evolve", [`◦ Nama: *${pet.name || PET_NAMES[pet.type] || "Pet"}*`,
        `◦ Tipe: *${PET_EMOJIS[pet.type] || "🐾"} ${PET_NAMES[pet.type] || pet.type}*`,
        `◦ Tier: *${currentTier.emoji} ${currentTier.name}*`,
        `◦ Level: *${pet.level || 1}*`,
        `◦ EXP: *${pet.exp || 0}/${(pet.level || 1) * 100}*`].join("\n")) + "\n\n" +
      claraWrap("STATS", [`◦ HP: *${stats.hp}*`, `◦ ATK: *${stats.atk}*`, `◦ DEF: *${stats.def}*`, `◦ SPD: *${stats.spd}*`, `◦ LUCK: *${stats.luck}*`].join("\n"));

    if (tierIdx < maxTier) {
      const req = EVO_REQUIREMENTS[tierIdx];
      const nextTier = TIERS[req.to];
      const goldOk = (user.koin || 0) >= req.gold;
      const levelOk = (pet.level || 1) >= req.petLevel;
      const itemsOk = hasItems(user.inventory, req.items);

      text += "\n\n" + claraWrap("EVOLUSI SELANJUTNYA", [
        `◦ Target: *${nextTier.emoji} ${nextTier.name}*`,
        `◦ Level pet: *${pet.level || 1}/${req.petLevel}* ${levelOk ? "✅" : "❌"}`,
        `◦ Gold: *${(user.koin || 0).toLocaleString("id-ID")}/${req.gold.toLocaleString("id-ID")}* ${goldOk ? "✅" : "❌"}`,
      ]);

      text += "\n" + "MATERIAL DIBUTUHKAN:\n";
      for (const [item, qty] of Object.entries(req.items)) {
        const have = user.inventory?.[item] || 0;
        text += `${item}: *${have}/${qty}* ${have >= qty ? "✅" : "❌"}\n`;
      }

      const canEvolve = goldOk && levelOk && itemsOk;
      text += "\n" + separator("━", 22) + "\n";
      if (canEvolve) {
        text += tipText(`Semua syarat terpenuhi! Ketik \`${prefix}petevolve go\``);
      } else {
        text += tipText("Syarat belum terpenuhi. Lengkapi dulu!");
      }
    } else {
      text += "\n\n" + separator("━", 22) + "\n" +
      tipText("Pet kamu udah di tier MAX (Mythic)! 🔥");
    }

    text += "\n" + tipText(`Ketik ${prefix}menu untuk kembali`);
    return sendReplyWithNav(sock, m, text, "petevolve");
  }

  // Evolve
  if (subCmd === "go" || subCmd === "evolve" || subCmd === "evolusi") {
    if (tierIdx >= maxTier) {
      return sendReplyWithNav(
        sock,
        m,
        claraWrap("Pet Evolve", [`Pet kamu udah di tier *${currentTier.emoji} ${currentTier.name}*!`,
          "Tidak bisa dievolusi lagi!"].join("\n")) + "\n" +
        tipText("Petmu udah di puncak kekuatan! 🔥"),
        "petevolve"
      );
    }

    const req = EVO_REQUIREMENTS[tierIdx];
    const nextTier = TIERS[req.to];

    // Check level
    if ((pet.level || 1) < req.petLevel) {
      return sendReplyWithNav(
        sock,
        m,
        claraWrap("Pet Evolve", [`Level pet kurang!`,
          `Butuh: *Level ${req.petLevel}*`,
          `Saat ini: *Level ${pet.level || 1}*`].join("\n")) + "\n\n" +
        tipText(`Tingkatkan level pet lewat \`${prefix}training\` atau \`${prefix}hunt\``),
        "petevolve"
      );
    }

    // Check gold
    if ((user.koin || 0) < req.gold) {
      return sendReplyWithNav(
        sock,
        m,
        claraWrap("Pet Evolve", [`Gold kurang!`,
          `Butuh: *${req.gold.toLocaleString("id-ID")}*`,
          `Saat ini: *${(user.koin || 0).toLocaleString("id-ID")}*`].join("\n")) + "\n\n" +
        tipText(`Kumpulkan gold lewat \`${prefix}hunt\` atau \`${prefix}daily\``),
        "petevolve"
      );
    }

    // Check items
    if (!hasItems(user.inventory, req.items)) {
      return sendReplyWithNav(
        sock,
        m,
        claraWrap("Pet Evolve", ["Material kurang!"].join("\n")) + "\n" +
        "MATERIAL DIBUTUHKAN:\n" +
        Object.entries(req.items).map(([item, qty]) => {
          const have = user.inventory?.[item] || 0;
          return `${item}: *${have}/${qty}* ${have >= qty ? "✅" : "❌"}`;
        }).join("\n") +
        "\n\n" + tipText("Cari material lewat berburu, dungeon, atau expedition"),
        "petevolve"
      );
    }

    // All requirements met — EVOLVE!
    await m.react("🕐");

    // Deduct gold
    user.koin = (user.koin || 0) - req.gold;

    // Consume items
    consumeItems(user.inventory, req.items);

    // Evolve pet
    const oldTierName = currentTier.name;
    pet.evoTier = req.to;

    // Boost HP on evolve
    const newStats = getPetStats(pet);

    db.save();

    await m.react("✅");

    let text =
      claraWrap("Pet Evolve", [`◦ Pet: *${PET_EMOJIS[pet.type] || "🐾"} ${pet.name || PET_NAMES[pet.type]}*`,
        `◦ ${currentTier.emoji} ${oldTierName} → *${nextTier.emoji} ${nextTier.name}*`].join("\n")) + "\n\n" +
      claraWrap("STATS BARU", [`◦ HP: *${newStats.hp}*`, `◦ ATK: *${newStats.atk}*`, `◦ DEF: *${newStats.def}*`, `◦ SPD: *${newStats.spd}*`, `◦ LUCK: *${newStats.luck}*`].join("\n")) + "\n\n" +
      separator("━", 22) + "\n" +
      tipText(`Selamat! Petmu udah naik ke tier ${nextTier.name}!`);

    if (tierIdx + 1 < maxTier) {
      text += "\n" + tipText(`Evolusi selanjutnya: \`${prefix}petevolve\``);
    } else {
      text += "\n" + tipText("Petmu udah di tier MAX! 🔥");
    }

    return sendReplyWithNav(sock, m, text, "petevolve");
  }

  // Unknown subcommand
  return sendReplyWithNav(
    sock,
    m,
    claraWrap("Pet Evolve", [`◦ \`${prefix}petevolve\` — Cek status & syarat evolusi`,
      `◦ \`${prefix}petevolve go\` — Lakukan evolusi`].join("\n")) + "\n\n" +
    tipText("Fitur Premium: evolusi pet Normal → Mythic"),
    "petevolve"
  );
}

export { pluginConfig as config, handler };
