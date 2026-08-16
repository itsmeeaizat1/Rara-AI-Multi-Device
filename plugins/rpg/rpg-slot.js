// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader, separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getUser, addUserMoney, pickRandom } from "../../src/lib/nova-rpg.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "rpgslot", alias: ["slotrpg", "casinorg", "judirpg"], category: "rpg",
  description: "Slot casino RPG - gambling", usage: ".rpgslot <jumlah bet>",
  example: ".rpgslot 1000", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

const EMOJIS = ["🍇", "🍋", "🍊", "🍒", "💎", "7️⃣"];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const bet = parseInt(m.text?.trim()) || 0;
    if (!bet || bet < 100) {
      await sendReplyWithNav(sock, m, claraWrap("Slot", "") + "\n\n" + claraWrap("Info", [`◦ Penggunaan: *${prefix}rpgslot <jumlah>*`, `◦ Minimal bet: *Rp100*`, `◦ 3 sama = x5 | 2 sama = x2`].join("\n")) + "\n\n" + separator("━", 22), "rpgslot");
      return { handled: true };
    }
    const db = getDatabase();
    const user = getUser(db, m.sender);
    if (user.money < bet) {
      await sendReplyWithNav(sock, m, claraWrap("Slot", [`◦ Bet: *Rp${bet.toLocaleString("id-ID")}*`,
        `◦ Uang: *Rp${user.money.toLocaleString("id-ID")}*`].join("\n")), "rpgslot");
      return { handled: true };
    }
    
    const slot = [pickRandom(EMOJIS), pickRandom(EMOJIS), pickRandom(EMOJIS)];
    let multiplier = 0;
    if (slot[0] === slot[1] && slot[1] === slot[2]) multiplier = 5;
    else if (slot[0] === slot[1] || slot[1] === slot[2] || slot[0] === slot[2]) multiplier = 2;
    
    let result, winLoss;
    if (multiplier > 0) {
      const win = bet * multiplier;
      addUserMoney(db, m.sender, win);
      result = `🎉 MENANG x${multiplier}!`;
      winLoss = `+Rp${win.toLocaleString("id-ID")}`;
    } else {
      user.money -= bet;
      db.write();
      result = "💀 KALAH!";
      winLoss = `-Rp${bet.toLocaleString("id-ID")}`;
    }
    
    await sendReplyWithNav(sock, m, claraWrap("Slot", [`◦ ${slot[0]} | ${slot[1]} | ${slot[2]}`,
      `◦ Hasil: *${result}*`,
      `◦ ${winLoss}`,
      `◦ Sisa uang: *Rp${user.money.toLocaleString("id-ID")}*`].join("\n")) + "\n" + tipText(`Tetap main, mungkin menang besok! 😄`), "rpgslot");
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };