// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "tebakbakat",
  alias: ["tebakbakat", "bakat"],
  category: "fun",
  description: "AI tebak bakat tersembunyi yang lucu dan absurd",
  usage: ".tebakbakat <nama> [tanggal lahir]",
  example: ".tebakbakat Budi 17-08-2000",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 12,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig, text: args }) {
  const prefix = botConfig?.command?.prefix || ".";

  let name = args;
  if (!name && m.quoted) {
    name = m.quoted.pushName || m.quoted.sender?.split("@")[0];
  }
  if (!name) name = m.pushName || "kamu";

  if (!args && !m.quoted) {
    const help = claraWrap("TebakBakat", [
      `  ┊  ➶ AI tebak bakat tersembunyi lucu`,
      ``,
      `  ┊  ➶ *Cara pakai:*`,
      `  ${prefix}tebakbakat <nama> [tgl lahir]`,
      `  ${prefix}tebakbakat Budi 17-08-2000`,
      `  Reply orang: ${prefix}tebakbakat`,
      ``,
      `  ┊  ➶ Hasil: bakat tersembunyi + career prediction`,
      `  ┊  ➶ Lucu, random, jangan dipercaya serious :v`,
    ].join("\n"));
    return sendReplyWithNav(sock, m, help, "tebakbakat");
  }

  await m.react("🕐");

  try {
    const prompt = `Kamu adalah paranormal komedian Indonesia. Seseorang bernama "${name}" minta ditebak bakat tersembunyinya. Buat tebakan bakat yang LUCU, ABSURD, dan TIDAK MASUK AKAL tapi menghibur.

Format WAJIB (plain text, JANGAN markdown):

BAKAT UTAMA: [bakat absurd lucu, contoh: "Bakat tidur sambil ngoding", "Bakat memes indomie pas banget"]
LEVEL: [S / A / B / C / D]
SKILL TREE:
1. [skill 1 lucu]
2. [skill 2 lucu]
3. [skill 3 lucu]
CAREER PREDICTION: [profesi absurd lucu, contoh: "CEO startup jualan kerupuk digital"]
WEAKNESS: [kelemahan lucu]
DESTINY: [ramalan masa depan absurd 1-2 kalimat]

Aturan:
- Bahasa Indonesia santai
- JANGAN pakai markdown
- Bikin lucu tapi gak nyakitin
- Maksimal 10 baris total`;

    const result = await UnlimitedAI(prompt, "nova-ai");

    if (!result || result.trim().length < 10) {
      await m.reply(claraWrap("TebakBakat", "AI lagi baca aura, coba lagi ya."));
      return { handled: true };
    }

    await m.reply(claraWrap(`TebakBakat - ${name}`, result.trim()));
    await m.react("✅");
  } catch (error) {
    console.error("tebakbakat error:", error);
    m.reply(claraWrap("TebakBakat", `Gagal: ${error.message || "error"}`));
  }

  return { handled: true };
}

export { pluginConfig as config, handler };
