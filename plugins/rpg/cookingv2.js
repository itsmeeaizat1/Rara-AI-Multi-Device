// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// cookingv2.js — Cooking System v2 (10 recipes, buffs, ingredients, animation)
import { getDatabase } from "../../src/lib/nova-database.js";
import { animCraft } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "cookingv2",
  alias: ["cookingv2", "cookv2", "masakv2"],
  category: "rpg",
  description: "Sistem memasak v2 — 10 resep hidangan dengan buff, pemulihan HP, dan energi",
  usage: ".cookingv2 list\n.cookingv2 cook <resep>\n.cookingv2 inventory\n.cookingv2 gather",
  example: ".cookingv2 cook nasigoreng\n.cookingv2 list",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const RECIPES = [
  { id: "nasigoreng", name: "Nasi Goreng", effectStr: "+50 HP", hp: 50, energy: 0, thirst: 0, buff: null, ingredients: { beras: 2, telur: 1 } },
  { id: "sate", name: "Sate", effectStr: "+30 ATK (30 min)", hp: 0, energy: 0, thirst: 0, buff: { type: "ATK", value: 30, durationMs: 30 * 60 * 1000 }, ingredients: { daging: 2, bumbu: 1 } },
  { id: "bakso", name: "Bakso", effectStr: "+100 HP", hp: 100, energy: 0, thirst: 0, buff: null, ingredients: { daging: 3, tepung: 1 } },
  { id: "rendang", name: "Rendang", effectStr: "+50 DEF (30 min)", hp: 0, energy: 0, thirst: 0, buff: { type: "DEF", value: 50, durationMs: 30 * 60 * 1000 }, ingredients: { daging: 4, santan: 2 } },
  { id: "soto", name: "Soto", effectStr: "+80 HP & +20 Energi", hp: 80, energy: 20, thirst: 0, buff: null, ingredients: { daging: 2, kuah: 1, sayur: 1 } },
  { id: "gadogado", name: "Gado-gado", effectStr: "+40 HP", hp: 40, energy: 0, thirst: 0, buff: null, ingredients: { sayur: 2, bumbu: 1 } },
  { id: "nasipadang", name: "Nasi Padang", effectStr: "+150 HP", hp: 150, energy: 0, thirst: 0, buff: null, ingredients: { beras: 3, daging: 2, sambal: 1 } },
  { id: "ayamgeprek", name: "Ayam Geprek", effectStr: "+25 ATK", hp: 0, energy: 0, thirst: 0, buff: { type: "ATK", value: 25, durationMs: 20 * 60 * 1000 }, ingredients: { ayam: 2, cabai: 2 } },
  { id: "esteh", name: "Es Teh", effectStr: "+50 Thirst", hp: 0, energy: 0, thirst: 50, buff: null, ingredients: { teh: 1, es: 1, gula: 1 } },
  { id: "kopi", name: "Kopi", effectStr: "+30 Energi", hp: 0, energy: 30, thirst: 0, buff: null, ingredients: { bijikopi: 2, air: 1 } },
];

const INGREDIENT_NAMES = {
  beras: "🌾 Beras",
  telur: "🥚 Telur",
  daging: "🥩 Daging",
  bumbu: "🧂 Bumbu",
  tepung: "🌾 Tepung",
  santan: "🥥 Santan",
  kuah: "🍲 Kuah Kaldu",
  sayur: "🥬 Sayur Fresh",
  sambal: "🌶️ Sambal",
  ayam: "🍗 Daging Ayam",
  cabai: "🌶️ Cabai Rawit",
  teh: "🍃 Daun Teh",
  es: "🧊 Es Batu",
  gula: "🍬 Gula",
  bijikopi: "☕ Biji Kopi",
  air: "💧 Air Murni",
};

async function handler(m, { sock }) {
  await m.react("🕒");
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const prefix = m.prefix || ".";
    const args = m.args || [];
    const subCmd = (args[0] || "").toLowerCase();

    let data = (await db.getPlayerData?.(sender, "cookingv2")) || {
      inventory: { beras: 5, telur: 3, daging: 5, bumbu: 3, sayur: 4, teh: 2, es: 2, gula: 2, bijikopi: 2, air: 2 },
      cookedHistory: {},
      activeBuffs: [],
      lastGather: 0,
    };

    if (!data.inventory) data.inventory = {};

    // Subcommand: INVENTORY
    if (subCmd === "inventory" || subCmd === "inv" || subCmd === "bahan") {
      let text = "";
      text += `Bahan-bahan yang kamu miliki dari berburu, memancing & bertani:\n`;
      text += `
`;
      let count = 0;
      for (const [itemKey, label] of Object.entries(INGREDIENT_NAMES)) {
        const qty = data.inventory[itemKey] || 0;
        text += `${label} : *${qty}* Pcs\n`;
        count++;
      }
      text += `
`;
      text += `💡 Kumpulkan bahan baru dengan *${prefix}cookingv2 gather*\n`;
      
      await m.react("🐣");
      return m.reply(text);
    }

    // Subcommand: GATHER
    if (subCmd === "gather" || subCmd === "cari" || subCmd === "berburu") {
      const now = Date.now();
      const cooldownMs = 60 * 1000; // 1 min
      if (now - (data.lastGather || 0) < cooldownMs) {
        const remaining = Math.ceil((cooldownMs - (now - data.lastGather)) / 1000);
        await m.react("❌");
        return m.reply(novaRpgBox("cookingv2", `Kamu masih lelah mencari bahan.\n\nTunggu *${remaining} detik* lagi!`, "error"));
      }

      data.lastGather = now;
      const keys = Object.keys(INGREDIENT_NAMES);
      const found = [];
      const numItems = Math.floor(Math.random() * 3) + 2; // 2-4 items

      for (let i = 0; i < numItems; i++) {
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const qty = Math.floor(Math.random() * 2) + 1;
        data.inventory[randomKey] = (data.inventory[randomKey] || 0) + qty;
        found.push(`${qty}x ${INGREDIENT_NAMES[randomKey]}`);
      }

      await db.setPlayerData?.(sender, "cookingv2", data);

      let text = "";
      text += `🌲 Kamu berhasil mengumpulkan bahan masak:\n`;
      found.forEach((f) => {
        text += `• ${f}\n`;
      });
      
      await m.react("🐣");
      return m.reply(text);
    }

    // Subcommand: LIST
    if (subCmd === "list" || subCmd === "resep") {
      let text = "";
      text += `Pilih makanan untuk dimasak & dapatkan efek buff!

`;
      RECIPES.forEach((r, idx) => {
        const reqStr = Object.entries(r.ingredients)
          .map(([k, q]) => `${q}x ${(INGREDIENT_NAMES[k] || k).split(" ")[1] || k}`)
          .join(", ");
        text += `*${idx + 1}. ${r.name}* (${r.id})\n`;
        text += `Efek : ${r.effectStr}\n`;
        text += `📦 Bahan : ${reqStr}\n`;
      });
      text += `📌 Cara memasak: *${prefix}cookingv2 cook <id_resep>*\n`;
      
      await m.react("🐣");
      return m.reply(text);
    }

    // Subcommand: COOK
    if (subCmd === "cook" || subCmd === "masak") {
      const recipeInput = (args[1] || "").toLowerCase();
      if (!recipeInput) {
        await m.react("❌");
        return m.reply(
          novaRpgBox("cookingv2", `Sebutkan nama resep yang ingin dimasak!\n\nContoh: *${prefix}cookingv2 cook nasigoreng*\nKetik *${prefix}cookingv2 list* untuk melihat daftar resep.`, "guide")
        );
      }

      const recipe = RECIPES.find((r) => r.id === recipeInput || r.name.toLowerCase().includes(recipeInput));
      if (!recipe) {
        await m.react("❌");
        return m.reply(
          novaRpgBox("cookingv2", `Resep *${recipeInput}* tidak ditemukan!\n\nKetik *${prefix}cookingv2 list* untuk daftar 10 resep lengkap.`, "error")
        );
      }

      // Check ingredients
      const missing = [];
      for (const [ingKey, qtyNeeded] of Object.entries(recipe.ingredients)) {
        const have = data.inventory[ingKey] || 0;
        if (have < qtyNeeded) {
          missing.push(`${qtyNeeded - have}x ${INGREDIENT_NAMES[ingKey] || ingKey}`);
        }
      }

      if (missing.length > 0) {
        await m.react("❌");
        return m.reply(
          novaRpgBox(
            "cookingv2",
            `Bahan kamu tidak cukup untuk memasak *${recipe.name}*!\n\n❌ Kurang:\n - ${missing.join("\n - ")}\n\nKumpulkan bahan dengan *${prefix}cookingv2 gather* atau cek *${prefix}cookingv2 inventory*.`,
            "error"
          )
        );
      }

      // Deduct ingredients
      for (const [ingKey, qtyNeeded] of Object.entries(recipe.ingredients)) {
        data.inventory[ingKey] -= qtyNeeded;
      }

      // Record cooking history
      data.cookedHistory[recipe.id] = (data.cookedHistory[recipe.id] || 0) + 1;

      // Apply buff or effects if applicable
      if (recipe.buff) {
        if (!data.activeBuffs) data.activeBuffs = [];
        data.activeBuffs.push({
          type: recipe.buff.type,
          value: recipe.buff.value,
          expiresAt: Date.now() + recipe.buff.durationMs,
        });
      }

      if (recipe.energy > 0) {
        try { await db.addEnergi?.(sender, recipe.energy); } catch {}
      }

      await db.setPlayerData?.(sender, "cookingv2", data);

      // Cooking Animation Box Output
      let animText = "";
      animText += `🔪 Memotong bahan & meracik bumbu rahasia...\n`;
      animText += `🔥 Memasak ${recipe.name} di atas tungku api membara...\n`;
      animText += ` *ᴍᴇᴍᴀꜱᴀᴋ ʙᴇʀʜᴀꜱɪʟ!* 🎉\n`;
      animText += `
`;
      animText += `🍽️ Hidangan : *${recipe.name}*\n`;
      animText += `🌟 Efek Diterima : *${recipe.effectStr}*\n`;
      if (recipe.buff) {
        animText += `⚡ Buff ${recipe.buff.type} +${recipe.buff.value} telah diaktifkan!\n`;
      }
      
      await m.react("🐣");
      return m.reply(animText);
    }

    // Default Guide
    let defaultMsg = `Sistem Memasak RPG v2!\n\n`;
    defaultMsg += `📌 *Perintah yang tersedia:*\n`;
    defaultMsg += `• *${prefix}cookingv2 list* - Melihat 10 resep hidangan\n`;
    defaultMsg += `• *${prefix}cookingv2 cook <resep>* - Memasak makanan\n`;
    defaultMsg += `• *${prefix}cookingv2 inventory* - Cek persediaan bahan\n`;
    defaultMsg += `• *${prefix}cookingv2 gather* - Mencari/mengumpulkan bahan\n`;

    await m.react("🐣");
    return m.reply(novaRpgBox("cookingv2", defaultMsg, "guide"));
  } catch (err) {
    await m.react("❌");
    return m.reply(novaRpgBox("cookingv2", `Terjadi kesalahan: ${err.message}`, "error"));
  }
}

export { pluginConfig, pluginConfig as config, handler };
