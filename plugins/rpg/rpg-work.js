import { separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getUser, addUserExp, addUserMoney, formatTime, pickRandom } from "../../src/lib/nova-rpg.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "rpgwork", alias: ["kerjargs", "workrpg", "rpgkerja"], category: "rpg",
  description: "Bekerja untuk dapat money & EXP", usage: ".rpgwork",
  example: ".rpgwork", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: true, cooldown: 0, energi: 0, isEnabled: true,
};

const COOLDOWN = 1800000; // 30 min
const JOBS = [
  { name: "Kuli Panggul", exp: 200, money: 5000, stamina: 15 },
  { name: "Tukang Parkir", exp: 300, money: 8000, stamina: 10 },
  { name: "Gojek Driver", exp: 400, money: 12000, stamina: 20 },
  { name: "Satpam Mall", exp: 350, money: 10000, stamina: 15 },
  { name: "Kasir Indomaret", exp: 250, money: 7000, stamina: 10 },
  { name: "Tukang Cukur", exp: 500, money: 15000, stamina: 15 },
  { name: "Programmer Freelance", exp: 800, money: 25000, stamina: 25 },
  { name: "Barista", exp: 400, money: 12000, stamina: 15 },
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const user = getUser(db, m.sender);
    
    const remaining = COOLDOWN - (Date.now() - user.lastWork);
    if (remaining > 0) {
      await sendReplyWithNav(sock, m, claraWrap("Work", [`◦ Tunggu: *${formatTime(remaining)}*`].join("\n")), "rpgwork");
      return { handled: true };
    }
    
    if (user.stamina < 10) {
      await sendReplyWithNav(sock, m, claraWrap("Work", [`◦ Stamina: *${user.stamina}/100*`].join("\n")), "rpgwork");
      return { handled: true };
    }
    
    const job = pickRandom(JOBS);
    user.stamina -= job.stamina;
    user.lastWork = Date.now();
    addUserExp(db, m.sender, job.exp);
    addUserMoney(db, m.sender, job.money);
    
    await sendReplyWithNav(sock, m, claraWrap("Work", [`◦ Pekerjaan: *${job.name}*`,
      `◦ Stamina: *-${job.stamina}* ⚡`,
      `◦ Sisa: *${user.stamina}/100*`].join("\n")) + "\n\n" + claraWrap("ɢᴀᴊɪ", [`◦ EXP: *+${job.exp}* ✨`, `◦ Money: *+Rp${job.money.toLocaleString("id-ID")}* 💰`].join("\n")) + "\n\n" + separator("━", 22) + "\n" + tipText(`Tunggu 30 menit untuk bekerja lagi`), "rpgwork");
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };