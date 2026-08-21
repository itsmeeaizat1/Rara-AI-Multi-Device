// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader, separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getUser, addUserExp, addUserMoney, formatTime, pickRandom } from "../../src/lib/nova-rpg.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "fishv2", alias: ["fishingv2", "mancingv2", "rpgfishv2", "fishv2"], category: "rpg",
  description: "Memancing untuk dapat ikan & money", usage: ".fish",
  example: ".fish", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: false, cooldown: 0, energi: 0, isEnabled: true,
};

const COOLDOWN = 900000; // 15 min
const FISHES = [
  { name: "Lele", exp: 100, money: 1000, rare: false },
  { name: "Nila", exp: 150, money: 1500, rare: false },
  { name: "Mas", exp: 200, money: 2500, rare: false },
  { name: "Gurame", exp: 300, money: 4000, rare: false },
  { name: "Tuna", exp: 500, money: 8000, rare: true },
  { name: "Salmon", exp: 700, money: 12000, rare: true },
  { name: "Hiu Kecil", exp: 1500, money: 30000, rare: true },
  { name: "Paus Mini", exp: 3000, money: 60000, rare: true },
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const user = getUser(db, m.sender);
    
    const remaining = COOLDOWN - (Date.now() - user.lastFish);
    if (remaining > 0) {
      await sendReplyWithNav(sock, m, claraWrap("Fish", [`  ┊  ➶ Tunggu: *${formatTime(remaining)}*`].join("\n")), "fish");
      return { handled: true };
    }
    
    // Rare fish 20% chance
    const pool = Math.random() < 0.2 ? FISHES.filter(f => f.rare) : FISHES.filter(f => !f.rare);
    const fish = pickRandom(pool);
    const success = Math.random() > 0.15;
    
    if (!success) {
      user.lastFish = Date.now();
      db.write();
      await sendReplyWithNav(sock, m, claraWrap("Fish", "") + "\n\n" + claraWrap("Gagal", ["  ┊  ➶ Tidak ada ikan yang tertangkap!", "  ┊  ➶ Coba lagi nanti"].join("\n")) + "\n\n" + separator("━", 22), "fish");
      return { handled: true };
    }
    
    const staminaLoss = 5;
    user.stamina -= staminaLoss;
    user.lastFish = Date.now();
    addUserExp(db, m.sender, fish.exp);
    addUserMoney(db, m.sender, fish.money);
    
    await sendReplyWithNav(sock, m, claraWrap("Fish", [`  ┊  ➶ Ikan: *${fish.name}*${fish.rare ? " ✨ RARE!" : ""}`,
      `  ┊  ➶ Stamina: *-${staminaLoss}* ⚡`].join("\n")) + "\n\n" + claraWrap("Hasil", [`  ┊  ➶ EXP: *+${fish.exp}* ✨`, `  ┊  ➶ Money: *+Rp${fish.money.toLocaleString("id-ID")}* 💰`].join("\n")) + "\n\n" + separator("━", 22) + "\n" + tipText(`Tunggu 15 menit untuk mancing lagi`), "fish");
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };