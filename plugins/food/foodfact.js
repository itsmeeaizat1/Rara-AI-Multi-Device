// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import { raraWrap } from '../../src/lib/rara-menu-style.js'

const pluginConfig = {
  name: "foodfact",
  alias: ["foodfact"],
  aliases: ["foodfact", "faktafood", "foodinfo", "nutrifood"],
  category: "food",
  description: "Fakta nutrisi makanan + random food fact (TheMealDB API gratis)",
  usage: ".foodfact <nama makanan> | .foodfact random | .foodfact list",
  example: ".foodfact Arrabiata | .foodfact random",
  isGroupOnly: false,
}

const API_BASE = "https://www.themealdb.com/api/json/v1/1";

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = text.trim();

    if (!input) {
      return m.reply(raraWrap("Food Fact", [
        "Fakta nutrisi & resep makanan dari TheMealDB",
        "",
        "Cara pakai:",
        usedPrefix + "foodfact random (resep acak)",
        usedPrefix + "foodfact <nama> (cari resep)",
        usedPrefix + "foodfact list (kategori tersedia)",
      ].join("\n")));
    }

    const sub = input.toLowerCase();

    if (sub === "list" || sub === "kategori") {
      const res = await axios.get(API_BASE + "/list.php?c=list", { timeout: 10000 });
      const cats = res.data?.meals?.map(m => m.strCategory) || [];
      return m.reply(raraWrap("Food Fact - Kategori", [
        "Kategori makanan tersedia:",
        "",
        cats.map((c, i) => (i + 1) + ". " + c).join("\n"),
        "",
        "Cari: " + usedPrefix + "foodfact Seafood",
      ].join("\n")));
    }

    let meal;

    if (sub === "random") {
      const res = await axios.get(API_BASE + "/random.php", { timeout: 10000 });
      meal = res.data?.meals?.[0];
    } else {
      const res = await axios.get(API_BASE + "/search.php?s=" + encodeURIComponent(input), { timeout: 10000 });
      meal = res.data?.meals?.[0];
    }

    if (!meal) {
      return m.reply(raraWrap("Food Fact", "Makanan tidak ditemukan: " + input));
    }

    // Extract ingredients
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ing = meal["strIngredient" + i];
      const measure = meal["strMeasure" + i];
      if (ing && ing.trim()) {
        ingredients.push("- " + ing + (measure && measure.trim() ? " (" + measure + ")" : ""));
      }
    }

    let lines = [
      meal.strMeal,
      "",
      "Kategori: " + (meal.strCategory || "N/A"),
      "Asal: " + (meal.strArea || "N/A"),
      "",
      "Bahan-bahan:",
      ingredients.join("\n"),
      "",
      "Instruksi:",
      (meal.strInstructions || "N/A").slice(0, 800) + "...",
    ];

    if (meal.strYoutube) {
      lines.push("");
      lines.push("Video: " + meal.strYoutube);
    }
    if (meal.strSource) {
      lines.push("Source: " + meal.strSource);
    }

    return m.reply(raraWrap("Food Fact - " + meal.strMeal, lines.join("\n")));
  } catch (e) {
    console.error("foodfact error:", e.message);
    return m.reply(raraWrap("Food Fact", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
