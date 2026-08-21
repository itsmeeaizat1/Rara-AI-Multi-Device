import { getCommandsByCategory, getCategories, loadPlugins } from "./src/lib/nova-plugins.js";
import { getCasesByCategory } from "./case/nova.js";

await loadPlugins("./plugins");

const CATEGORY_ORDER = [
  "ai", "sticker", "download", "fun", "canvas", "tools",
  "game", "rpg", "media", "search", "group", "main",
  "utility", "religi", "info", "cek", "economy", "user",
  "random", "premium", "ephoto", "jpm", "pushkontak",
  "panel", "owner", "store",
];

function buildCategoryRows(prefix, m) {
  const pluginCats = getCategories();
  const commandsByCategory = getCommandsByCategory();
  const caseCats = getCasesByCategory();
  const allCatKeys = [...new Set([...pluginCats, ...Object.keys(caseCats)])];
  return allCatKeys
    .sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a), ib = CATEGORY_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    })
    .filter(cat => {
      if (cat === "owner" && !m.isOwner) return false;
      const total = (commandsByCategory[cat] || []).length + (caseCats[cat] || []).length;
      return total > 0;
    })
    .map(cat => cat);
}

const rows = buildCategoryRows(".", { isOwner: true });
console.log("Total categories found:", rows.length);
console.log(rows.join(", "));
