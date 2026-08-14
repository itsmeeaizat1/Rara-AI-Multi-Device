import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API = "https://www.themealdb.com/api/json/v1/1";
const COOKPAD_BASE = "https://cookpad.com/id";
const ID_DATA = path.join(__dirname, "../../assets/resep-id/resep-indonesia.json");

// Load Indonesian recipes as fallback (when Cookpad is down)
let ID_RECIPES = [];
try {
  ID_RECIPES = JSON.parse(fs.readFileSync(ID_DATA, "utf-8"));
} catch (e) {
  console.error("[resep] Failed to load fallback recipe data:", e.message);
}

// Filler words to strip from search queries
const FILLER_WORDS = [
  "masakan", "resep", "cara", "membuat", "bikin", "masak",
  "menu", "hidangan", "makanan", "yg", "yang", "di", "ke",
  "dan", "atau", "untuk", "dari", "dengan", "tentang"
];

// === Cache ===
const searchCache = new Map(); // query -> { data, time }
const detailCache = new Map(); // recipeId -> { data, time }
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// TheMealDB lists cache
let _areaCache = null, _ingredientCache = null, _categoryCache = null, _tmCacheTime = 0;

async function getCachedLists() {
  const now = Date.now();
  if (now - _tmCacheTime < 3600000 && _areaCache) {
    return { areas: _areaCache, ingredients: _ingredientCache, categories: _categoryCache };
  }
  try {
    const [a, i, c] = await Promise.all([
      axios.get(`${API}/list.php?a=list`),
      axios.get(`${API}/list.php?i=list`),
      axios.get(`${API}/categories.php`),
    ]);
    _areaCache = (a.data.meals || []).map(x => x.strArea).filter(Boolean);
    _ingredientCache = (i.data.meals || []).map(x => x.strIngredient).filter(Boolean).sort();
    _categoryCache = (c.data.categories || []).map(x => x.strCategory);
    _tmCacheTime = now;
    return { areas: _areaCache, ingredients: _ingredientCache, categories: _categoryCache };
  } catch {
    return {
      areas: ["American","British","Chinese","French","Greek","Indian","Italian","Japanese","Korean","Malaysian","Mexican","Moroccan","Spanish","Thai","Turkish","Vietnamese"],
      ingredients: [],
      categories: ["Beef","Chicken","Dessert","Lamb","Miscellaneous","Pasta","Pork","Seafood","Side","Starter","Vegan","Vegetarian","Breakfast","Goat"],
    };
  }
}

function cleanQuery(input) {
  return input.toLowerCase().split(/\s+/)
    .filter(w => !FILLER_WORDS.includes(w) && w.length > 0)
    .join(" ").trim();
}

// === Cookpad Scraper ===
async function searchCookpad(query, page = 1) {
  const cacheKey = `${query}:${page}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data;

  try {
    const url = `${COOKPAD_BASE}/cari/${encodeURIComponent(query.replace(/\s+/g, "+"))}`;
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
      },
      timeout: 10000,
    });

    const html = res.data;
    const recipes = [];
    const seen = new Set();

    // Extract recipe IDs and titles
    const matches = [...html.matchAll(/href="\/id\/resep\/(\d+)"[^>]*>\s*([^<]+)</g)];
    for (const m of matches) {
      const id = m[1];
      const title = m[2].trim();
      if (!seen.has(id) && title.length > 2) {
        seen.add(id);
        recipes.push({ id, title, url: `${COOKPAD_BASE}/resep/${id}` });
      }
    }

    // Extract recipe images from search results
    const imgMatches = [...html.matchAll(/srcset="(https:\/\/img-global\.cpcdn\.com\/recipes\/[^"\s]+)"/g)];
    const srcMatches = [...html.matchAll(/src="(https:\/\/img-global\.cpcdn\.com\/recipes\/[^"\s]+)"/g)];
    const allImages = [...imgMatches.map(m => m[1]), ...srcMatches.map(m => m[1])];
    for (let i = 0; i < recipes.length && i < allImages.length; i++) {
      let imgUrl = allImages[i];
      // Normalize to a reasonable size
      imgUrl = imgUrl.replace(/\/\d+x\d+cq\d+\//, "/400x400cq80/");
      recipes[i].image = imgUrl;
    }

    // Extract author and description snippets
    const descMatches = [...html.matchAll(/class="(?:recipe-summary|description|text-sm|flex-1)[^"]*"[^>]*>\s*([^<]{10,200})</g)];
    for (let i = 0; i < recipes.length && i < descMatches.length; i++) {
      recipes[i].desc = descMatches[i][1].trim();
    }

    searchCache.set(cacheKey, { data: recipes, time: Date.now() });
    return recipes;
  } catch (e) {
    console.error("[resep] Cookpad search error:", e.message);
    return [];
  }
}

async function getCookpadRecipe(recipeId) {
  const cached = detailCache.get(recipeId);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data;

  try {
    const url = `${COOKPAD_BASE}/resep/${recipeId}`;
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
      },
      timeout: 10000,
    });

    const html = res.data;
    // Extract JSON-LD Recipe (may be multiple blocks, find the Recipe one)
    const jsonLdMatches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
    let jsonLd = null;
    for (const m of jsonLdMatches) {
      try {
        const parsed = JSON.parse(m[1].trim());
        if (parsed["@type"] === "Recipe") { jsonLd = parsed; break; }
      } catch {}
    }
    if (!jsonLd) return null;

    const recipe = {
      id: recipeId,
      title: jsonLd.name || "Resep",
      description: jsonLd.description || "",
      image: jsonLd.image || "",
      url: url,
      author: jsonLd.author?.name || "",
      authorUrl: jsonLd.author?.url || "",
      cuisine: jsonLd.recipeCuisine || "Indonesia",
      ingredients: jsonLd.recipeIngredient || [],
      steps: (jsonLd.recipeInstructions || []).map(s => s.text || ""),
      datePublished: jsonLd.datePublished || "",
      likes: 0,
      bookmarks: 0,
    };

    // Extract interaction stats
    if (jsonLd.interactionStatistic) {
      for (const stat of jsonLd.interactionStatistic) {
        if (stat.interactionType?.includes("LikeAction")) recipe.likes = stat.userInteractionCount || 0;
        if (stat.interactionType?.includes("BookmarkAction")) recipe.bookmarks = stat.userInteractionCount || 0;
      }
    }

    detailCache.set(recipeId, { data: recipe, time: Date.now() });
    return recipe;
  } catch (e) {
    console.error("[resep] Cookpad detail error:", e.message);
    return null;
  }
}

function formatCookpadRecipe(r) {
  let txt = `${r.title}\n`;
  txt += `Sumber: Cookpad ID | Oleh: ${r.author}${r.likes > 0 ? ` | Suka: ${r.likes}` : ""}\n`;
  if (r.description && r.description !== `Resep ${r.title}.`) txt += `\n${r.description}\n`;
  txt += `\n`;

  if (r.ingredients.length > 0) {
    txt += `Bahan-bahan:\n`;
    for (const ing of r.ingredients) { txt += `  ${ing}\n`; }
    txt += `\n`;
  }

  if (r.steps.length > 0) {
    txt += `Cara Membuat:\n`;
    r.steps.forEach((step, i) => { txt += `${i + 1}. ${step}\n`; });
  }

  txt += `\n${r.url}`;
  return txt.trim();
}

// === TheMealDB formatters ===
function formatMeal(meal) {
  let txt = `${meal.strMeal}\n`;
  txt += `${meal.strCategory ? `Kategori: ${meal.strCategory}` : ""}${meal.strArea ? ` | Asal: ${meal.strArea}` : ""}\n\n`;
  const ings = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`], meas = meal[`strMeasure${i}`];
    if (ing && ing.trim()) ings.push(`${ing.trim()}${meas && meas.trim() ? ` - ${meas.trim()}` : ""}`);
  }
  if (ings.length > 0) { txt += `Bahan-bahan:\n`; for (const i of ings) txt += `  ${i}\n`; txt += `\n`; }
  if (meal.strInstructions) {
    const steps = meal.strInstructions.split(/\r?\n/).filter(s => s.trim());
    txt += `Cara Membuat:\n`;
    if (steps.length > 1) {
      let n = 1;
      for (const s of steps) { if (s.trim().length > 3) { txt += `${n}. ${s.trim()}\n`; n++; } }
    } else {
      const sents = meal.strInstructions.match(/[^.!?]+[.!?]+/g) || [meal.strInstructions];
      sents.forEach((s, i) => txt += `${i + 1}. ${s.trim()}\n`);
    }
    txt += `\n`;
  }
  if (meal.strYoutube) txt += `Video: ${meal.strYoutube}\n`;
  if (meal.strSource) txt += `Sumber: ${meal.strSource}`;
  return txt.trim();
}

function formatIDRecipe(r) {
  let txt = `${r.t}\nKategori: ${r.c} | Suka: ${r.l}\n\n`;
  if (r.i?.length > 0) { txt += `Bahan-bahan:\n`; for (const i of r.i) txt += `  ${i}\n`; txt += `\n`; }
  if (r.s?.length > 0) { txt += `Cara Membuat:\n`; r.s.forEach((s, i) => txt += `${i + 1}. ${s}\n`); }
  return txt.trim();
}

// Send recipe with image preview (falls back to text if no image or fetch fails)
async function sendRecipeReply(m, sock, text, imageUrl) {
  if (imageUrl) {
    // Handle array image URLs (JSON-LD can return arrays)
    const imgSrc = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl;
    if (typeof imgSrc === "string" && imgSrc.startsWith("http")) {
      try {
        const res = await axios.get(imgSrc, {
          responseType: "arraybuffer",
          timeout: 10000,
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        });
        const buffer = Buffer.from(res.data);
        if (buffer.length > 100) {
          return await sock.sendMessage(
            m.key?.remoteJid || m.chat,
            { image: buffer, caption: text },
            { quoted: m }
          );
        }
      } catch (e) {
        console.error("[resep] Image download failed:", e.message);
      }
    }
  }
  // Fallback: text only
  return await sendReplyWithNav(m, sock, text, { commandName: "resep" });
}

// Search fallback static dataset
function searchIDLocal(query) {
  const q = query.toLowerCase();
  let results = ID_RECIPES.filter(r => r.t.toLowerCase().includes(q));
  if (results.length === 0 && q.includes(" ")) {
    const shorter = q.split(" ").slice(0, -1).join(" ");
    results = ID_RECIPES.filter(r => r.t.toLowerCase().includes(shorter));
  }
  if (results.length === 0 && q.includes(" ")) {
    for (const w of q.split(" ")) {
      if (w.length >= 4) { results = ID_RECIPES.filter(r => r.t.toLowerCase().includes(w)); if (results.length > 0) break; }
    }
  }
  results.sort((a, b) => b.l - a.l);
  return results;
}

const pluginConfig = {
  name: "resep",
  alias: ["masakresep", "resep", "resepmasak"],
  category: "food",
  description: "Cari resep masakan (Cookpad Indonesia live + TheMealDB internasional)",
  usage: ".resep <nama> | .resep acak | .resep kategori <nama> | .resep negara <nama> | .resep bahan <bahan>",
  example: ".resep nasi padang | .resep masakan ayam goreng | .resep acak | .resep kategori seafood",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: true,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock, args }) {
  const sub = (args[0] || "").toLowerCase();
  const query = args.slice(1).join(" ").trim();

  // === HELP ===
  if (!sub || sub === "help" || sub === "menu") {
    let txt = `Resep Masakan\n\n`;
    txt += `Sumber: Cookpad Indonesia (live) + TheMealDB (internasional)\n\n`;
    txt += `Perintah:\n`;
    txt += `1. \`${m.prefix}resep <nama>\` - Cari resep (Cookpad + internasional)\n`;
    txt += `2. \`${m.prefix}resep acak\` - Resep random\n`;
    txt += `3. \`${m.prefix}resep acak <kategori>\` - Random by kategori\n`;
    txt += `4. \`${m.prefix}resep kategori\` - Lihat daftar kategori\n`;
    txt += `5. \`${m.prefix}resep kategori <nama>\` - Filter by kategori\n`;
    txt += `6. \`${m.prefix}resep negara\` - Lihat daftar negara\n`;
    txt += `7. \`${m.prefix}resep negara <nama>\` - Filter by negara\n`;
    txt += `8. \`${m.prefix}resep bahan <bahan>\` - Filter by bahan\n`;
    txt += `9. \`${m.prefix}resep populer\` - Resep Indonesia terpopuler\n`;
    txt += `10. \`${m.prefix}resep <id>\` - Detail resep by ID\n\n`;
    txt += `Kata "masakan", "resep", "cara membuat" otomatis diabaikan.\n\n`;
    txt += `Contoh:\n`;
    txt += `\`${m.prefix}resep nasi padang\`\n`;
    txt += `\`${m.prefix}resep masakan ayam goreng\`\n`;
    txt += `\`${m.prefix}resep acak\`\n`;
    return await sendReplyWithNav(m, sock, txt, { commandName: "resep" });
  }

  // === RANDOM ===
  if (sub === "acak" || sub === "random") {
    let pool = ID_RECIPES;
    if (query) {
      const cat = query.charAt(0).toUpperCase() + query.slice(1).toLowerCase();
      const idF = ID_RECIPES.filter(r => r.c.toLowerCase() === cat.toLowerCase());
      if (idF.length > 0) {
        await m.react("🕐"); await m.react("✅");
        return await sendReplyWithNav(m, sock, formatIDRecipe(idF[Math.floor(Math.random() * idF.length)]), { commandName: "resep" });
      }
      try {
        const fRes = await axios.get(`${API}/filter.php?c=${encodeURIComponent(query)}`);
        if (fRes.data.meals) {
          const rMeal = fRes.data.meals[Math.floor(Math.random() * fRes.data.meals.length)];
          const dRes = await axios.get(`${API}/lookup.php?i=${rMeal.idMeal}`);
          await m.react("✅");
          return await sendRecipeReply(m, sock, formatMeal(dRes.data.meals[0]), dRes.data.meals[0].strMealThumb);
        }
      } catch {}
            return m.reply(`Kategori "${query}" tidak ditemukan.`);
    }
    await m.react("🕐");
    // 70% Cookpad live, 30% TheMealDB
    if (Math.random() < 0.7) {
      try {
        const cpResults = await searchCookpad("resep mudah");
        if (cpResults.length > 0) {
          const random = cpResults[Math.floor(Math.random() * Math.min(cpResults.length, 10))];
          const recipe = await getCookpadRecipe(random.id);
          if (recipe) { await m.react("✅"); return await sendRecipeReply(m, sock, formatCookpadRecipe(recipe), recipe.image); }
        }
      } catch {}
    }
    try {
      const res = await axios.get(`${API}/random.php`);
      await m.react("✅");
      return await sendRecipeReply(m, sock, formatMeal(res.data.meals[0]), res.data.meals[0].strMealThumb);
    } catch {
      if (ID_RECIPES.length > 0) {
        await m.react("✅");
        return await sendReplyWithNav(m, sock, formatIDRecipe(ID_RECIPES[Math.floor(Math.random() * ID_RECIPES.length)]), { commandName: "resep" });
      }
            return m.reply("Gagal mengambil resep acak.");
    }
  }

  // === CATEGORIES ===
  if (sub === "kategori" && !query) {
    let txt = `Kategori Resep\n\n`;
    txt += `Internasional (TheMealDB):\n`;
    try {
      const { categories } = await getCachedLists();
      for (const c of categories) txt += `  ${c}\n`;
    } catch { txt += `  Beef, Chicken, Dessert, Lamb, Pasta, Pork, Seafood, Vegetarian, dll\n`; }
    txt += `\nIndonesia (Cookpad - cari langsung):\n`;
    txt += `  Ayam, Ikan, Kambing, Sapi, Tahu, Telur, Tempe, Udang\n`;
    txt += `\nGunakan: \`${m.prefix}resep kategori <nama>\``;
    return await sendReplyWithNav(m, sock, txt, { commandName: "resep" });
  }

  if (sub === "kategori" && query) {
    await m.react("🕐");
    let intMeals = [], idResults = [];
    try {
      const res = await axios.get(`${API}/filter.php?c=${encodeURIComponent(query)}`);
      if (res.data.meals) intMeals = res.data.meals.slice(0, 8);
    } catch {}
    const cat = query.charAt(0).toUpperCase() + query.slice(1).toLowerCase();
    idResults = ID_RECIPES.filter(r => r.c.toLowerCase() === cat.toLowerCase()).sort((a, b) => b.l - a.l).slice(0, 8);
    if (intMeals.length === 0 && idResults.length === 0) {
            return m.reply(`Kategori "${query}" tidak ditemukan.\n\nKetik \`${m.prefix}resep kategori\` untuk lihat daftar.`);
    }
    let txt = `Resep Kategori: ${query}\n\n`;
    if (intMeals.length > 0) { txt += `Internasional:\n`; intMeals.forEach((meal, i) => txt += `${i + 1}. ${meal.strMeal} (ID: ${meal.idMeal})\n`); txt += `\n`; }
    if (idResults.length > 0) { txt += `Indonesia:\n`; idResults.forEach((r, i) => txt += `${i + 1}. ${r.t} (Suka: ${r.l})\n`); }
    txt += `\nInternasional: \`${m.prefix}resep <id>\` | Indonesia: \`${m.prefix}resepid <id>\``;
    await m.react("✅");
    return await sendReplyWithNav(m, sock, txt, { commandName: "resep" });
  }

  // === AREAS ===
  if (sub === "negara" && !query) {
    await m.react("🕐");
    try {
      const { areas } = await getCachedLists();
      let txt = `Negara/Asal Resep\n\n`;
      for (let i = 0; i < areas.length; i += 3) txt += `${areas.slice(i, i + 3).join(" | ")}\n`;
      txt += `\nTotal: ${areas.length} negara\n\nGunakan: \`${m.prefix}resep negara <nama>\``;
      await m.react("✅");
      return await sendReplyWithNav(m, sock, txt, { commandName: "resep" });
    } catch { return m.reply("Error mengambil daftar negara."); }
  }

  if (sub === "negara" && query) {
    await m.react("🕐");
    try {
      const res = await axios.get(`${API}/filter.php?a=${encodeURIComponent(query)}`);
      if (!res.data.meals) { return m.reply(`Negara "${query}" tidak ditemukan.`); }
      const meals = res.data.meals.slice(0, 15);
      let txt = `Resep dari: ${query}\n\n`;
      meals.forEach((meal, i) => txt += `${i + 1}. ${meal.strMeal} (ID: ${meal.idMeal})\n`);
      txt += `\nTotal: ${res.data.meals.length} resep\nLihat detail: \`${m.prefix}resep <id>\``;
      await m.react("✅");
      return await sendReplyWithNav(m, sock, txt, { commandName: "resep" });
    } catch { return m.reply("Error: " + e.message); }
  }

  // === INGREDIENTS ===
  if (sub === "listbahan" || sub === "bahanlist") {
    await m.react("🕐");
    try {
      const { ingredients } = await getCachedLists();
      if (!ingredients.length) { return m.reply("Gagal mengambil daftar bahan."); }
      const page = parseInt(query) || 1, perPage = 50;
      const start = (page - 1) * perPage, items = ingredients.slice(start, start + perPage);
      const total = Math.ceil(ingredients.length / perPage);
      let txt = `Daftar Bahan (Hal ${page}/${total})\n\n`;
      items.forEach((ing, i) => txt += `${start + i + 1}. ${ing}\n`);
      if (page < total) txt += `\nHalaman selanjutnya: \`${m.prefix}resep listbahan ${page + 1}\``;
      await m.react("✅");
      return await sendReplyWithNav(m, sock, txt, { commandName: "resep" });
    } catch { return m.reply("Error."); }
  }

  if (sub === "bahan" && query) {
    await m.react("🕐");
    try {
      const res = await axios.get(`${API}/filter.php?i=${encodeURIComponent(query)}`);
      if (!res.data.meals) { return m.reply(claraWrap("Resep", `Tidak ada resep dengan bahan "${query}".`)); }
      const meals = res.data.meals.slice(0, 15);
      let txt = `Resep dengan bahan: ${query}\n\n`;
      meals.forEach((meal, i) => txt += `${i + 1}. ${meal.strMeal} (ID: ${meal.idMeal})\n`);
      txt += `\nLihat detail: \`${m.prefix}resep <id>\``;
      await m.react("✅");
      return await sendReplyWithNav(m, sock, txt, { commandName: "resep" });
    } catch { return m.reply("Error."); }
  }

  // === POPULER ===
  if (sub === "populer") {
    const sorted = [...ID_RECIPES].sort((a, b) => b.l - a.l).slice(0, 15);
    let txt = `Resep Terpopuler Indonesia\n\n`;
    sorted.forEach((r, i) => txt += `${i + 1}. ${r.t}\n   ${r.c} | Suka: ${r.l} | ID: ${r.id}\n`);
    txt += `\nLihat detail: \`${m.prefix}resepid <id>\``;
    return await sendReplyWithNav(m, sock, txt, { commandName: "resep" });
  }

  // === RESEPLB - list all search results ===
  if (sub === "reseplb" || (args.length >= 2 && args[0] === "reseplb")) {
    const lbQuery = args.slice(1).join(" ").trim() || args.slice(0).join(" ").trim();
    const lbCleaned = cleanQuery(lbQuery);
    if (!lbCleaned) {
            return m.reply(`Masukkan nama resep.\nContoh: \`${m.prefix}reseplb nasi goreng\``);
    }
    await m.react("🕐");
    const [cpRes, tmRes] = await Promise.all([
      searchCookpad(lbCleaned),
      axios.get(`${API}/search.php?s=${encodeURIComponent(lbCleaned)}`).then(r => r.data.meals || []).catch(() => []),
    ]);
    const idLocal = cpRes.length === 0 ? searchIDLocal(lbCleaned) : [];
    const total = cpRes.length + tmRes.length + idLocal.length;
    if (total === 0) {
            return m.reply(`Resep "${lbCleaned}" tidak ditemukan.`);
    }
    let txt = `Daftar Resep: "${lbCleaned}"\nDitemukan ${total} resep\n\n`;
    let num = 1;
    if (cpRes.length > 0) {
      txt += `Indonesia (Cookpad):\n`;
      for (const r of cpRes.slice(0, 10)) {
        txt += `${num}. ${r.title}\n   ID: ${r.id}\n`;
        num++;
      }
      if (cpRes.length > 10) txt += `   (dan ${cpRes.length - 10} lainnya)\n`;
      txt += `\n`;
    }
    if (tmRes.length > 0) {
      txt += `Internasional:\n`;
      for (const meal of tmRes.slice(0, 5)) {
        txt += `${num}. ${meal.strMeal}\n   ${meal.strCategory} | ${meal.strArea} | ID: ${meal.idMeal}\n`;
        num++;
      }
      txt += `\n`;
    }
    if (idLocal.length > 0) {
      txt += `Indonesia (offline):\n`;
      for (const r of idLocal.slice(0, 5)) {
        txt += `${num}. ${r.t}\n   ${r.c} | Suka: ${r.l} | ID: ${r.id}\n`;
        num++;
      }
    }
    txt += `\nLihat detail: \`${m.prefix}resep <id>\``;
    await m.react("✅");
    return await sendReplyWithNav(m, sock, txt, { commandName: "resep" });
  }

  // === BY ID ===
  if (/^\d+$/.test(sub)) {
    await m.react("🕐");
    // Cookpad IDs are 7+ digits, TheMealDB are 5 digits
    if (sub.length >= 7) {
      const recipe = await getCookpadRecipe(sub);
      if (recipe) { await m.react("✅"); return await sendRecipeReply(m, sock, formatCookpadRecipe(recipe), recipe.image); }
            return m.reply(`Resep Cookpad ID ${sub} tidak ditemukan.`);
    }
    // Try TheMealDB
    if (sub.length >= 4) {
      try {
        const res = await axios.get(`${API}/lookup.php?i=${sub}`);
        if (res.data.meals) { await m.react("✅"); return await sendRecipeReply(m, sock, formatMeal(res.data.meals[0]), res.data.meals[0].strMealThumb); }
      } catch {}
    }
    // Try local Indonesian dataset
    const id = parseInt(sub);
    const recipe = ID_RECIPES.find(r => r.id === id);
    if (recipe) { await m.react("✅"); return await sendReplyWithNav(m, sock, formatIDRecipe(recipe), { commandName: "resep" }); }
        return m.reply(`Resep ID ${sub} tidak ditemukan.`);
  }

  // === UNIFIED SEARCH (default) ===
  await m.react("🕐");
  const rawQuery = args.join(" ").trim();
  const cleaned = cleanQuery(rawQuery);
  if (!cleaned) {
        return m.reply(`Masukkan nama resep yang dicari.\n\nContoh: \`${m.prefix}resep nasi goreng\` atau \`${m.prefix}resep masakan ayam\``);
  }

  // Search Cookpad (live) and TheMealDB simultaneously
  const [cpResults, tmResults] = await Promise.all([
    searchCookpad(cleaned),
    axios.get(`${API}/search.php?s=${encodeURIComponent(cleaned)}`).then(r => r.data.meals || []).catch(() => []),
  ]);

  // Also search local fallback
  const idFallback = cpResults.length === 0 ? searchIDLocal(cleaned) : [];

  const totalFound = cpResults.length + tmResults.length + idFallback.length;

  if (totalFound === 0) {
        return m.reply(`Resep "${cleaned}" tidak ditemukan.\n\nCoba: \`${m.prefix}resep acak\` untuk resep random, atau \`${m.prefix}resep kategori\` untuk lihat kategori.`);
  }

  // Auto-fetch TOP result from Cookpad and show full recipe with image
  if (cpResults.length > 0) {
    const recipe = await getCookpadRecipe(cpResults[0].id);
    if (recipe) {
      // Add "more results" note at bottom
      let extra = "";
      if (cpResults.length > 1 || tmResults.length > 0) {
        let moreCount = cpResults.length - 1 + tmResults.length;
        extra = "\n\n" + `Ada ${moreCount} resep lainnya untuk "${cleaned}"\nKetik \`${m.prefix}reseplb ${cleaned}\` untuk lihat daftar`;
      }
      await m.react("✅");
      return await sendRecipeReply(m, sock, formatCookpadRecipe(recipe) + extra, recipe.image);
    }
  }

  // No Cookpad results, try TheMealDB top result
  if (tmResults.length > 0) {
    let extra = "";
    if (tmResults.length > 1) {
      extra = "\n\n" + `Ada ${tmResults.length - 1} resep internasional lainnya\nKetik \`${m.prefix}reseplb ${cleaned}\` untuk lihat daftar`;
    }
    await m.react("✅");
    return await sendRecipeReply(m, sock, formatMeal(tmResults[0]) + extra, tmResults[0].strMealThumb);
  }

  // Fallback to local dataset (text only, no image)
  if (idFallback.length > 0) {
    let txt = formatIDRecipe(idFallback[0]);
    if (idFallback.length > 1) {
      txt += `\n\nAda ${idFallback.length - 1} resep lainnya untuk "${cleaned}"\nKetik \`${m.prefix}reseplb ${cleaned}\` untuk lihat daftar`;
    }
    await m.react("✅");
    return await sendReplyWithNav(m, sock, txt, { commandName: "resep" });
  }

}

export { pluginConfig, handler };
