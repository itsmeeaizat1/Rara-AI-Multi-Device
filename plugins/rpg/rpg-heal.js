import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getUser } from "../../src/lib/nova-rpg.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "rpgheal", alias: ["healrpg", "minumpotion", "rpghealpotion"], category: "rpg",
  description: "Gunakan potion untuk heal HP", usage: ".rpgheal",
  example: ".rpgheal", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: true, cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const user = getUser(db, m.sender);
    
    if (user.health >= 100) {
      await sendReplyWithNav(sock, m, claraWrap("Heal", [`◦ HP: *${user.health}/100*`,
        "◦ HP sudah penuh!"].join("\n")), "rpgheal");
      return { handled: true };
    }
    
    if (user.potion < 1) {
      await sendReplyWithNav(sock, m, claraWrap("Heal", ["◦ Kamu tidak punya potion",
        `◦ Beli di shop: *${prefix}rpgshop buy potion 1*`].join("\n")), "rpgheal");
      return { handled: true };
    }
    
    const healAmount = 50;
    user.potion -= 1;
    user.health = Math.min(100, user.health + healAmount);
    db.write();
    
    { const __navText = (claraWrap("Heal", [`◦ Potion: *-1* 🧪`,
      `◦ HP: *+${healAmount}* ❤️`,
      `◦ Sisa HP: *${user.health}/100*`,
      `◦ Sisa Potion: *${user.potion}*`].join("\n"))); await sendReplyWithNav(sock, m, __navText, "rpgheal"); };
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };