// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader,  separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getUser, getRole, findLevel, xpRange, formatTime } from "../../src/lib/nova-rpg.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "rpgprofile", alias: ["profilrpg", "rpgme", "rpginfo"], category: "rpg",
  description: "Lihat profile RPG kamu", usage: ".rpgprofile",
  example: ".rpgprofile", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: true, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const user = getUser(db, m.sender);
    const role = getRole(user.level);
    const { min, max, xp } = xpRange(user.level);
    const currXp = user.exp - min;
    const progress = Math.floor((currXp / xp) * 20);
    const bar = "█".repeat(progress) + "░".repeat(20 - progress);
    
    let text = claraWrap("RPG Profile", "⚔️") + "\n\n";
    text += claraWrap("Profile", [
      `╎❏ Nama: *@${m.sender.split("@")[0]}*`,
      `╎❏ Level: *${user.level}*`,
      `╎❏ Role: *${role}*`,
      `╎❏ EXP: *${currXp}/${xp}*`,
    ]) + "\n\n";
    text += claraWrap("Progres", [`╎❏ ${bar}`, `╎❏ Sisa: *${max - user.exp} EXP* ke level ${user.level + 1}`].join("\n")) + "\n\n";
    text += claraWrap("sTatus", [`╎❏ HP: *${user.health}/100* ❤️`, `╎❏ Stamina: *${user.stamina}/100* ⚡`, `╎❏ Money: *Rp${user.money.toLocaleString("id-ID")}*`, `╎❏ Diamond: *${user.diamond}* 💎`, `╎❏ Emerald: *${user.emerald}* 🟢`].join("\n")) + "\n\n";
    text += claraWrap("Inventory", [`╎❏ Potion: *${user.potion}* 🧪`, `╎❏ Iron: *${user.iron}* ⚙️`, `╎❏ Wood: *${user.wood}* 🪵`, `╎❏ Rock: *${user.rock}* 🪨`, `╎❏ String: *${user.string}* 🧵`, `╎❏ Trash: *${user.trash}* 🗑️`].join("\n")) + "\n\n";
    text += claraWrap("Equipment", [`╎❏ Sword: *${user.sword > 0 ? "Lv." + user.sword : "Tidak punya"}*`, `╎❏ Armor: *${user.armor > 0 ? "Lv." + user.armor : "Tidak punya"}*`, `╎❏ Pickaxe: *${user.pickaxe > 0 ? "Lv." + user.pickaxe : "Tidak punya"}*`, `╎❏ Fishing Rod: *${user.fishingrod > 0 ? "Lv." + user.fishingrod : "Tidak punya"}*`].join("\n")) + "\n\n";
    text += separator("━", 22) + "\n" + tipText(`Ketik ${prefix}rpgmenu untuk lihat semua fitur RPG`);
    await sendReplyWithNav(sock, m, text, "rpgprofile");
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };