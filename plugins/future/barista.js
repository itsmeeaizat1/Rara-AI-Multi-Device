// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "barista",
  alias: ["Latte", "barista", "resepkopi", "kopi"],
  category: "future",
  description: "Resep kopi & mocktail, random suggestion, step by step",
  usage: ".barista <command>",
  example: ".barista kopi",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const COFFEE = [
  {
    name: "Espresso",
    difficulty: "Easy",
    time: "3 min",
    ingredients: ["18g kopi bubuk fine", "36ml air panas 93C"],
    steps: ["Tamp kopi di portafilter", "Ekstrak 25-30 detik", "Hasil: 36ml espresso dengan crema"],
    tip: "Grind size terlalu halus = ekstrak pahit, terlalu kasar = ekstrak asam.",
  },
  {
    name: "Cappuccino",
    difficulty: "Medium",
    time: "5 min",
    ingredients: ["1 shot espresso", "60ml susu segar", "60ml milk foam"],
    steps: ["Buat 1 shot espresso", "Steam susu hingga 65C, buat microfoam", "Tuang susu ke espresso, topping foam setinggi 1cm"],
    tip: "Suhu susu jangan melebihi 70C, susu akan gosong.",
  },
  {
    name: "Latte",
    difficulty: "Medium",
    time: "5 min",
    ingredients: ["1 shot espresso", "180ml susu segar", "1cm foam tipis"],
    steps: ["Buat 1 shot espresso", "Steam susu dengan sedikit foam", "Tuang susu perlahan ke espresso, buat latte art"],
    tip: "Sudut tuang 45 derajat untuk latte art terbaik.",
  },
  {
    name: "Cold Brew",
    difficulty: "Easy",
    time: "12-16 jam",
    ingredients: ["100g kopi coarse grind", "1L air dingin", "Filter kopi"],
    steps: ["Campur kopi + air di jar", "Diamkan 12-16 jam di kulkas", "Saring dengan filter kopi", "Sajikan dengan es"],
    tip: "Cold brew tahan 7 hari di kulkas. Lebih halus dari iced coffee.",
  },
  {
    name: "Americano",
    difficulty: "Easy",
    time: "4 min",
    ingredients: ["1 shot espresso", "120ml air panas"],
    steps: ["Buat 1 shot espresso", "Tambah air panas 90C", "Aduk perlahan"],
    tip: "Air dulang lebih dulu = rasa lebih smooth. Espresso dulu = rasa lebih kuat.",
  },
  {
    name: "V60 Pour Over",
    difficulty: "Hard",
    time: "3 min",
    ingredients: ["15g kopi medium grind", "250ml air 92C"],
    steps: ["Bilas filter V60 dengan air panas", "Masukkan kopi, buat well", "Bloom: tuang 30ml, tunggu 30 detik", "Tuang sisanya melingkar sampai 250ml", "Total ekstraksi 2:30-3:00 menit"],
    tip: "Pour slow, jaga level air konsisten. TDS ideal 1.15-1.45%.",
  },
];

const MOCKTAIL = [
  {
    name: "Virgin Mojito",
    difficulty: "Easy",
    time: "3 min",
    ingredients: ["10 daun mint", "1 sdm gula", "30ml lime juice", "Soda water", "Es batu"],
    steps: ["Muddling mint + gula + lime di gelas", "Isi es batu", "Tuang soda water", "Aduk perlahan", "Garnish dengan daun mint"],
    tip: "Jangan muddling mint terlalu keras, akan pahit.",
  },
  {
    name: "Berry Smoothie",
    difficulty: "Easy",
    time: "3 min",
    ingredients: ["100g mixed berries", "1 pisang", "200ml yogurt", "1 sdm madu", "Es batu"],
    steps: ["Masukkan semua ke blender", "Blend hingga halus", "Tuang ke gelas", "Garnish berry di atas"],
    tip: "Tambah chia seeds untuk tekstur lebih kaya.",
  },
  {
    name: "Sunset Punch",
    difficulty: "Easy",
    time: "5 min",
    ingredients: ["100ml orange juice", "50ml grenadine", "50ml pineapple juice", "Soda water", "Es batu"],
    steps: ["Isi gelas dengan es", "Tuang orange + pineapple juice", "Tambah soda water", "Tuang grenadine perlahan untuk efek sunset", "Jangan diaduk"],
    tip: "Grenadine terakhir supaya gradient warna terlihat.",
  },
  {
    name: "Cucumber Cooler",
    difficulty: "Easy",
    time: "4 min",
    ingredients: ["1/2 mentimun", "15ml lime juice", "10ml simple syrup", "Soda water", "Daun mint", "Es batu"],
    steps: ["Blend mentimun, saring airnya", "Campur cucumber water + lime + syrup", "Isi gelas dengan es", "Tuang campuran + soda water", "Garnish mint"],
    tip: "Mentimun harus segar, kalau layu rasa berubah.",
  },
  {
    name: "Tropical Paradise",
    difficulty: "Medium",
    time: "5 min",
    ingredients: ["100ml jus mangga", "50ml jus kelapa", "30ml lime juice", "Nanas slice", "Es batu"],
    steps: ["Blender mangga + kelapa + lime", "Isi gelas dengan es", "Tuang smoothie", "Garnish slice nanas di pinggir gelas"],
    tip: "Pakai buah segar, bukan sirup, untuk rasa autentik.",
  },
];

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();

  if (sub === "kopi" || sub === "coffee") {
    const recipe = COFFEE[Math.floor(Math.random() * COFFEE.length)];
    await m.reply(claraWrap("Barista: " + recipe.name, [
      "Type: Coffee | Level: " + recipe.difficulty + " | Time: " + recipe.time,
      "",
      "Ingredients:",
      ...recipe.ingredients.map(i => "  " + i),
      "",
      "Steps:",
      ...recipe.steps.map((s, i) => "  " + (i + 1) + ". " + s),
      "",
      "Tip: " + recipe.tip,
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "mocktail" || sub === "nonalcohol") {
    const recipe = MOCKTAIL[Math.floor(Math.random() * MOCKTAIL.length)];
    await m.reply(claraWrap("Barista: " + recipe.name, [
      "Type: Mocktail | Level: " + recipe.difficulty + " | Time: " + recipe.time,
      "",
      "Ingredients:",
      ...recipe.ingredients.map(i => "  " + i),
      "",
      "Steps:",
      ...recipe.steps.map((s, i) => "  " + (i + 1) + ". " + s),
      "",
      "Tip: " + recipe.tip,
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "random" || sub === "acak") {
    const all = [...COFFEE.map(r => ({ ...r, type: "Coffee" })), ...MOCKTAIL.map(r => ({ ...r, type: "Mocktail" }))];
    const recipe = all[Math.floor(Math.random() * all.length)];
    await m.reply(claraWrap("Barista: " + recipe.name, [
      "Type: " + recipe.type + " | Level: " + recipe.difficulty + " | Time: " + recipe.time,
      "",
      "Ingredients:",
      ...recipe.ingredients.map(i => "  " + i),
      "",
      "Steps:",
      ...recipe.steps.map((s, i) => "  " + (i + 1) + ". " + s),
      "",
      "Tip: " + recipe.tip,
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "list" || sub === "daftar" || !sub) {
    const coffeeList = COFFEE.map((r, i) => (i + 1) + ". " + r.name + " (" + r.difficulty + ", " + r.time + ")").join("\n");
    const mocktailList = MOCKTAIL.map((r, i) => (i + 1) + ". " + r.name + " (" + r.difficulty + ", " + r.time + ")").join("\n");
    await m.reply(claraWrap("Barista Menu", [
      "COFFEE:",
      coffeeList,
      "",
      "MOCKTAIL:",
      mocktailList,
      "",
      prefix + "barista kopi - random resep kopi",
      prefix + "barista mocktail - random resep mocktail",
      prefix + "barista random - random semua",
    ].join("\n")));
    return { handled: true };
  }

  await m.reply(claraWrap("Barista", [
    "BARISTA & MIXOLOGY",
    "",
    prefix + "barista kopi - random resep kopi",
    prefix + "barista mocktail - random resep mocktail",
    prefix + "barista random - random semua",
    prefix + "barista list - daftar semua resep",
    "",
    "Coffee: " + COFFEE.length + " resep",
    "Mocktail: " + MOCKTAIL.length + " resep",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler, COFFEE, MOCKTAIL };
