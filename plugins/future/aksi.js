// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";

const pluginConfig = {
  name: "aksi",
  alias: ["aksistory", "ceritaaksi", "actionstory"],
  category: "future",
  description: "AI Action generator - bikin cerita aksi ala film laga tentang member grup",
  usage: ".aksi @user1 @user2",
  example: ".aksi @andi @budi",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
  energi: 2,
  isEnabled: true,
};

async function generateAksi(names) {
  try {
    const prompt =
      "Buat cerita aksi pendek (10-15 kalimat) dalam bahasa Indonesia.\n" +
      "Karakter utama: " + names.join(", ") + "\n" +
      "Genre: aksi ala film laga yang keren dan epic\n" +
      "Setting: grup WhatsApp yang dijadikan cerita.\n" +
      "Aturan:\n" +
      "- Bikin keren dan epic\n" +
      "- Setiap karakter dapat peran (hero, sidekick, villain)\n" +
      "- Ada adegan aksi/kejar-kejar\n" +
      "- Ending yang memuaskan\n" +
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

  await m.react("🕒");
  const story = await generateAksi(names);

  if (!story) {
    return m.reply( "❌ Gagal generate cerita aksi. Coba lagi nanti.", "aksi");
  }

  const header = "🔥 *ACTION STORY*\n\nKarakter: " + names.join(", ") + "\n\n";
  const footer = "\n\n_Dibuat oleh Nova AI_";

  await m.react("✅");
  return m.reply( header + story + footer, "aksi");
}

export { pluginConfig as config, handler };
