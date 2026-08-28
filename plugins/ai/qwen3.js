// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { Qwen3 } from "../../src/scraper/qwen3.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import te from "../../src/lib/nova-error.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "qwen3",
  alias: ["qwen3"],
  category: "ai",
  description: "Chat dengan Qwen3 80B via OverChat",
  usage: ".qwen3 <pertanyaan>",
  example: ".qwen3 Apa itu machine learning?",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ");
  if (!text) {
    return m.reply( `🔵 *Qwen3 80B*\n\n` +
        `Tanya apa aja ke AI Qwen3 — model besar dari Alibaba yang jago bahasa apa aja.\n\n` +
        `*ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*\n` +
        `*${m.prefix}qwen3 <pertanyaan>*\n\n` +
        `*ᴄᴏɴᴛᴏʜ:*\n` +
        `*${m.prefix}qwen3 Apa itu machine learning?*\n` +
        `*${m.prefix}qwen3 Buat resep masakan Indonesia*\n\n` +
        `_Model 80B, jadi agak lama tapi jawabannya mantap_`, "qwen3");
  }

  await m.react("🕒");

  try {
    const result = await Qwen3(text);

    if (!result.status) {
      return m.reply(claraWrap("Qwen3 Gagal", `❌ *Qwen3 Gagal*\n\n${result.error || "Gagal dapet respons nih"}`));
    }

    await m.react("🐣");

    const reply = `${result.answer}`;
    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply);
  } catch (e) {
    console.error(e);
    m.reply(novaError("Qwen3", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
