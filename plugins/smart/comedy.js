// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap, raraError } from "../../src/lib/rara-menu-style.js";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";

const pluginConfig = {
  name: "komedi",
  alias: ["komedi"],
  category: "smart",
  description: "AI Comedy generator - bikin cerita komedi absurd tentang member grup",
  usage: ".komedi @user1 @user2",
  example: ".komedi @andi @budi",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
  energi: 2,
  isEnabled: true,
};

async function generateKomedi(names) {
  try {
    const prompt =
      "Buat cerita komedi pendek (10-15 kalimat) dalam bahasa Indonesia.\n" +
      "Karakter utama: " + names.join(", ") + "\n" +
      "Genre: komedi absurd yang bikin ngakak\n" +
      "Setting: grup WhatsApp yang dijadikan cerita.\n" +
      "Aturan:\n" +
      "- Bikin lucu dan absurd\n" +
      "- Setiap karakter harus bicara minimal 1x\n" +
      "- Ada situasi konyol/misunderstanding\n" +
      "- Ending yang lucu/twist komedi\n" +
      "- Gunakan nama panggilan/first name\n" +
      "- Jangan pakai kata-kata kasar\n" +
      "- Format: paragraf pendek, dialog pakai tanda kutip";
    const result = await UnlimitedAI(prompt, "rara-ai");
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
  const story = await generateKomedi(names);

  if (!story) {
    return m.reply(raraError("Comedy Story", "gagal bikin ceritanya, coba lagi ya kak..."), "komedi");
  }

  const lines = [`Karakter: ${names.join(", ")}`, "", ...String(story || "").split("\n"), "", "♡ Dibuat oleh Rara AI ♡"];
  return m.reply(raraWrap("Comedy Story", lines, "info"), "komedi");
}

export { pluginConfig as config, handler };
