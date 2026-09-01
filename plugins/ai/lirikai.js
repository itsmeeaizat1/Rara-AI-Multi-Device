// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// lirikai — AI generator lirik lagu
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "lirikai",
  alias: ["lirikai", "ailirik", "songai"],
  category: "ai",
  description: "AI buat lirik lagu dari tema yang kamu kasih",
  usage: ".lirikai <tema lagu>",
  example: ".lirikai cinta tak terbalas\n.lirikai perpisahan dengan sahabat",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) {
      return m.reply(claraWrap("lirikai", `Mau bikin lirik lagu tentang apa?\n\nContoh: ${m.prefix}lirikai cinta tak terbalas\n${m.prefix}lirikai perpisahan sahabat`, "guide"));
    }

    await m.react("🕒");

    const prompt = `Buatkan lirik lagu tentang: "${text}"

Format:
JUDUL: [judul lagu yang menarik]
GENRE: [genre yang cocok]

[Verse 1]
...

[Pre-Chorus]
...

[Chorus]
...

[Verse 2]
...

[Bridge]
...

[Outro]
...

Lirik harus puitis, catchy, dan punya rima. Bahasa Indonesia, maksimal 3 verse + 1 chorus + 1 bridge.`;

    const result = await UnlimitedAI(prompt, "nova-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("lirikai", "AI-nya lagi nggak inspiratif nih 🎵", "error"));
    }

    await m.react("🐣");
    let msg = `╭─「 *ʟɪʀɪᴋ ʟᴀɢᴜ* 」\n`;
    msg += `│ 🎵 Tema: *${text}*\n`;
    msg += `│\n`;
    msg += `│ ${result.answer.trim().replace(/\n/g, "\n│ ")}\n`;
    msg += `╰──────────`;
    return m.reply(msg);
  } catch (err) {
    console.error("lirikai error:", err);
    await m.react("❌");
    return m.reply(claraWrap("lirikai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
