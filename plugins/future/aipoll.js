// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader, separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "aipoll", alias: ["aivote", "smartpoll"], category: "future",
  alias: ["aipoll"],
  description: "AI bikin polling dari topik", usage: ".aipoll <topik>",
  example: ".aipoll makan malam apa", isOwner: false, isPremium: true,
  isGroup: true, isPrivate: false, cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const topic = m.text?.trim();
    if (!topic) {
      await m.reply(claraWrap("AI Poll", [`│ ❏ Penggunaan: *${prefix}aipoll <topik>*`,
        `│ ❏ Contoh: *${prefix}aipoll makan malam apa*`].join("\n")));
      return { handled: true };
    }
    const prompt = `Buat polling dengan topik "${topic}". Berikan 4 pilihan singkat (maks 20 karakter per pilihan). Format: pilihan1|pilihan2|pilihan3|pilihan4. Hanya jawaban dalam format itu.`;
    const result = await callAI(prompt);
    const choices = result.split("|").map(s => s.trim()).filter(Boolean).slice(0, 4);
    if (choices.length < 2) throw new Error("Gagal membuat polling");
    const pollMsg = claraHeader("AI Poll: " + topic, "📊") + "\n\n";
    let text = pollMsg;
    choices.forEach((c, i) => { text += `${["1️⃣","2️⃣","3️⃣","4️⃣"][i]} ${c}\n`; });
    text += "\n" + separator("━", 22) + "\n" + tipText("Ketik nomor pilihanmu!");
    await m.reply(text);
    if (!global.aiPolls) global.aiPolls = {};
    global.aiPolls[m.key.remoteJid] = { topic, choices, votes: {} };
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };