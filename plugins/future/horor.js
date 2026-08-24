// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";

const pluginConfig = {
  name: "horor",
  alias: ["horrorstory", "ceritahoror", "ceritaseram"],
  category: "future",
  description: "AI Horror generator - bikin cerita horor pendek tentang member grup",
  usage: ".horor @user1 @user2",
  example: ".horor @andi @budi",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
  energi: 2,
  isEnabled: true,
};

async function generateHoror(names) {
  try {
    const prompt =
      "Buat cerita horor pendek (10-15 kalimat) dalam bahasa Indonesia.\n" +
      "Karakter utama: " + names.join(", ") + "\n" +
      "Genre: horor tapi tidak terlalu menyeramkan, lebih ke suspense/thriller\n" +
      "Setting: grup WhatsApp yang dijadikan cerita.\n" +
      "Aturan:\n" +
      "- Bikin menegangkan dan suspenful\n" +
      "- Setiap karakter harus bicara minimal 1x\n" +
      "- Ada misteri yang terungkap perlahan\n" +
      "- Ending yang bikin merinding\n" +
      "- Gunakan nama panggilan/first name\n" +
      "- Jangan pakai kata-kata kasar\n" +
      "- Jangan terlalu gore/violent\n" +
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
  const story = await generateHoror(names);

  if (!story) {
    return m.reply( "❌ Gagal generate cerita horor. Coba lagi nanti.", "horor");
  }

  const header = "👻 *ʜᴏʀʀᴏʀ ꜱᴛᴏʀʏ*\n\nKarakter: " + names.join(", ") + "\n\n";
  const footer = "\n\n_Dibuat oleh Nova AI_";

  await m.react("🐣");
  return m.reply( header + story + footer, "horor");
}

export { pluginConfig as config, handler };
