// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";

const pluginConfig = {
  name: "drama",
  alias: ["drama"],
  category: "smart",
  description: "AI Drama generator - bikin cerita drama pendek tentang member grup",
  usage: ".drama @user1 @user2",
  example: ".drama @andi @budi",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
  energi: 2,
  isEnabled: true,
};

async function generateDrama(names) {
  try {
    const prompt =
      "Buat cerita drama pendek (10-15 kalimat) dalam bahasa Indonesia.\n" +
      "Karakter utama: " + names.join(", ") + "\n" +
      "Genre: drama sekolah yang penuh intrik dan konflik emosi\n" +
      "Setting: grup WhatsApp yang dijadikan cerita.\n" +
      "Aturan:\n" +
      "- Bikin dramatis dan menarik\n" +
      "- Setiap karakter harus bicara minimal 1x\n" +
      "- Ada konflik dan twist di tengah\n" +
      "- Ending yang bikin penasaran atau memuaskan\n" +
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
  const story = await generateDrama(names);

  if (!story) {
    return m.reply("❌ Yah, gagal bikin ceritanya nih 😵\nCoba lagi yuk!", "drama");
  }

  const header = "🎭 *drama story*\n\nKarakter: " + names.join(", ") + "\n\n";
  const footer = "\n\n Dibuat oleh Nova AI";
  return m.reply( header + story + footer, "drama");
}

export { pluginConfig as config, handler };
