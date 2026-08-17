// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getAssetBuffer } from "../../src/lib/nova-asset-manager.js";
import config from "../../config.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "sc",
  alias: ["script"],
  category: "main",
  description: "Link script bot wa terbaru",
  usage: ".sc",
  example: ".sc",
  isPremium: false,
  isOwner: false,
  isBanned: false,
  isAdmin: false,
  cooldown: 10,
  energi: 0,
  isBotAdmin: false,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const botName = config.bot?.name || "Nova-AI";

  const caption = `╔┈┈「 *Script Bot* 」
╎
╎❏ *Bot:* ${botName}
╎❏ *User:* ${m.pushName}
╚┈┈┈┈┈┈┈┈┈❖

> Untuk asli dari bot ini, kamu bisa
> dapatkan melalui link di bawah.
> Cari kata kunci *NOVA MD*`;

  return await sock.sendMessage(m.chat, {
    image: getAssetBuffer("nova"),
    caption: caption,
    footer: `Link ini mengarahkan kamu ke Youtube Nova AI`,
    interactiveButtons: [
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "Kunjungi Youtube Nova AI",
          url: "https://youtube.com/@JanpiwWok",
          merchant_url: "https://youtube.com/@JanpiwWok",
        }),
      },
    ],
  }, { quoted: m });
}

export { pluginConfig as config, handler };
