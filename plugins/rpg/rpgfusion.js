// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Fusion — Gabung 2 item jadi 1 item lebih kuat
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgfusion",
  alias: ["fusionrpg", "gabungitem", "fuseitem", "fusion", "gabungbenda"],
  category: "rpg",
  description: "RPG Fusion — Gabung 2 item jadi 1 item lebih kuat",
  usage: ".rpgfusion <item1> <item2>\n.rpgfusion list — Daftar resep fusion",
  example: ".rpgfusion iron diamond",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 10,
  isEnabled: true,
};

// Fusion recipes: input1 + input2 = output
const RECIPES = [
  { in1: "iron", in2: "iron", out: "steel", outName: "Steel Bar", emoji: "🔩", exp: 20 },
  { in1: "wood", in2: "wood", out: "plank", outName: "Wood Plank", emoji: "🪵", exp: 10 },
  { in1: "iron", in2: "wood", out: "sword", outName: "Iron Sword", emoji: "🗡️", exp: 30 },
  { in1: "diamond", in2: "iron", out: "diamondSword", outName: "Diamond Sword", emoji: "⚔️", exp: 50 },
  { in1: "rock", in2: "rock", out: "brick", outName: "Stone Brick", emoji: "🧱", exp: 15 },
  { in1: "string", in2: "wood", out: "bow", outName: "Wooden Bow", emoji: "🏹", exp: 25 },
  { in1: "diamond", in2: "diamond", out: "diamondArmor", outName: "Diamond Armor", emoji: "🛡️", exp: 80 },
  { in1: "emerald", in2: "iron", out: "emeraldRing", outName: "Emerald Ring", emoji: "💍", exp: 60 },
  { in1: "iron", in2: "rock", out: "pickaxe", outName: "Iron Pickaxe", emoji: "⛏️", exp: 25 },
  { in1: "wood", in2: "string", out: "fishingrod", outName: "Fishing Rod", emoji: "🎣", exp: 20 },
  { in1: "diamond", in2: "emerald", out: "crystal", outName: "Mystic Crystal", emoji: "🔮", exp: 100 },
  { in1: "emerald", in2: "emerald", out: "emeraldAmulet", outName: "Emerald Amulet", emoji: "📿", exp: 70 },
];

const VALID_INPUTS = ["iron", "wood", "diamond", "rock", "string", "emerald"];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const player = ensurePlayer(m);

    if (!args[0] || args[0] === "list" || args[0] === "help") {
      const lines = [
        "RPG FUSION",
        "Gabung 2 material jadi item baru",
        "",
        "RESEP FUSION:",
      ];
      RECIPES.forEach((r, i) => {
        lines.push((i + 1) + ". " + r.in1 + " + " + r.in2 + " = " + r.emoji + " " + r.outName);
        lines.push("   Exp: +" + r.exp);
      });
      lines.push("");
      lines.push("MATERIAL: " + VALID_INPUTS.join(", "));
      lines.push("");
      lines.push("CARA PAKAI:");
      lines.push(usedPrefix + "rpgfusion <material1> <material2>");
      lines.push("Contoh: " + usedPrefix + "rpgfusion iron diamond");
      return m.reply(claraWrap("RPG Fusion", lines, "info"));
    }

    const item1 = args[0]?.toLowerCase();
    const item2 = args[1]?.toLowerCase();

    if (!item1 || !item2) {
      return m.reply(claraWrap("RPG Fusion", [
        "Butuh 2 material!",
        "Format: " + usedPrefix + "rpgfusion <item1> <item2>",
        "Contoh: " + usedPrefix + "rpgfusion iron wood",
      ], "warn"));
    }

    if (!VALID_INPUTS.includes(item1) || !VALID_INPUTS.includes(item2)) {
      return m.reply(claraWrap("RPG Fusion", [
        "Material tidak valid!",
        "Tersedia: " + VALID_INPUTS.join(", "),
      ], "warn"));
    }

    // Check player has both items
    if ((player[item1] || 0) < 1) {
      return m.reply(claraWrap("RPG Fusion", item1 + " tidak cukup (butuh 1, punya " + (player[item1] || 0) + ")", "warn"));
    }
    if ((player[item2] || 0) < 1) {
      return m.reply(claraWrap("RPG Fusion", item2 + " tidak cukup (butuh 1, punya " + (player[item2] || 0) + ")", "warn"));
    }

    // Find recipe (check both orderings)
    const recipe = RECIPES.find(r =>
      (r.in1 === item1 && r.in2 === item2) || (r.in1 === item2 && r.in2 === item1)
    );

    if (!recipe) {
      return m.reply(claraWrap("RPG Fusion", [
        "Tidak ada resep untuk " + item1 + " + " + item2,
        "Ketik " + usedPrefix + "rpgfusion list",
      ], "warn"));
    }

    // Consume materials
    player[item1] = (player[item1] || 0) - 1;
    player[item2] = (player[item2] || 0) - 1;

    // Give output item
    player[recipe.out] = (player[recipe.out] || 0) + 1;

    // Give exp
    if (player.exp !== undefined) player.exp += recipe.exp;
    if (player.totalExp !== undefined) player.totalExp += recipe.exp;

    savePlayer(m, player);

    return m.reply(claraWrap("RPG Fusion", [
      "FUSION BERHASIL!",
      "",
      "Material: " + item1 + " + " + item2,
      "Hasil: " + recipe.emoji + " " + recipe.outName + " x1",
      "Exp: +" + recipe.exp,
      "",
      recipe.outName + " tersimpan di inventory",
      "Ketik .inventory untuk cek",
    ], "info"));
  } catch (e) {
    console.error("[RpgFusion]", e);
    return m.reply(claraWrap("RPG Fusion", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
