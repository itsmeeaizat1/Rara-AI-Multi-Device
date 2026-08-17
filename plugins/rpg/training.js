// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { addExpWithLevelCheck } from "../../src/lib/nova-level.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "training",
  alias: ["train", "latihan", "workout"],
  category: "rpg",
  description: "Latihan untuk meningkatkan stats",
  usage: ".training <attack/defense/health>",
  example: ".training attack",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 180,
  energi: 1,
  isEnabled: true,
};

const TRAINING_TYPES = {
  attack: { name: "⚔️ Attack Training", stat: "attack", bonus: [1, 3], exp: 80, staminaCost: 20 },
  defense: { name: "🛡️ Defense Training", stat: "defense", bonus: [1, 2], exp: 70, staminaCost: 15 },
  health: { name: "❤️ Health Training", stat: "health", bonus: [5, 15], exp: 90, staminaCost: 25 },
  speed: { name: "💨 Speed Training", stat: "speed", bonus: [1, 2], exp: 75, staminaCost: 18 },
  luck: { name: "🍀 Luck Training", stat: "luck", bonus: [1, 2], exp: 85, staminaCost: 22 },
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);

  if (!user.rpg) user.rpg = {};

  const args = m.args || [];
  const trainType = args[0]?.toLowerCase();

  if (!trainType) {
    let txt = `🏋️ *Training sYstem*\n\n`;
    txt += `Latihan untuk meningkatkan stats!\n\n`;
    txt += `*📊 *sTats Kamu:*
\n`;
    txt += `⚔️ Attack: *${user.rpg.attack || 10}*\n`;
    txt += `🛡️ Defense: *${user.rpg.defense || 5}*\n`;
    txt += `❤️ Health: *${user.rpg.health || 100}*\n`;
    txt += `💨 Speed: *${user.rpg.speed || 10}*\n`;
    txt += `🍀 Luck: *${user.rpg.luck || 5}*\n`;
    txt += `⚡ Stamina: *${user.rpg.stamina ?? 100}*\n`;
    txt += `\n\n`;
    txt += `*🏋️ *Training:*
\n`;
    for (const [key, train] of Object.entries(TRAINING_TYPES)) {
      txt += `${train.name}\n`;
      txt += `⚡ Stamina: ${train.staminaCost}\n`;
      txt += `→ \`${m.prefix}training ${key}\`\n> \n`;
    }
    txt += ``;
    return await sendReplyWithNav(sock, m, txt, "training");
  }

  const training = TRAINING_TYPES[trainType];
  if (!training) {
    return sendReplyWithNav(sock, m, `❌ Training tidak ditemukan!\n\n> Ketik \`${m.prefix}training\` untuk melihat daftar.`, "training");
  }

  user.rpg.stamina = user.rpg.stamina ?? 100;

  if (user.rpg.stamina < training.staminaCost) {
    return sendReplyWithNav(sock, m, `⚡ *sTamina Kurang*\n\n` + `Butuh: ${training.staminaCost}\n` + `Punya: ${user.rpg.stamina}\n\n` + `💡 Gunakan \`${m.prefix}rest\` atau makan makanan`, "training");
  }

  user.rpg.stamina -= training.staminaCost;

  m.reply(claraWrap("Training", `🏋️ *Latihan ${training.name.toUpperCase()}...*`));
  await new Promise((r) => setTimeout(r, 2500));

  const statBonus = Math.floor(Math.random() * (training.bonus[1] - training.bonus[0] + 1)) + training.bonus[0];
  const currentStat = user.rpg[training.stat] || (training.stat === "health" ? 100 : training.stat === "attack" ? 10 : 5);
  user.rpg[training.stat] = currentStat + statBonus;

  await addExpWithLevelCheck(sock, m, db, user, training.exp);
  db.save();

  return sendReplyWithNav(sock, m, `💪 *Training sElesai!*\n\n` +
      `*📊 *Result:*
\n` +
      `🏋️ Training: *${training.name}*\n` +
      `📈 ${training.stat}: *${currentStat} → ${currentStat + statBonus}* (+${statBonus})\n` +
      `⚡ Stamina: *-${training.staminaCost}*\n` +
      `✨ EXP: *+${training.exp}*\n` +
      ``, "training");
}

export { pluginConfig as config, handler };
