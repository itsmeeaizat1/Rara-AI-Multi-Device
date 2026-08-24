// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { DeepSeekThinking } from "../../src/scraper/deepseek.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "deepseek",
  alias: ["ds", "dsv4", "deepthink"],
  category: "ai",
  description: "Chat dengan DeepSeek V4 (thinking/reasoning)",
  usage: ".deepseek <pertanyaan>",
  example: ".deepseek Jelaskan black hole",
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
    return m.reply(claraWrap("DeepSeek V4", `🧠 *DeepSeek V4*\n\n` +
        `AI yang bisa mikir dulu sebelum jawab — cocok buat pertanyaan yang butuh penalaran.\n\n` +
        `*ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*\n` +
        `*${m.prefix}deepseek <pertanyaan>*\n\n` +
        `*ᴄᴏɴᴛᴏʜ:*\n` +
        `*${m.prefix}deepseek Jelaskan black hole*\n` +
        `*${m.prefix}deepseek Buat kode sorting algorithm*\n\n` +
        `_Bot akan mikir dulu, baru jawab — jadi agak lama sedikit_`));
  }

  await m.react("🕒");

  try {
    const result = await DeepSeekThinking(text);

    if (!result.success) {
      return m.reply(claraWrap("DeepSeek Gagal", `❌ *ᴅᴇᴇᴘꜱᴇᴇᴋ ɢᴀɢᴀʟ*\n\nGagal mendapatkan respons`));
    }

    await m.react("🐣");

    let reply = ``;

    if (result.reasoning) {
      const reasoningPreview =
        result.reasoning.length > 800
          ? result.reasoning.slice(0, 800) + "..."
          : result.reasoning;
      reply += `💭 *ᴘʀᴏꜱᴇꜱ ʙᴇʀᴘɪᴋɪʀ:*\n${reasoningPreview.replace(/\n/g, "\n")}\n\n`;
    }

    if (result.answer) {
      reply += `${result.answer}`;
    }

    if (reply.length > 4096) {
      reply = reply.slice(0, 4096) + "\n\n... (dipotong)";
    }

    await m.reply(reply);
  } catch (e) {
    console.error(e);
    m.reply(claraWrap("deepseek", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
