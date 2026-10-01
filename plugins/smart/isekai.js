// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap, raraError } from "../../src/lib/rara-menu-style.js";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";

const pluginConfig = {
  name: "isekai",
  alias: ["isekai"],
  category: "smart",
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
  const story = await generateIsekai(names);

  if (!story) {
    return m.reply(raraError("Isekai Story", "gagal bikin ceritanya, coba lagi ya kak..."), "isekai");
  }

  const lines = [`Karakter: ${names.join(", ")}`, "", ...String(story || "").split("\n"), "", "♡ Dibuat oleh Rara AI ♡"];
  return m.reply(raraWrap("Isekai Story", lines, "info"), "isekai");
}

export { pluginConfig as config, handler };
