import { ensureRpg, saveRpg, getRpgData, addItem } from "../../src/lib/nova-rpg-service.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";
const pluginConfig = {
  name: "lootrpg", alias: ["lootrpg", "loot", "ramtas"],
  category: "rpg", description: "Loot item dari musuh yang mati (reply target)",
  usage: ".lootrpg (reply target)", example: ".lootrpg (reply pesan target)",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 5, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    if (!m.quoted) return m.reply(novaRpgBox("lootrpg", "Reply ke pesan musuh yang mati.", "guide"));
    const targetJid = m.quoted.sender;
    const target = getRpgData({ sender: targetJid, key: { remoteJid: targetJid } });
    if (!target) return m.reply(novaRpgBox("lootrpg", "Target belum terdaftar.", "error"));
    if (target.hp > 0) return m.reply(novaRpgBox("lootrpg", "🎯 Target masih hidup!", "error"));
    const inv = target.inventory || {};
    const items = Object.keys(inv).filter(k => inv[k] > 0);
  await animGeneric(m, sock, "💰", "Collecting Loot");
    if (!items.length) return m.reply(novaRpgBox("lootrpg", "📭 Tidak ada barang untuk di-loot.", "info"));
    const loot = items[0];
    addItem(m, loot, 1);
    if (inv[loot] > 1) inv[loot]--; else delete inv[loot];
    saveRpg({ sender: targetJid, key: { remoteJid: targetJid } }, target);
    saveRpg(m, ensureRpg(m, m.pushName));
    await m.react("🐣");
    return m.reply(novaRpgBox("lootrpg", `💰 Kamu berhasil mengambil *${loot}* dari musuh.`, "success"));
  } catch (e) { return m.reply(novaRpgBox("lootrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
