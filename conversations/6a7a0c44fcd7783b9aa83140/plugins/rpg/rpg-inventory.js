import { alyaHeader,  separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getUser, getRole } from "../../src/lib/nova-rpg.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "inventoryv2", alias: ["inventoryv2", "invv2", "tasv2", "invrpg"], category: "rpg",
  description: "Lihat inventory RPG kamu", usage: ".inventory",
  example: ".inventory", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: true, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const user = getUser(db, m.sender);
    const role = getRole(user.level);
    
    let text = claraWrap("Inventory", "🎒") + "\n\n";
    text += claraWrap("ɪɴꜰᴏ", [
      `◦ Player: *@${m.sender.split("@")[0]}*`,
      `◦ Level: *${user.level}* (${role})`,
      `◦ Money: *Rp${user.money.toLocaleString("id-ID")}*`,
    ]) + "\n\n";
    text += claraWrap("ɪᴛᴇᴍ", [`◦ Potion: *${user.potion}* 🧪`, `◦ Diamond: *${user.diamond}* 💎`, `◦ Emerald: *${user.emerald}* 🟢`, `◦ Iron: *${user.iron}* ⚙️`, `◦ Wood: *${user.wood}* 🪵`, `◦ Rock: *${user.rock}* 🪨`, `◦ String: *${user.string}* 🧵`, `◦ Trash: *${user.trash}* 🗑️`].join("\n")) + "\n\n";
    text += claraWrap("ᴇǫᴜɪᴘᴍᴇɴᴛ", [`◦ Sword: *${user.sword > 0 ? "Lv." + user.sword : "Tidak punya"}*`, `◦ Armor: *${user.armor > 0 ? "Lv." + user.armor : "Tidak punya"}*`, `◦ Pickaxe: *${user.pickaxe > 0 ? "Lv." + user.pickaxe : "Tidak punya"}*`, `◦ Fishing Rod: *${user.fishingrod > 0 ? "Lv." + user.fishingrod : "Tidak punya"}*`].join("\n")) + "\n\n";
    text += claraWrap("ᴘᴇᴛ", [`◦ Kucing: *${user.kucing > 0 ? "Lv." + user.kucing : "Tidak punya"}*`, `◦ Kuda: *${user.kuda > 0 ? "Lv." + user.kuda : "Tidak punya"}*`, `◦ Naga: *${user.naga > 0 ? "Lv." + user.naga : "Tidak punya"}*`, `◦ Rubah: *${user.rubah > 0 ? "Lv." + user.rubah : "Tidak punya"}*`, `◦ Serigala: *${user.serigala > 0 ? "Lv." + user.serigala : "Tidak punya"}*`].join("\n")) + "\n\n";
    text += separator("━", 22) + "\n" + tipText(`Ketik ${prefix}rpgshop untuk beli/jual item`);
    await sendReplyWithNav(sock, m, text, "inventory");
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };