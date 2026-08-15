import { claraHeader, separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getUser, addUserExp, addUserMoney, formatTime, pickRandom } from "../../src/lib/nova-rpg.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "huntv2", alias: ["huntv2", "berburuv2", "buruv2", "huntrpg"], category: "rpg",
  description: "Berburu hewan untuk dapat EXP & money", usage: ".hunt",
  example: ".hunt", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: false, cooldown: 0, energi: 0, isEnabled: true,
};

const COOLDOWN = 1200000; // 20 min
const ANIMALS = [
  { name: "Rusa", exp: 300, money: 5000, hp: 5 },
  { name: "Babi Hutan", exp: 500, money: 8000, hp: 10 },
  { name: "Beruang", exp: 800, money: 15000, hp: 20 },
  { name: "Serigala", exp: 600, money: 10000, hp: 15 },
  { name: "Harimau", exp: 1200, money: 25000, hp: 25 },
  { name: "Naga Kecil", exp: 2000, money: 50000, hp: 40 },
  { name: "Kelinci", exp: 150, money: 2000, hp: 3 },
  { name: "Ayam Hutan", exp: 100, money: 1500, hp: 2 },
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const user = getUser(db, m.sender);
    
    if (user.stamina < 15) {
      await sendReplyWithNav(sock, m, claraWrap("Hunt", [`◦ Stamina: *${user.stamina}/100*`,
        "◦ Minimal 15 stamina untuk berburu"].join("\n")), "hunt");
      return { handled: true };
    }
    
    const remaining = COOLDOWN - (Date.now() - user.lastHunt);
    if (remaining > 0) {
      await sendReplyWithNav(sock, m, claraWrap("Hunt", [`◦ Tunggu: *${formatTime(remaining)}*`].join("\n")), "hunt");
      return { handled: true };
    }
    
    const animal = pickRandom(ANIMALS);
    const success = Math.random() > 0.2;
    
    if (!success) {
      user.stamina -= 10;
      user.lastHunt = Date.now();
      db.write();
      await sendReplyWithNav(sock, m, claraWrap("Hunt", "") + "\n\n" + claraWrap("ᴋᴀʙᴜʀ", [`◦ ${animal.name} berhasil kabur!`, "◦ Coba lagi nanti"].join("\n")) + "\n\n" + separator("━", 22), "hunt");
      return { handled: true };
    }
    
    user.health -= animal.hp;
    user.stamina -= 10;
    user.lastHunt = Date.now();
    addUserExp(db, m.sender, animal.exp);
    addUserMoney(db, m.sender, animal.money);
    
    await sendReplyWithNav(sock, m, claraWrap("Hunt", [`◦ Target: *${animal.name}*`,
      `◦ HP: *-${animal.hp}* ❤️`,
      `◦ Stamina: *-10* ⚡`].join("\n")) + "\n\n" + claraWrap("ʜᴀsɪʟ", [`◦ EXP: *+${animal.exp}* ✨`, `◦ Money: *+Rp${animal.money.toLocaleString("id-ID")}* 💰`].join("\n")) + "\n\n" + separator("━", 22) + "\n" + tipText(`Tunggu 20 menit untuk berburu lagi`), "hunt");
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };