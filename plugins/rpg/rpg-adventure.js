// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader,  separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getUser, addUserExp, addUserMoney, formatTime, pickRandom } from "../../src/lib/nova-rpg.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "adventurev2", alias: ["adventurev2", "petualanganv2", "adv2", "advrpg"], category: "rpg",
  description: "Berpetualang untuk dapat EXP & item", usage: ".adventure",
  example: ".adventure", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: false, cooldown: 0, energi: 0, isEnabled: true,
};

const COOLDOWN = 3600000; // 1 hour

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const user = getUser(db, m.sender);
    
    if (user.health < 80) {
      await sendReplyWithNav(sock, m, claraWrap("Adventure", [`╎❏ HP: *${user.health}/100*`,
        "╎❏ Minimal 80 HP untuk berpetualang",
        `╎❏ Ketik *${prefix}heal* untuk menggunakan potion`].join("\n")), "adventure");
      return { handled: true };
    }
    
    const remaining = COOLDOWN - (Date.now() - user.lastAdventure);
    if (remaining > 0) {
      await sendReplyWithNav(sock, m, claraWrap("Adventure", ["╎❏ Kamu sudah berpetualang hari ini",
        `╎❏ Tunggu: *${formatTime(remaining)}*`].join("\n")), "adventure");
      return { handled: true };
    }
    
    const enemy = pickRandom(["Raksasa", "Beruang", "Harimau", "Macan", "Iblis", "Goblin", "Orc", "Bandit"]);
    const hpLoss = Math.floor(Math.random() * 30) + 10;
    const exp = Math.floor(Math.random() * 5000) + 500;
    const money = Math.floor(Math.random() * 50000) + 5000;
    const diamond = Math.floor(Math.random() * 5);
    const iron = Math.floor(Math.random() * 10) + 1;
    const wood = Math.floor(Math.random() * 15) + 5;
    
    user.health -= hpLoss;
    user.iron += iron;
    user.wood += wood;
    if (diamond > 0) user.diamond += diamond;
    user.lastAdventure = Date.now();
    
    const { leveledUp, newLevel, oldLevel } = addUserExp(db, m.sender, exp);
    addUserMoney(db, m.sender, money);
    
    let text = claraWrap("Adventure", "⚔️") + "\n\n";
    text += claraWrap("Petualang", [`╎❏ Musuh: *${enemy}*`, `╎❏ HP Berkurang: *-${hpLoss}* ❤️`, `╎❏ Sisa HP: *${user.health}/100*`].join("\n")) + "\n\n";
    text += claraWrap("Hasil", [
      `╎❏ EXP: *+${exp}* ✨`,
      `╎❏ Money: *+Rp${money.toLocaleString("id-ID")}* 💰`,
      `╎❏ Iron: *+${iron}* ⚙️`,
      `╎❏ Wood: *+${wood}* 🪵`,
      diamond > 0 ? `╎❏ Diamond: *+${diamond}* 💎` : "",
    ].filter(Boolean)) + "\n\n";
    
    if (leveledUp) {
      text += claraWrap("Level Up!", [`╎❏ Level: *${oldLevel} → ${newLevel}*`, `╎❏ Congrats! 🔥`].join("\n")) + "\n\n";
    }
    
    text += separator("━", 22) + "\n" + tipText(`Tunggu 1 jam untuk petualang lagi`);
    await sendReplyWithNav(sock, m, text, "adventure");
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };