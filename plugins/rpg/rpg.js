// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { ensurePlayer } from "../../src/lib/nova-rpg-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "rpg",
  alias: ["rpg", "rpgstart", "startplay"],
  category: "game",
  description: "Mulai petualangan RPG kamu",
  usage: ".rpg",
  example: ".rpg",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const userName = m.pushName || "Player";

    const player = ensurePlayer(m, userName);

    const text =
      claraWrap("Karakter", [`╎❏ Nama: *${player.name}*`,
        `╎❏ Level: *${player.level || 1}*`,
        `╎❏ HP: *${player.hp || 100}/${player.maxHp || 100}*`,
        `╎❏ ATK: *${player.atk || 10}*`,
        `╎❏ DEF: *${player.def || 5}*`,
        `╎❏ Exp: *${player.exp || 0}/${player.maxExp || 100}*`,
        `╎❏ Gold: *${player.gold || 0}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}profile untuk melihat profil kamu`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "rpg");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`╎❏ Status: *Gagal*`,
        `╎❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("rpg", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
