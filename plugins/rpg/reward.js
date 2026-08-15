// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { ensurePlayer } from "../../src/lib/nova-rpg-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "reward",
  alias: ["hadiahv2", "klaimv2", "weeklyrewardv2", "rewardv2"],
  category: "economy",
  description: "Klaim hadiah harian/mingguan",
  usage: ".reward",
  example: ".reward",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 86400,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const userKey = String(m.sender || m.chat);
    const rewardData = db.get(`reward:${userKey}`) || {};
    const today = new Date().toISOString().slice(0, 10);
    const lastClaim = String(rewardData.date || "");

    if (lastClaim === today) {
      const text =
        claraWrap("Reward", ["◦ Kamu sudah klaim hadiah hari ini!",
          "◦ Kembali lagi *besok* untuk claim lagi.",
          "◦ Next Claim: *00:00 WIB*"].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "reward");
      return { handled: true };
    }

    const gold = Math.floor(Math.random() * 500) + 100;
    const exp = Math.floor(Math.random() * 50) + 20;

    const player = ensurePlayer(db, userKey);
    if (player.gold === undefined) player.gold = 0;
    if (player.exp === undefined) player.exp = 0;
    player.gold += gold;
    player.exp += exp;
    db.set(`rpg:${userKey}`, player);

    rewardData.date = today;
    db.set(`reward:${userKey}`, rewardData);

    const text =
      claraWrap("Hadiah", [`◦ Gold: *+${gold}*`,
        `◦ Exp: *+${exp}*`,
        "◦ Streak: *1 hari*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}reward untuk claim lagi besok`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "reward");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("reward", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
