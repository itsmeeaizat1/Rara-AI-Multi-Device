import { getDatabase } from "../../src/lib/nova-database.js";
import { addExpWithLevelCheck } from "../../src/lib/nova-level.js";
import config from "../../config.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "hourly",
  alias: ["jam", "perjam"],
  category: "rpg",
  description: "Klaim hadiah per jam",
  usage: ".hourly",
  example: ".hourly",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 0,
  energi: 0,
  isEnabled: true,
};

function msToTime(duration) {
  const minutes = Math.floor((duration / (1000 * 60)) % 60);
  const seconds = Math.floor((duration / 1000) % 60);
  return `${minutes} menit ${seconds} detik`;
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  const isPremium = config.isPremium?.(m.sender) || false;

  if (!user.rpg) user.rpg = {};

  const COOLDOWN = 3600000;
  const lastClaim = user.rpg.lastHourly || 0;
  const now = Date.now();

  if (now - lastClaim < COOLDOWN) {
    const remaining = COOLDOWN - (now - lastClaim);
    return m.reply(claraWrap("Hourly", `Eits, buru-buru amat kak! 😂\n\nJatah jam ini udah kamu ambil, tunggu *${msToTime(remaining)}* lagi ya baru balik ke sini! 🏃💨`));
  }

  const expReward = isPremium ? 1000 : 200;
  const moneyReward = isPremium ? 5000 : 1000;

  user.rpg.lastHourly = now;
  user.koin = (user.koin || 0) + moneyReward;

  const levelResult = await addExpWithLevelCheck(sock, m, db, user, expReward);
  db.save();


  let txt = `WAKTUNYA GAJIAN JAM-JAMAN! ⏰✨\n\n`;
  txt += `Ini dia jatah kamu:\n`;
  txt += `💸 Koin: *+Rp ${moneyReward.toLocaleString("id-ID")}*\n`;
  txt += `📈 EXP: *+${expReward.toLocaleString("id-ID")}*\n\n`;
  txt += `Balik lagi 1 jam kemudian ya kak! 😘`;

  await sendReplyWithNav(sock, m, txt, "hourly");
}

export { pluginConfig as config, handler };
