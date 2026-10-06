// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/rara-error.js";
import raraApi from "../../src/lib/rara-apimanager.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
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
    return m.reply( raraWrap("sendngl", `*LINK NGL NYA MANA ??*\n💡 *Contoh:* \`${m?.prefix}sendngl https://ngl.link/xxxx | hai`, "guide"), "sendngl");
  if (!kata)
    return m.reply( raraWrap("sendngl", `*KATA KATA NYA MANA ??*\n\n💡 *Contoh:* \`${m?.prefix}sendngl https://ngl.link/xxxx | hai`, "guide"), "sendngl");
  try {
    await m.react("🕒");
    await raraApi.cuki.sendNgl(
      {
        link,
        text: kata,
      },
      {
        timeout: 30000,
      },
    );
    await m.react("🐣");
    await sock.sendMessage(
      m.chat,
      {
        text: `✅ *done*\n\nBerhasil mengirim pesan!\nTarget: ${link}\nPesan: ${kata}`,
      },
      { quoted: m },
    );
  } catch (error) {
    await m.react("❌");
    m.reply(raraWrap("sendngl", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
