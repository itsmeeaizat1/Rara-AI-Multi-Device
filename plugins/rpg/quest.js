// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { claraHeader,
    separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "quest",
  alias: ["quest", "misi", "mission", "task"],
  category: "game",
  description: "Ambil dan selesaikan quest RPG",
  usage: ".quest",
  example: ".quest",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig, db }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    const quests = [
      { title: "Kalahkan 5 monster", reward: "200 Gold + 50 Exp", progress: "3/5" },
      { title: "Kumpulkan 10 batu", reward: "100 Gold + 30 Exp", progress: "7/10" },
      { title: "Serang boss", reward: "500 Gold + 100 Exp", progress: "0/1" },
    ];

    const text =
      claraWrap("Quest", "📜") +
      "\n\n" +
      claraWrap("MiꜱI", quests.map((q) => `◦ ${q.title}\n  Reward: *${q.reward}*\n  Progress: *${q.progress}*`)) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "quest");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("quest", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
