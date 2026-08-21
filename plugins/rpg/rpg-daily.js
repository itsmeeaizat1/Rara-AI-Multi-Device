// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getUser, addUserExp, addUserMoney, formatTime } from "../../src/lib/nova-rpg.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "rpgdaily", alias: ["dailyrpg", "dailyclaim", "claimdaily"], category: "rpg",
  description: "Claim reward harian RPG", usage: ".rpgdaily",
  example: ".rpgdaily", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: true, cooldown: 0, energi: 0, isEnabled: true,
};

const COOLDOWN = 86400000; // 24 hours

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const user = getUser(db, m.sender);
    
    const remaining = COOLDOWN - (Date.now() - user.lastDaily);
    if (remaining > 0) {
      await sendReplyWithNav(sock, m, claraWrap("Daily Reward", [`╎❏ Tunggu: *${formatTime(remaining)}*`].join("\n")), "rpgdaily");
      return { handled: true };
    }
    
    const exp = 1000 + Math.floor(Math.random() * 500);
    const money = 5000 + Math.floor(Math.random() * 5000);
    const potion = 2;
    
    user.potion += potion;
    user.lastDaily = Date.now();
    addUserExp(db, m.sender, exp);
    addUserMoney(db, m.sender, money);
    
    await sendReplyWithNav(sock, m, claraWrap("Daily Reward", [`╎❏ EXP: *+${exp}* ✨`,
      `╎❏ Money: *+Rp${money.toLocaleString("id-ID")}* 💰`,
      `╎❏ Potion: *+${potion}* 🧪`].join("\n")) + "\n" + tipText(`Claim lagi besok ya!`), "rpgdaily");
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };