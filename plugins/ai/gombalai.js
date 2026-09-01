// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// gombalai — AI generator gombalan/pickup lines
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "gombalai",
  alias: ["gombalai", "aigombal", "pickupai"],
  category: "ai",
  description: "AI bikin gombalan/pickup lines buat gebetan",
  usage: ".gombalai <nama atau situasi>",
  example: ".gombalai untuk Sari\n.gombalai gombalan buat mantan yang masih dihati\n.gombalai lucu buat crush",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) {
      return m.reply(claraWrap("gombalai", `Mau gombal untuk siapa?\n\nContoh: ${m.prefix}gombalai untuk Sari\n${m.prefix}gombalai gombalan islami\n${m.prefix}gombalai lucu buat crush`, "guide"));
    }

    await m.react("🕒");

    const prompt = `Buatkan 5 gombalan/pickup lines untuk: "${text}"

Kategori:
1. Gombalan halus (smooth)
2. Gombalan lucu (funny)
3. Gombalan islami (sopan & religius)
4. Gombalan ngegas (cheesy)
5. Gombalan poetic (romantis)

Tiap gombalan maksimal 2-3 kalimat. Bahasa Indonesia. Buat yang original, jangan pakai gombalan pasaran. Nomori 1-5.`;

    const result = await UnlimitedAI(prompt, "nova-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("gombalai", "AI-nya lagi malu nih 😳", "error"));
    }

    await m.react("🐣");
    let msg = `╭─「 ✦ ɢᴏᴍʙᴀʟᴀɴ ɢᴇɴᴇʀᴀᴛᴏʀ ✦ 」\n`;
    msg += `│ 💕 Untuk: *${text}*\n`;
    msg += `│\n`;
    msg += `│ ${result.answer.trim().replace(/\n/g, "\n│ ")}\n`;
    msg += `│\n`;
    msg += `│ 😘 Pilih yang paling cocop, gas kirim!\n`;
    msg += `╰────  •  ────`;
    return m.reply(msg);
  } catch (err) {
    console.error("gombalai error:", err);
    await m.react("❌");
    return m.reply(claraWrap("gombalai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
