// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "../../assets/resep-id/resep-indonesia.json");

// Load recipes once at startup
let RECIPES = [];
try {
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  RECIPES = JSON.parse(raw);
} catch (e) {
  console.error("[resepid] Failed to load recipe data:", e.message);
}

const CATEGORIES = ["Ayam", "Ikan", "Kambing", "Sapi", "Tahu", "Telur", "Tempe", "Udang"];

const pluginConfig = {
  name: "resepid",
  alias: ["resepid"],
  category: "food",
  description: "Resep masakan Indonesia (1200+ resep: ayam, ikan, sapi, tahu, tempe, dll)",
  usage: ".resepid <nama> | .resepid acak | .resepid kategori <nama> | .resepid <id>",
  example: ".resepid ayam goreng | .resepid acak | .resepid kategori ayam",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

function formatRecipe(r) {
  let txt = `${r.t}\n`;
  txt += `Kategori: ${r.c} | Suka: ${r.l}\n\n`;

  if (r.i && r.i.length > 0) {
    txt += `Bahan-bahan:\n`;
    for (const ing of r.i) {
      txt += `  ${ing}\n`;
    }
    txt += `\n`;
  }

  if (r.s && r.s.length > 0) {
    txt += `Cara Membuat:\n`;
    r.s.forEach((step, i) => {
      txt += `${i + 1}. ${step}\n`;
    });
  }

  return txt.trim();
}

async function handler(m, { sock, args }) {
  if (RECIPES.length === 0) {
    return m.reply(claraWrap("Resepid", "Data resep Indonesia tidak tersedia. Pastikan file resep-indonesia.json ada di assets/resep-id/"));
  }

  const sub = (args[0] || "").toLowerCase();
  const query = args.slice(1).join(" ").trim();

  // === HELP ===
  if (!sub || sub === "help" || sub === "menu") {
    let txt = `Resep Masakan Indonesia\n\n`;
    txt += `Database: 1200+ resep dari Cookpad (8 kategori)\n\n`;
    txt += `Perintah:\n`;
    txt += `1. \`${m.prefix}resepid <nama>\` - Cari resep by nama\n`;
    txt += `2. \`${m.prefix}resepid acak\` - Resep random\n`;
    txt += `3. \`${m.prefix}resepid acak <kategori>\` - Random by kategori\n`;
    txt += `4. \`${m.prefix}resepid kategori\` - Lihat daftar kategori\n`;
    txt += `5. \`${m.prefix}resepid kategori <nama>\` - Filter by kategori\n`;
    txt += `6. \`${m.prefix}resepid populer\` - Resep terpopuler\n`;
    txt += `7. \`${m.prefix}resepid <id>\` - Detail resep by ID\n\n`;
    txt += `Kategori: Ayam, Ikan, Kambing, Sapi, Tahu, Telur, Tempe, Udang\n\n`;
    txt += `Contoh:\n`;
    txt += `\`${m.prefix}resepid ayam goreng\`\n`;
    txt += `\`${m.prefix}resepid acak\`\n`;
    txt += `\`${m.prefix}resepid kategori tempe\`\n`;
    txt += `\`${m.prefix}resepid populer\`\n\n`;
    txt += `Sumber: Cookpad Indonesia (Kaggle dataset)`;
    txt += `\nResep internasional? Gunakan: ${m.prefix}resep (792+ resep, 170+ negara)`;

    return await m.reply( txt, { commandName: "resepid" });
  }

  // === RANDOM ===
  if (sub === "acak" || sub === "random") {
    let pool = RECIPES;
    if (query) {
      const cat = query.charAt(0).toUpperCase() + query.slice(1).toLowerCase();
      pool = RECIPES.filter(r => r.c.toLowerCase() === cat.toLowerCase());
      if (pool.length === 0) {
        return m.reply(`Kategori "${query}" tidak ditemukan.\n\nTersedia: ${CATEGORIES.join(", ")}`);
      }
    }
    const recipe = pool[Math.floor(Math.random() * pool.length)];
    return await m.reply( formatRecipe(recipe), { commandName: "resepid" });
  }

  // === CATEGORIES LIST ===
  if (sub === "kategori" && !query) {
    let txt = `Kategori Resep Indonesia\n\n`;
    for (const cat of CATEGORIES) {
      const count = RECIPES.filter(r => r.c === cat).length;
      txt += `${cat} (${count} resep)\n`;
    }
    txt += `\nTotal: ${RECIPES.length} resep\n\n`;
    txt += `Gunakan: \`${m.prefix}resepid kategori <nama>\`\n`;
    txt += `Contoh: \`${m.prefix}resepid kategori ayam\``;
    return await m.reply( txt, { commandName: "resepid" });
  }

  // === FILTER BY CATEGORY ===
  if (sub === "kategori" && query) {
    const cat = query.charAt(0).toUpperCase() + query.slice(1).toLowerCase();
    const filtered = RECIPES.filter(r => r.c.toLowerCase() === cat.toLowerCase());
    
    if (filtered.length === 0) {
      return m.reply(`Kategori "${query}" tidak ditemukan.\n\nTersedia: ${CATEGORIES.join(", ")}`);
    }
    
    // Sort by loves
    filtered.sort((a, b) => b.l - a.l);
    const limited = filtered.slice(0, 15);
    
    let txt = `Resep Kategori: ${cat}\n\n`;
    limited.forEach((r, i) => {
      txt += `${i + 1}. ${r.t}\n`;
      txt += `   ID: ${r.id} | Suka: ${r.l}\n`;
    });
    txt += `\nTotal: ${filtered.length} resep (menampilkan 15 terpopuler)\n\n`;
    txt += `Lihat detail: \`${m.prefix}resepid <id>\`\n`;
    txt += `Contoh: \`${m.prefix}resepid ${limited[0].id}\``;
    return await m.reply( txt, { commandName: "resepid" });
  }

  // === POPULER ===
  if (sub === "populer" || sub === "populer") {
    const sorted = [...RECIPES].sort((a, b) => b.l - a.l);
    const top = sorted.slice(0, 15);
    
    let txt = `Resep Terpopuler Indonesia\n\n`;
    top.forEach((r, i) => {
      txt += `${i + 1}. ${r.t}\n`;
      txt += `   ${r.c} | Suka: ${r.l} | ID: ${r.id}\n`;
    });
    txt += `\nLihat detail: \`${m.prefix}resepid <id>\`\n`;
    txt += `Contoh: \`${m.prefix}resepid ${top[0].id}\``;
    return await m.reply( txt, { commandName: "resepid" });
  }

  // === BY ID (numeric) ===
  if (/^\d+$/.test(sub)) {
    const id = parseInt(sub);
    const recipe = RECIPES.find(r => r.id === id);
    
    if (!recipe) {
      return m.reply(`Resep ID ${id} tidak ditemukan.\n\nTotal resep: ${RECIPES.length}\nRange ID: 1-${RECIPES.length}`);
    }
    
    return await m.reply( formatRecipe(recipe), { commandName: "resepid" });
  }

  // === SEARCH BY NAME (default) ===
  const searchQuery = args.join(" ").trim().toLowerCase();
  const results = RECIPES.filter(r => r.t.toLowerCase().includes(searchQuery));
  
  if (results.length === 0) {
    return m.reply(`Resep "${args.join(" ")}" tidak ditemukan.\n\nCoba: \`${m.prefix}resepid acak\` untuk resep random, atau \`${m.prefix}resepid kategori\` untuk lihat kategori.`);
  }
  
  // Sort by loves
  results.sort((a, b) => b.l - a.l);
  
  if (results.length === 1) {
    return await m.reply( formatRecipe(results[0]), { commandName: "resepid" });
  }
  
  // Multiple results
  const limited = results.slice(0, 10);
  let txt = `Hasil pencarian: "${args.join(" ")}"\n`;
  txt += `Ditemukan ${results.length} resep\n\n`;
  limited.forEach((r, i) => {
    txt += `${i + 1}. ${r.t}\n`;
    txt += `   ${r.c} | Suka: ${r.l} | ID: ${r.id}\n`;
  });
  if (results.length > 10) txt += `\n(dan ${results.length - 10} lainnya)\n`;
  txt += `\nLihat detail: \`${m.prefix}resepid <id>\`\n`;
  txt += `Contoh: \`${m.prefix}resepid ${limited[0].id}\``;
  return await m.reply( txt, { commandName: "resepid" });
}

export { pluginConfig as config, handler };
