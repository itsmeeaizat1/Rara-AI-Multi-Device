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
    let txt = "╔┈┈「 DAPUR MASAK FARM 」╎❏\n";
    txt += "╚┈┈❖\n";
    txt += "Masak hasil panen jadi makanan special!\n";
    txt += "Makanan kasih bonus stamina & EXP.\n\n";
    txt += "*Daftar Resep:*\n\n";

    for (const [key, recipe] of Object.entries(RECIPES)) {
      txt += recipe.emoji + " *" + recipe.name + "* (" + key + ")\n";
      txt += "   " + recipe.desc + "\n";
      const ings = Object.entries(recipe.ingredients).map(([k, v]) => v + "x " + k);
      txt += "   Bahan: " + ings.join(", ") + "\n";
      txt += "   Stamina: +" + recipe.staminaBonus + " | EXP: +" + recipe.expBonus + "\n";
      txt += "   Waktu masak: " + Math.floor(recipe.cookTime / 1000) + "s\n\n";
    }

    txt += "Masak pake: .cookfarm cook <nama_resep>\n";
    txt += "Contoh: .cookfarm cook salad\n\n";

    // Tampilkan stok bahan
    const farmCrops = ["padi", "jagung", "tomat", "wortel", "strawberry", "melon", "labu", "anggur"];
    const stock = farmCrops.map((c) => c + ":" + (user.inventory[c] || 0)).join(" | ");
    txt += "*Stok Bahan Kamu:*\n" + stock;

    return await sendReplyWithNav(sock, m, txt, "cookfarm");
  }

  if (action === "cook") {
    const recipeName = args[1];
    if (!recipeName) {
      return sendReplyWithNav(m, sock, claraWrap("Cookfarm", "Mau masak apa?\nContoh: .cookfarm cook salad\nLihat resep: .cookfarm menu"), { commandName: "cookfarm" });
    }

    const recipe = RECIPES[recipeName];
    if (!recipe) {
      return sendReplyWithNav(sock, m, "Resep *" + recipeName + "* tidak ada!\nLihat daftar: .cookfarm menu", "cookfarm");
    }

    // Cek bahan
    const missing = [];
    for (const [ingredient, qty] of Object.entries(recipe.ingredients)) {
      if ((user.inventory[ingredient] || 0) < qty) {
        missing.push(ingredient + " (butuh " + qty + ", punya " + (user.inventory[ingredient] || 0) + ")");
      }
    }

    if (missing.length > 0) {
      return sendReplyWithNav(sock, m, "Bahan kurang!\n" + missing.join("\n") + "\n\nTanam dulu di .coopfarm plant <tanaman>", "cookfarm");
    }

    // Kurangi bahan
    for (const [ingredient, qty] of Object.entries(recipe.ingredients)) {
      user.inventory[ingredient] -= qty;
      if (user.inventory[ingredient] <= 0) delete user.inventory[ingredient];
    }

    await sendReplyWithNav(sock, m, "Sedang masak " + recipe.emoji + " " + recipe.name + "...\nTunggu " + Math.floor(recipe.cookTime / 1000) + " detik ya!", "cookfarm");

    await new Promise((r) => setTimeout(r, recipe.cookTime));

    // Tambah stamina & exp
    user.rpg.stamina = user.rpg.stamina ?? 100;
    const maxStamina = 200;
    const beforeStamina = user.rpg.stamina;
    user.rpg.stamina = Math.min(maxStamina, user.rpg.stamina + recipe.staminaBonus);
    const staminaGain = user.rpg.stamina - beforeStamina;

    await addExpWithLevelCheck(sock, m, db, user, recipe.expBonus);
    db.save();

    await m.react("✅");
    let txt = "╔┈┈「 MASAKAN SIAP! 」╎❏\n";
    txt += "╚┈┈❖\n";
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
