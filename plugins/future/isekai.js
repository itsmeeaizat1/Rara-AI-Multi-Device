// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";

const pluginConfig = {
  name: "isekai",
  alias: ["isekai"],
  category: "future",
  description: "AI Isekai generator - cerita terlempar ke dunia lain ala anime",
  usage: ".isekai @user1 @user2",
  example: ".isekai @andi @budi",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
  energi: 2,
  isEnabled: true,
};

async function generateIsekai(names) {
  try {
    const prompt =
      "Buat cerita isekai pendek (10-15 kalimat) dalam bahasa Indonesia.\n" +
      "Karakter utama: " + names.join(", ") + "\n" +
      "Genre: isekai (terlempar ke dunia lain) ala anime\n" +
      "Setting: grup WhatsApp yang tiba-tiba terlempar ke dunia fantasy.\n" +
      "Aturan:\n" +
      "- Bikin seru dan epic ala anime\n" +
      "- Setiap karakter dapat skill/class berbeda (mage, warrior, healer, dll)\n" +
      "- Ada monster atau tantangan yang harus dihadapi\n" +
      "- Ending yang bikin penasaran (cliffhanger ok)\n" +
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
  const story = await generateIsekai(names);

  if (!story) {
    return m.reply("❌ Yah, gagal bikin ceritanya nih 😵\nCoba lagi yuk!", "isekai");
  }

  const header = "⚔️ *Isekai Story*\n\nKarakter: " + names.join(", ") + "\n\n";
  const footer = "\n\n✨ Dibuat oleh Nova AI";
  return m.reply( header + story + footer, "isekai");
}

export { pluginConfig as config, handler };
