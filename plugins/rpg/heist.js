// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader,
    separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, savePlayer } from "../../src/lib/nova-rpg-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "heist",
  alias: ["heist", "rampokbank", "bankraid", "heist"],
  category: "economy",
  description: "Rampok bank dengan risiko tinggi",
  usage: ".heist",
  example: ".heist",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 7200,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const userName = m.pushName || "Player";
    const player = ensurePlayer(m, userName);
    const rpg = player?.rpg || {};

    const roll = Math.random();
    const maxReward = 400;
    const maxPenalty = 250;

    let rewardGold = 0;
    let penaltyGold = 0;
    let result = "";

    if (roll < 0.45) {
      rewardGold = Math.floor(Math.random() * maxReward) + 80;
      result = "Rampokan berhasil!";
    } else if (roll < 0.75) {
      penaltyGold = Math.floor(Math.random() * maxPenalty) + 40;
      result = "Rampokan gagal dan kamu ditilang.";
    } else {
      result = "Keamanan bank menangkapmu, tapi kamu lolos tanpa hukuman.";
    }

    if (rewardGold > 0) addGold(m, rewardGold);
    if (penaltyGold > 0) addGold(m, -penaltyGold);

    const updated = getPlayer(m);
    const updatedRpg = updated?.rpg || {};

    savePlayer(m, {
      rpg: {
        ...updatedRpg,
        gold: updatedRpg.gold ?? rpg.gold ?? 0,
      },
    });

    const lines = [
      `◦ Hasil: *${result}*`,
      rewardGold > 0 ? `◦ Reward: *+${rewardGold} Gold*` : "",
      penaltyGold > 0 ? `◦ Denda: *-${penaltyGold} Gold*` : "",
      `◦ Saldo sekarang: *${updatedRpg.gold ?? rpg.gold ?? 0} Gold*`,
    ].filter(Boolean);

    const text =
      claraWrap("Heist", "🏦") +
      "\n\n" +
      claraWrap("HaꜱIl", lines) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "heist");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("heist", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
