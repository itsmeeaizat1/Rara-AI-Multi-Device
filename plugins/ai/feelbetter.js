// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { FeelBetter } from "../../src/scraper/feeb.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "feelbetter",
  alias: ["feelbetter"],
  category: "ai",
  description: "Chat dengan FeelBetterBot — AI yang siap mendengarkan tanpa menghakimi",
  usage: ".feelbetter <curhat/pertanyaan>",
  example: ".feelbetter lagi sedih nih",
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
    return m.reply( `💚 *ꜰᴇᴇʟʙᴇᴛᴛᴇʀʙᴏᴛ*\n\n` +
        `AI yang siap mendengarkan curhatan kamu — tanpa menghakimi, dengan hangat dan empatik.\n\n` +
        `*ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*\n` +
        `*${m.prefix}feelbetter <curhatan>*\n\n` +
        `*ᴄᴏɴᴛᴏʜ:*\n` +
        `*${m.prefix}feelbetter lagi sedih nih*\n` +
        `*${m.prefix}feelbetter aku capek banget belakangan*\n\n` +
        `_Bot ini bukan pengganti profesional, tapi bisa jadi tempat curhat yang aman_`, "feelbetter");
  }

  await m.react("🕒");

  try {
    const result = await FeelBetter(text);

    if (!result.status) {
      return m.reply(claraWrap("FeelBetter Gagal", `❌ *ꜰᴇᴇʟʙᴇᴛᴛᴇʀ ɢᴀɢᴀʟ*\n\n${result.error || "Gagal mendapatkan respons"}`));
    }

    await m.react("🐣");

    const reply = `${result.answer}`;
    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply);
  } catch (e) {
    console.error(e);
    m.reply(claraWrap("feelbetter", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
