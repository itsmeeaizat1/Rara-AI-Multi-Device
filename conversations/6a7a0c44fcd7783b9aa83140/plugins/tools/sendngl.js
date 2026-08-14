import te from "../../src/lib/nova-error.js";
import novaApi from "../../src/lib/nova-apimanager.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "sendngl",
  alias: [],
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
    return sendReplyWithNav(sock, m, `*LINK NGL NYA MANA ??*\nContoh: \`${m?.prefix}sendngl https://ngl.link/xxxx | hai`, "sendngl");
  if (!kata)
    return sendReplyWithNav(sock, m, `*KATA KATA NYA MANA ??*\n\nContoh: \`${m?.prefix}sendngl https://ngl.link/xxxx | hai`, "sendngl");
  m.react("🕐");

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

    m.react("✅");

    await sock.sendMessage(
      m.chat,
      {
        text: `✅ *DONE*\n\nBerhasil mengirim pesan!\nTarget: ${link}\nPesan: ${kata}`,
      },
      { quoted: m },
    );
  } catch (error) {
    m.reply(claraWrap("sendngl", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
