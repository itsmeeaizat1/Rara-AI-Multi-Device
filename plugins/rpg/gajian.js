// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// gajian.js — Menerima gaji harian RPG
import { ensureRpg, addExp, addGold, checkCooldown, setCooldown, formatTime } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "gajian",
  alias: ["gajian", "salary"],
  category: "rpg",
  description: "Menerima gaji harian (cooldown 45 menit)",
  usage: ".gajian",
  example: ".gajian",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 0, isEnabled: true,
};

const GAJIAN_COOLDOWN = 45 * 60 * 1000;
const GAJIAN_GOLD = 50000;
const GAJIAN_EXP = 100;

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("gajian", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const cd = checkCooldown(m, "lastGajian");
    if (cd) {
      await m.react("🚫");
      return m.reply(claraWrap("gajian", `Kamu baru saja gajian!\nTunggu *${formatTime(cd)}* lagi untuk gajian berikutnya.`, "error"));
    }

    addGold(m, GAJIAN_GOLD);
    addExp(m, GAJIAN_EXP);
    setCooldown(m, "lastGajian", GAJIAN_COOLDOWN);

    await m.react("🐣");
    let msg = `╭──「 *GAJIAN* 」\n`;
    msg += `│ 👤 ${m.pushName}\n`;
    msg += `│ 💰 +${GAJIAN_GOLD.toLocaleString("id-ID")} gold\n`;
    msg += `│ ✨ +${GAJIAN_EXP} EXP\n`;
    msg += `│\n`;
    msg += `│ Tunggu 45 menit untuk gajian berikutnya.\n`;
    msg += `╰──────────`;
    return m.reply(msg);
  } catch (err) {
    console.error("gajian error:", err);
    await m.react("❌");
    return m.reply(claraWrap("gajian", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
