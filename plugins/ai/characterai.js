// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// characterai — Chat dengan AI dengan persona/karakter tertentu
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const CHARACTERS = {
  "nobita": { name: "Nobita", system: "Kamu adalah Nobita dari Doraemon. Jawab dengan gaya cengeng, manja, malas, selalu minta tolong Doraemon. Bahasa Indonesia." },
  "doraemon": { name: "Doraemon", system: "Kamu adalah Doraemon, robot kucing dari abad 22. Jawab dengan ramah, suka membantu, kadang marah ke Nobita. Bahasa Indonesia." },
  "joker": { name: "Joker", system: "Kamu adalah Joker dari Batman. Jawab dengan chaos, dark humor, jenaka tapi gelap. Bahasa Indonesia." },
  "einstein": { name: "Einstein", system: "Kamu adalah Albert Einstein. Jawab dengan filosofis, suka jelasin sains dengan analogi sederhana. Bahasa Indonesia." },
  "shinchan": { name: "Shinchan", system: "Kamu adalah Shinchan. Jawab dengan lucu, nakal, kadang bikin malu. Suka bikin joke bodoh. Bahasa Indonesia." },
  "spongebob": { name: "SpongeBob", system: "Kamu adalah SpongeBob SquarePants. Jawab dengan ceria, optimis, suka bikin Krabby Patty. Bahasa Indonesia." },
  "sukuna": { name: "Sukuna", system: "Kamu adalah Ryomen Sukuna dari Jujutsu Kaisen. Jawab dengan arogan, kuat, sadis tapi kadang menghormati yang kuat. Bahasa Indonesia." },
  "goku": { name: "Goku", system: "Kamu adalah Son Goku dari Dragon Ball. Jawab dengan semangat, suka bertarung, selalu ingin lebih kuat. Bahasa Indonesia." },
  "sherlock": { name: "Sherlock Holmes", system: "Kamu adalah Sherlock Holmes. Jawab dengan analitis, observan, kadang dingin tapi jenius. Bahasa Indonesia." },
  "Iron Man": { name: "Iron Man", system: "Kamu adalah Tony Stark (Iron Man). Jawab dengan percaya diri, sarkastik, jenius tech. Bahasa Indonesia." },
};

const pluginConfig = {
  name: "characterai",
  alias: ["characterai", "charai", "cair", "roleai"],
  category: "ai",
  description: "Chat dengan AI bergaya karakter (Nobita, Doraemon, Joker, dll)",
  usage: ".characterai <nama karakter> <pesan>\n.characterai list (lihat semua karakter)",
  example: ".characterai doraemon apa itu AI?\n.characterai joker ceritakan lelucon\n.characterai goku ajak bertarung",
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
    const text = m.text?.trim() || m.args?.join(" ").trim() || "";

    // List karakter
    if (text.toLowerCase() === "list" || !text) {
      let list = "╭─「 ✦ ᴄʜᴀʀᴀᴄᴛᴇʀ ᴀɪ ✦ 」\n";
      list += "│ 🎭 Pilih karakter:\n│\n";
      const keys = Object.keys(CHARACTERS);
      for (let i = 0; i < keys.length; i++) {
        list += `│ ${i + 1}. *${keys[i]}* — ${CHARACTERS[keys[i]].name}\n`;
      }
      list += `│\n│ 💡 Contoh: ${m.prefix}characterai ${keys[0]} halo!\n`;
      list += "╰────  •  ────";
      return m.reply(list);
    }

    // Parse: <nama karakter> <pesan>
    const parts = text.split(/\s+/);
    const charName = parts[0].toLowerCase();
    const message = parts.slice(1).join(" ").trim();

    // Cari karakter (exact atau partial match)
    let charKey = null;
    for (const key of Object.keys(CHARACTERS)) {
      if (key.toLowerCase() === charName || key.toLowerCase().startsWith(charName)) {
        charKey = key;
        break;
      }
    }

    if (!charKey) {
      return m.reply(claraWrap("characterai", `Karakter "${charName}" tidak ditemukan.\nKetik ${m.prefix}characterai list untuk lihat semua karakter.`, "guide"));
    }

    if (!message) {
      return m.reply(claraWrap("characterai", `Mau ngomong apa sama ${CHARACTERS[charKey].name}?\nContoh: ${m.prefix}characterai ${charKey} halo!`, "guide"));
    }

    await m.react("🕒");

    const result = await UnlimitedAI(message, "nova-ai", {
      systemPrompt: CHARACTERS[charKey].system,
    });

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("characterai", `${CHARACTERS[charKey].name} lagi offline 😅`, "error"));
    }

    await m.react("🐣");
    let msg = `╭─「 ✦ ${CHARACTERS[charKey].name} ✦ 」\n`;
    msg += `│ 🎭 Karakter: *${CHARACTERS[charKey].name}*\n`;
    msg += `│\n`;
    msg += `│ ${result.answer.trim().replace(/\n/g, "\n│ ")}\n`;
    msg += `╰────  •  ────`;
    return m.reply(msg);
  } catch (err) {
    console.error("characterai error:", err);
    await m.react("❌");
    return m.reply(claraWrap("characterai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
