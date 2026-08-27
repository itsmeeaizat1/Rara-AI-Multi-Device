// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/nova-error.js";
import novaApi from "../../src/lib/nova-apimanager.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "sendngl",
  alias: ["sendngl"],
  category: "tools",
  description: "Send NGL",
  usage: ".sendngl <url> | <text>",
  example: ".sendngl https://ngl.link/xxxx | hai",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.text?.split("|");
  const [link, kata] = text;
  if (!link)
    return m.reply( `*LINK NGL NYA MANA ??*\n💡 *Contoh:* \`${m?.prefix}sendngl https://ngl.link/xxxx | hai`, "sendngl");
  if (!kata)
    return m.reply( `*KATA KATA NYA MANA ??*\n\n💡 *Contoh:* \`${m?.prefix}sendngl https://ngl.link/xxxx | hai`, "sendngl");
  m.react("🕒");

  try {
    await novaApi.cuki.sendNgl(
      {
        link,
        text: kata,
      },
      {
        timeout: 30000,
      },
    );

    m.react("🐣");

    await sock.sendMessage(
      m.chat,
      {
        text: `✅ *ᴅᴏɴᴇ*\n\nBerhasil mengirim pesan!\nTarget: ${link}\nPesan: ${kata}`,
      },
      { quoted: m },
    );
  } catch (error) {
    m.reply(claraWrap("sendngl", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
