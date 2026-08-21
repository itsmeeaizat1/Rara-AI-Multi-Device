// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer } from "../../src/lib/nova-rpg-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "profile",
  alias: ["profile", "prof", "myprofile"],
  category: "game",
  description: "Lihat profil RPG kamu",
  usage: ".profile",
  example: ".profile",
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
      claraWrap("Profile", [`╎❏ Nama: *${player.name}*`,
        `╎❏ Level: *${player.level || 1}*`,
        `╎❏ Rank: *${player.rank || "E"}*`,
        `╎❏ Job: *${player.job || "Pemburu"}*`,
        `╎❏ HP: *${player.hp || 100}/${player.maxHp || 100}*`,
        `╎❏ ATK: *${player.atk || 10}*`,
        `╎❏ DEF: *${player.def || 5}*`,
        `╎❏ Exp: *${player.exp || 0}/${player.maxExp || 100}*`,
        `╎❏ Gold: *${player.gold || 0}*`,
        `╎❏ W/L: *${player.wins || 0}/${player.losses || 0}*`,
        `╎❏ Pet: *${player.pet || "Tidak ada"}*`,
        `╎❏ Partner: *${player.partner || "Tidak ada"}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "profile");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`╎❏ Status: *Gagal*`,
        `╎❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("profile", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
