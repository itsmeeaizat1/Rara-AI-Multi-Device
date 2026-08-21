// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {   separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addExp, addGold, savePlayer } from "../../src/lib/nova-rpg-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "battle",
  alias: ["fight", "duel", "lawan", "battle"],
  category: "game",
  description: "Bertarung dengan monster untuk dapat hadiah",
  usage: ".battle",
  example: ".battle",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 60,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const userName = m.pushName || "Player";
    const player = ensurePlayer(m, userName);
    const rpg = player?.rpg || {};

    const playerAtk = rpg?.atk || 10;
    const monsterHp = Math.floor(Math.random() * 80) + 60;
    const monsterAtk = Math.floor(Math.random() * 12) + 4;

    let playerHp = rpg?.hp || 100;
    let monsterCurrent = monsterHp;

    const log = [];
    let turn = 1;
    while (playerHp > 0 && monsterCurrent > 0 && turn <= 20) {
      const pDmg = Math.max(playerAtk + Math.floor(Math.random() * 6) - 2, 1);
      const mDmg = Math.max(monsterAtk + Math.floor(Math.random() * 6) - 2, 0);
      monsterCurrent -= pDmg;
      playerHp -= mDmg;
      log.push(
        `Turn ${turn}: Kamu *-${pDmg}*, Monster *-${mDmg}*`
      );
      turn += 1;
    }

    const win = monsterCurrent <= 0 && playerHp > 0;
    const rewardExp = win ? Math.floor(Math.random() * 50) + 40 : Math.floor(Math.random() * 15) + 5;
    const rewardGold = win ? Math.floor(Math.random() * 80) + 40 : Math.floor(Math.random() * 20) + 5;

    addExp(m, rewardExp);
    addGold(m, win ? rewardGold : rewardGold);

    const updated = getPlayer(m);
    const updatedRpg = updated?.rpg || {};
    const maxHp = updatedRpg.maxHp || 100;
    const finalHp = Math.max(playerHp, 0);

    savePlayer(m, {
      rpg: {
        ...updatedRpg,
        hp: finalHp,
        maxHp: maxHp,
        wins: (updatedRpg.wins || 0) + (win ? 1 : 0),
        losses: (updatedRpg.losses || 0) + (win ? 0 : 1),
      },
    });

    const statusLine = win
      ? "╎❏ Status: *Kamu menang!*"
      : "╎❏ Status: *Kamu kalah...*";

    const text =
      claraWrap("Battle", [statusLine,
        `╎❏ EXP: *+${rewardExp}*`,
        `╎❏ Gold: *+${rewardGold}*`,
        `╎❏ HP sekarang: *${finalHp}/${maxHp}*`].join("\n")) +
      "\n\n" +
      claraWrap("Log", log.slice(-4)) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "battle");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`╎❏ Status: *Gagal*`,
        `╎❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("battle", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
