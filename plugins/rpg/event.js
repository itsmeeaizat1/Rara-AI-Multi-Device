// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import {   separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "event",
  alias: ["event", "events", "acara", "eventrank"],
  category: "game",
  description: "Lihat event RPG yang sedang berlangsung",
  usage: ".event",
  example: ".event",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig, db }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    // Placeholder: ganti dengan data event RPG kamu
    const active = [
      { title: "Weekend Mythic", reward: "Mythic Scroll", end: "2 days" },
      { title: "Gold Rush", reward: "2x Gold", end: "5 hours" },
    ];

    const ended = [
      { title: "Double EXP", reward: "2x EXP", status: "Ended" },
    ];

    const text =
      claraWrap("Event", [`◦ Active: *${active.length} event*`,
        "◦ Next Reset: *Senin 00:00*"].join("\n")) +
      "\n\n" +
      claraWrap("Daftar Event", active.map((e) => `◦ ${e.title} - ${e.reward} (${e.end})`)) +
      "\n\n" +
      claraWrap("Ended", ended.map((e) => `◦ ${e.title} - ${e.status}`)) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "event");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("event", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
