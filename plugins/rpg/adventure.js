// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addExp, addGold, savePlayer } from "../../src/lib/nova-rpg-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "adventure",
  alias: ["adv", "petualangan", "adventure"],
  category: "game",
  description: "Ikuti petualangan untuk dapat EXP dan Gold",
  usage: ".adventure",
  example: ".adventure",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
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
    let rewardExp = Math.floor(Math.random() * 30) + 10;
    let rewardGold = Math.floor(Math.random() * 40) + 10;
    let result = "Berhasil menjelajahi hutan.";
    let damage = 0;

    if (roll < 0.2) {
      damage = Math.floor(Math.random() * 15) + 5;
      rewardExp = Math.floor(rewardExp * 0.5);
      rewardGold = Math.floor(rewardGold * 0.5);
      result = `Kamu bertemu monster dan menerima *${damage}* damage.`;
    } else if (roll < 0.4) {
      rewardGold += 25;
      rewardExp += 15;
      result = "Kamu menemukan peti harta karun tua.";
    }

    addExp(m, rewardExp);
    addGold(m, rewardGold);

    const updated = getPlayer(m);
    const updatedRpg = updated?.rpg || {};
    const currentHp = Math.max((updatedRpg.hp || 100) - damage, 0);
    const maxHp = updatedRpg.maxHp || 100;

    if (damage > 0) {
      savePlayer(m, {
        rpg: {
          ...updatedRpg,
          hp: currentHp,
          maxHp: maxHp,
        },
      });
    }

    const status =
      damage > 0
        ? `  ┊  ➶ HP sekarang: *${currentHp}/${maxHp}*`
        : `  ┊  ➶ HP sekarang: *${currentHp}/${maxHp}*`;

    const text =
      claraWrap("Adventure", [`  ┊  ➶ Kisah: *${result}*`,
        `  ┊  ➶ EXP: *+${rewardExp}*`,
        `  ┊  ➶ Gold: *+${rewardGold}*`,
        status].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}adventure untuk lanjut petualangan`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "adventure");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("adventure", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
