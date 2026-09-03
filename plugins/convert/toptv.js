// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/nova-error.js";
import { claraWrap, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "toptv",
  alias: ["toptv"],
  aliases: ["toptv", "ptv"],
  category: "convert",
  description: "Convert video ke format PTV (video pendek WhatsApp)",
  usage: ".toptv (reply video)",
  example: ".toptv",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const quoted = m.quoted;
    if (!quoted) return m.reply(claraWrap("toptv", "Reply video dengan caption .toptv", "guide"));

    const isVideo = quoted.type === "videoMessage" || quoted.mtype === "videoMessage";
    if (!isVideo) return m.reply(claraWrap("toptv", "Reply harus video!", "guide"));

    await m.react("🕒");

    const { generateWAMessageFromContent, proto } = await import("nova");
    const videoMsg = quoted.message?.videoMessage || quoted;

    const ptv = generateWAMessageFromContent(m.chat, proto.Message.fromObject({
      ptvMessage: videoMsg,
    }), { userJid: m.chat, quoted: m });

    await sock.relayMessage(m.chat, ptv.message, { messageId: ptv.key.id });
    await m.react("🐣");
    await m.reply(novaBerhasil("toptv"));
  } catch (e) {
    console.error("toptv error:", e.message);
    await m.react("❌");
    m.reply(novaGangguan("toptv"));
  }
}

export { pluginConfig as config, handler };
