// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getUser, addUserExp, addUserMoney, formatTime } from "../../src/lib/nova-rpg.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "rpgweekly", alias: ["weeklyrpg", "weeklyclaim", "claimweekly"], category: "rpg",
  description: "Claim reward mingguan RPG", usage: ".rpgweekly",
  example: ".rpgweekly", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: true, cooldown: 0, energi: 0, isEnabled: true,
};

const COOLDOWN = 604800000; // 7 days

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const user = getUser(db, m.sender);
    
    const remaining = COOLDOWN - (Date.now() - user.lastWeekly);
    if (remaining > 0) {
      await sendReplyWithNav(sock, m, claraWrap("Weekly Reward", [`╎❏ Tunggu: *${formatTime(remaining)}*`].join("\n")), "rpgweekly");
      return { handled: true };
    }
    
    const exp = 5000 + Math.floor(Math.random() * 2000);
    const money = 25000 + Math.floor(Math.random() * 10000);
    const diamond = 3;
    const potion = 5;
    
    user.diamond += diamond;
    user.potion += potion;
    user.lastWeekly = Date.now();
    addUserExp(db, m.sender, exp);
    addUserMoney(db, m.sender, money);
    
    await sendReplyWithNav(sock, m, claraWrap("Weekly Reward", [`╎❏ EXP: *+${exp}* ✨`,
      `╎❏ Money: *+Rp${money.toLocaleString("id-ID")}* 💰`,
      `╎❏ Diamond: *+${diamond}* 💎`,
      `╎❏ Potion: *+${potion}* 🧪`].join("\n")) + "\n" + tipText(`Claim lagi minggu depan!`), "rpgweekly");
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };