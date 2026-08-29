// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";

const pluginConfig = {
  name: "romantis",
  alias: ["romantis"],
  category: "future",
  description: "AI Romance generator - bikin cerita romantis pendek tentang member grup",
  usage: ".romantis @user1 @user2",
  example: ".romantis @andi @siti",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
  energi: 2,
  isEnabled: true,
};

async function generateRomantis(names) {
  try {
    const prompt =
      "Buat cerita romantis pendek (10-15 kalimat) dalam bahasa Indonesia.\n" +
      "Karakter utama: " + names.join(", ") + "\n" +
      "Genre: romantis cringe tapi manis\n" +
      "Setting: grup WhatsApp yang dijadikan cerita.\n" +
      "Aturan:\n" +
      "- Bikin manis dan bikin baper\n" +
      "- Setiap karakter harus bicara minimal 1x\n" +
      "- Ada momen cringe tapi lucu\n" +
      "- Ending yang bikin senyum\n" +
      "- Gunakan nama panggilan/first name\n" +
      "- Jangan pakai kata-kata kasar\n" +
      "- Format: paragraf pendek, dialog pakai tanda kutip";
    const result = await UnlimitedAI(prompt, "nova-ai");
    return result?.success ? result.response : null;
  } catch {
    return null;
  }
}

async function handler(m, { sock }) {
  const mentioned = m.mentionedJid?.length ? m.mentionedJid : [];
  let names = [];
  if (mentioned.length > 0) {
    names = mentioned.slice(0, 5).map((jid) => {
      const name = m.pushName || jid.split("@")[0];
      return name;
    });
  } else {
    names = [m.pushName || "Kamu"];
  }
  if (names.length < 2) names.push("Teman");
  const story = await generateRomantis(names);

  if (!story) {
    return m.reply("╭──「 Romance Story 」\n│ ❌ Yah, gagal bikin ceritanya nih 😵\n│ Coba lagi yuk!\n╰──────────", "romantis");
  }

  const header = "💕 *ʀᴏᴍᴀɴᴄᴇ ꜱᴛᴏʀʏ*\n\nKarakter: " + names.join(", ") + "\n\n";
  const footer = "\n│\n│ ✨ Dibuat oleh Nova AI\n╰──────────";
  return m.reply( header + story + footer, "romantis");
}

export { pluginConfig as config, handler };
