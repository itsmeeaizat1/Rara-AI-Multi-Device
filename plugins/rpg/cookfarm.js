// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { addExpWithLevelCheck } from "../../src/lib/nova-level.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "cookfarm",
  alias: ["cookfarm", "masak", "masakkebun"],
  category: "rpg",
  description: "Masak hasil panen jadi makanan yang kasih bonus stamina & EXP",
  usage: ".cookfarm <menu/list/cook>",
  example: ".cookfarm cook salad",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

// Resep masakan dari hasil panen Co-op Farm
const RECIPES = {
  salad: {
    name: "Salad Sayur",
    emoji: "🥗",
    ingredients: { tomat: 1, wortel: 1 },
    staminaBonus: 50,
    expBonus: 100,
    cookTime: 10000,
    desc: "Salad segar buat healing cepat",
  },
  nasi_goreng: {
    name: "Nasi Goreng",
    emoji: "🍚",
    ingredients: { padi: 2, tomat: 1 },
    staminaBonus: 80,
    expBonus: 150,
    cookTime: 15000,
    desc: "Nasi goreng spesial, nambah energi",
  },
  sup_jagung: {
    name: "Sup Jagung",
    emoji: "🍲",
    ingredients: { jagung: 2, wortel: 1 },
    staminaBonus: 100,
    expBonus: 200,
    cookTime: 20000,
    desc: "Sup jagung creamy, hangat dan nikmat",
  },
  pie_labu: {
    name: "Pie Labu",
    emoji: "🥧",
    ingredients: { labu: 1, padi: 1 },
    staminaBonus: 150,
    expBonus: 300,
    cookTime: 30000,
    desc: "Pie labu manis, stamina besar",
  },
  jus_stroberi: {
    name: "Jus Stroberi",
    emoji: "🥤",
    ingredients: { strawberry: 2 },
    staminaBonus: 60,
    expBonus: 120,
    cookTime: 8000,
    desc: "Jus stroberi segar, cepat recovery",
  },
  melon_smoothie: {
    name: "Melon Smoothie",
    emoji: "🍈",
    ingredients: { melon: 1, strawberry: 1 },
    staminaBonus: 120,
    expBonus: 250,
    cookTime: 15000,
    desc: "Smoothie melon, healing + exp bonus",
  },
  wine_anggur: {
    name: "Wine Anggur",
    emoji: "🍷",
    ingredients: { anggur: 2, labu: 1 },
    staminaBonus: 200,
    expBonus: 500,
    cookTime: 60000,
    desc: "Wine anggur premium, bonus super besar",
  },
  feast: {
    name: "Feast Komplit",
    emoji: "🍱",
    ingredients: { padi: 2, jagung: 1, tomat: 1, wortel: 1, strawberry: 1 },
    staminaBonus: 300,
    expBonus: 800,
    cookTime: 45000,
    desc: "Pesta makan komplit! Full recovery + bonus gede",
  },
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  if (!user.rpg) user.rpg = {};
  if (!user.inventory) user.inventory = {};

  const args = (m.args || []).map((a) => a.toLowerCase());
  const action = args[0];

  if (!action || action === "menu" || action === "list") {
    let txt = "❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Daftar Resep:  ┊  ➶\n";
    txt += "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n";
    txt += recipe.emoji + " *" + recipe.name + "* berhasil dimasak!\n\n";
    txt += "Stamina: +" + staminaGain + " (sekarang: " + user.rpg.stamina + "/" + maxStamina + ")\n";
    txt += "EXP: +" + recipe.expBonus + "\n\n";
    txt += recipe.desc + "\n\n";
    txt += "Mau masak lagi? .cookfarm menu";
    return await sendReplyWithNav(sock, m, txt, "cookfarm");
  }

  return m.reply(claraWrap("Cookfarm", "Perintah tidak valid!\n\nKetik .cookfarm menu buat lihat resep."));
}

export { pluginConfig as config, handler };
