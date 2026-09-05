// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const MODES = {
  mild: "Roasting ringan, santai, masih sopan dan bisa diterima semua orang.",
  savage: "Roasting pedas, langsung ke inti, bikin kena mental tapi lucu.",
  nuclear: "Roasting level dewa, gak ada ampun, bikin nangis sekaligus ngakak.",
};

const pluginConfig = {
  name: "roastme",
  alias: ["roastme"],
  category: "fun",
  description: "AI roasting diri sendiri atau orang lain",
  usage: ".roastme [mild/savage/nuclear] (opsional reply target)",
  example: ".roastme savage",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig, text: args }) {
  const prefix = botConfig?.command?.prefix || ".";

  let mode = "savage";
  if (args) {
    const lower = args.toLowerCase().trim();
    if (lower.includes("mild")) mode = "mild";
    else if (lower.includes("savage")) mode = "savage";
    else if (lower.includes("nuclear") || lower.includes("nuklir")) mode = "nuclear";
  }

  let targetName = m.pushName || "kamu";
  if (m.quoted) {
    targetName = m.quoted.pushName || m.quoted.sender?.split("@")[0] || "dia";
  }

  if (!args && !m.quoted) {
    const help = claraWrap("RoastMe", [
      `AI roasting pedas tapi lucu`,
      ``,
      `📌 Format:`,
      `  ${prefix}roastme [mode]`,
      `  Reply orang: ${prefix}roastme savage`,
      ``,
      `Mode:`,
      `  1. mild (santai)`,
      `  2. savage (pedas)`,
      `  3. nuclear (gak ada ampun)`,
      ``,
      `Reply pesan seseorang buat roast dia`,
    ].join("\n"));
    return m.reply(help);
  }
  try {
    await m.react("🕒");
    const prompt = `Kamu adalah master roaster Indonesia. Roast seseorang bernama "${targetName}" dengan mode ${mode}: ${MODES[mode]}. Buat roasting lucu, kreatif, pakai bahasa Indonesia santai. Maksimal 4 paragraf pendek. JANGAN pakai kata-kata SARA, jangan terlalu toxic, tetap dalam batas lucu. Format plain text, bukan markdown.`;

    const result = await UnlimitedAI(prompt, "nova-ai");

    if (!result || result.trim().length < 10) {
      await m.reply(novaError("RoastMe", "Gagal roast nih, AI lagi mood jelek"));
      return { handled: true };
    }

    let header = `RoastMe - Mode: ${mode.toUpperCase()}`;
    if (m.quoted) header += ` - Target: ${targetName}`;

    await m.react("🐣");
    await m.reply(claraWrap(header, result.trim()));
  } catch (error) {
    await m.react("❌");
    console.error("roastme error:", error);
    m.reply(novaError("RoastMe", `Gagal nih: ${error.message || "error"}`));
  }

  return { handled: true };
}

export { pluginConfig as config, handler };
