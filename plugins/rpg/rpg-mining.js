// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader,  separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getUser, addUserExp, addUserMoney, formatTime, pickRandom } from "../../src/lib/nova-rpg.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "miningv2", alias: ["tambangrpg", "miningrpg", "minerpg"], category: "rpg",
  description: "Menambang untuk dapat ore & diamond", usage: ".mining",
  example: ".mining", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: false, cooldown: 0, energi: 0, isEnabled: true,
};

const COOLDOWN = 1800000; // 30 min

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const user = getUser(db, m.sender);
    
    if (user.stamina < 20) {
      await sendReplyWithNav(sock, m, claraWrap("Mining", [`╎❏ Stamina: *${user.stamina}/100*`,
        "╎❏ Minimal 20 stamina untuk menambang"].join("\n")), "mining");
      return { handled: true };
    }
    
    const remaining = COOLDOWN - (Date.now() - user.lastMining);
    if (remaining > 0) {
      await sendReplyWithNav(sock, m, claraWrap("Mining", [`╎❏ Tunggu: *${formatTime(remaining)}*`].join("\n")), "mining");
      return { handled: true };
    }
    
    const staminaLoss = Math.floor(Math.random() * 15) + 10;
    const iron = Math.floor(Math.random() * 8) + 2;
    const rock = Math.floor(Math.random() * 12) + 5;
    const diamond = Math.random() < 0.3 ? Math.floor(Math.random() * 2) + 1 : 0;
    const exp = Math.floor(Math.random() * 1500) + 200;
    const money = Math.floor(Math.random() * 15000) + 2000;
    
    user.stamina -= staminaLoss;
    user.iron += iron;
    user.rock += rock;
    if (diamond > 0) user.diamond += diamond;
    user.lastMining = Date.now();
    addUserExp(db, m.sender, exp);
    addUserMoney(db, m.sender, money);
    
    const result = pickRandom(["Kamu menemukan tambang emas!", "Kamu menemukan gua dengan ore!", "Kamu menggali jauh ke bawah tanah!", "Kamu menemukan deposit berlian!"]);
    
    let text = claraWrap("Mining", "⛏️") + "\n\n";
    text += claraWrap("Nambang", [`╎❏ ${result}`, `╎❏ Stamina: *-${staminaLoss}* ⚡`, `╎❏ Sisa: *${user.stamina}/100*`].join("\n")) + "\n\n";
    text += claraWrap("Hasil", [
      `╎❏ Iron: *+${iron}* ⚙️`,
      `╎❏ Rock: *+${rock}* 🪨`,
      diamond > 0 ? `╎❏ Diamond: *+${diamond}* 💎` : "",
      `╎❏ EXP: *+${exp}* ✨`,
      `╎❏ Money: *+Rp${money.toLocaleString("id-ID")}* 💰`,
    ].filter(Boolean)) + "\n\n";
    text += separator("━", 22) + "\n" + tipText(`Tunggu 30 menit untuk menambang lagi`);
    await sendReplyWithNav(sock, m, text, "mining");
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };