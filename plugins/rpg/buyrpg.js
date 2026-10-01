import { animShop } from "../../src/lib/rara-rpg-anim.js";
import { ensureRpg, saveRpg, removeGold, addItem } from "../../src/lib/rara-rpg-service.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";
const pluginConfig = {
  name: "buy", alias: ["buy", "buyrpg", "beli"],
  category: "rpg", description: "Beli item dari toko RPG",
  usage: ".buy <item>", example: ".buy scrollclass",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};
const SHOP = {
  scrollclass: 500, stonebless: 350, essencexp: 400, spiritcore: 1000, elixirlife: 750,
  ramuan: 50, potion: 100, kunci: 200, fragmen: 150,
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("buyrpg", "RPG belum siap.", "error"));
    const text = m.args.join(" ").trim().toLowerCase();
    if (!text) return m.reply(raraRpgBox("buyrpg", `Item tersedia:\n${Object.entries(SHOP).map(([k,v]) => `${k} — ${v} gold`).join("\n")}\n\nContoh: ${m.prefix}buyrpg ramuan`, "guide"));
    if (!SHOP[text]) return m.reply(raraRpgBox("buyrpg", "Item tidak ditemukan di toko.", "error"));
    if (rpg.gold < SHOP[text]) return m.reply(raraRpgBox("buyrpg", `💰 Uang tidak cukup. Butuh ${SHOP[text]} gold.`, "error"));
    removeGold(m, SHOP[text], sock);
    addItem(m, text, 1);
    if (text === "scrollclass") rpg.job = "novice";
    if (text === "essencexp") { rpg.exp += 500; addItem(m, text, -1); }
    saveRpg(m, rpg);
    await m.react("🐣");
    await animShop(m, sock, "buy");
    return m.reply(raraRpgBox("buyrpg", `✅ Kamu membeli *${text}* seharga ${SHOP[text]} gold.`, "success"));
  } catch (e) { return m.reply(raraRpgBox("buyrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
