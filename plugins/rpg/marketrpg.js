import { ensureRpg, saveRpg, removeItem, addGold, removeGold, addItem, getItemCount } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";

const pluginConfig = {
  name: "marketrpg", alias: ["marketrpg", "market"],
  category: "rpg", description: "Marketplace RPG — jual/beli item dari pemain lain",
  usage: ".marketrpg jual <item> <harga> / .marketrpg beli <item>",
  example: ".marketrpg jual pedang 200",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};
global.rpgMarket = global.rpgMarket || [];
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("marketrpg", "RPG belum siap.", "error"));
    const args = m.args;
    const aksi = (args[0] || "").toLowerCase();
    if (!aksi) {
      if (!global.rpgMarket.length) {
        await animGeneric(m, sock, '🏪', 'Opening market');
        return m.reply(claraWrap("marketrpg", "🛒 Marketplace kosong.", "info"));
      }
      await animGeneric(m, sock, '🏪', 'Opening market');
      return m.reply(claraWrap("marketrpg", `🛒 *MARKETPLACE*\n${global.rpgMarket.map((it, i) => `${i+1}. ${it.item} — ${it.harga} gold (by ${it.seller.split("@")[0]})`).join("\n")}`, "info"));
    }
    if (aksi === "jual") {
      const item = (args[1] || "").toLowerCase();
      const harga = parseInt(args[2] || "0");
      if (!item || !harga || harga <= 0) return m.reply(claraWrap("marketrpg", `Format: ${m.prefix}marketrpg jual <item> <harga>`, "guide"));
      if (getItemCount(m, item) <= 0) return m.reply(claraWrap("marketrpg", `Kamu tidak punya *${item}*.`, "error"));
      removeItem(m, item, 1, sock);
      global.rpgMarket.push({ seller: m.sender, item, harga });
      saveRpg(m, rpg);
      await m.react("🐣");
      await animGeneric(m, sock, '🏪', 'Opening market');
      return m.reply(claraWrap("marketrpg", `✅ *${item}* dijual seharga ${harga} gold.`, "success"));
    }
    if (aksi === "beli") {
      const item = (args[1] || "").toLowerCase();
      const found = global.rpgMarket.find(it => it.item === item);
      if (!found) return m.reply(claraWrap("marketrpg", `*${item}* tidak ada di market.`, "error"));
      if (rpg.gold < found.harga) return m.reply(claraWrap("marketrpg", `💰 Tidak cukup. Butuh ${found.harga} gold.`, "error"));
      removeGold(m, found.harga, sock);
      addItem(m, found.item, 1);
      global.rpgMarket = global.rpgMarket.filter(it => it !== found);
      saveRpg(m, rpg);
      await m.react("🐣");
      await animGeneric(m, sock, '🏪', 'Opening market');
      return m.reply(claraWrap("marketrpg", `✅ Kamu membeli *${found.item}* seharga ${found.harga} gold.`, "success"));
    }
  } catch (e) { return m.reply(claraWrap("marketrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };