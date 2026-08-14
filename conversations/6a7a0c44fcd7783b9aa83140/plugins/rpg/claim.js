import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { alyaHeader,
    separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "claim",
  alias: ["claim", "bounty", "hadiah"],
  category: "economy",
  description: "Klaim hadiah atau bounty",
  usage: ".claim",
  example: ".claim",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 3600,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig, db }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    const bounties = [
      { title: "Kalahkan 10 Slime", reward: "500 Gold + 100 Exp", claimed: false },
      { title: "Kumpulkan 5 Iron", reward: "300 Gold + 50 Exp", claimed: false },
      { title: "Serang Boss", reward: "1000 Gold + 200 Exp", claimed: true },
    ];

    const available = bounties.filter((b) => !b.claimed);

    if (available.length === 0) {
      const text =
        claraWrap("Claim", ["◦ Tidak ada bounty tersedia saat ini.",
          "◦ Saran: *Selesaikan quest untuk unlock bounty*"].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "claim");
      return { handled: true };
    }

    const text =
      claraWrap("Bounty", "🏆") +
      "\n\n" +
      claraWrap("ᴛᴇʀꜱᴇᴅɪᴀ", available.map((b) => `◦ ${b.title} - *${b.reward}*`)) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "claim");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("claim", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
