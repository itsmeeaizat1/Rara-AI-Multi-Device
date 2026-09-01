// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "tocode",
  alias: ["tocode"],
  aliases: ["tocode", "tocopy", "copycode"],
  category: "convert",
  description: "Convert quoted message menjadi plugin code yang bisa langsung dipakai",
  usage: ".tocode <nama> (reply message)",
  example: ".tocode yaya",
  isOwner: true, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock, text }) {
  try {
    if (!text && !m.quoted) return m.reply(claraWrap("tocode", `Reply something, then enter the file name.\n\nContoh: .${m.command} yaya`, "guide"));
    if (!m.quoted) return m.reply(claraWrap("tocode", "Reply pesan yang mau dijadikan plugin code.", "guide"));

    await m.react("🕒");

    const quotedType = m.quoted.mtype || "";
    const penis = JSON.stringify({ [quotedType]: m.quoted.message?.[quotedType] || m.quoted }, null, 2);

    let result;
    if (quotedType === "liveLocationMessage") {
      result = `
export default async function handler(m, { sock, prefix, reply }) {
  sock.relayMessage(m.chat, {
    viewOnceMessage: {
      message: ${penis}
    }
  }, {})
}

`;
    } else {
      result = `
export default async function handler(m, { sock, prefix, reply }) {
  sock.relayMessage(m.chat, {
    viewOnceMessage: {
      message: ${penis}
    }
  }, {})
}

`;
    }

    await m.react("🐣");
    m.reply("✅ Berikut hasil code:\n\n```js\n" + result + "\n```");
  } catch (e) {
    console.error("tocode error:", e.message);
    await m.react("❌");
    m.reply(claraWrap("tocode", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
