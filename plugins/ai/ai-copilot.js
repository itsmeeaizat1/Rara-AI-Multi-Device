// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

const pluginConfig = {
  name: "ai-copilot",
  alias: ["ai-copilot"],
  category: "ai",
  description: "Mode copilot: lanjutkan, refactor, atau jelaskan code",
  usage: ".ai-copilot <perintah> <code> | reply code",
  example: ".ai-copilot continue function add(a,b)",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const COPILOT_PROMPTS = {
  continue: "Lanjutkan code berikut dengan konteks yang wajar dan tetap seragam dengan gaya kode tersebut.",
  refactor: "Refactor code berikut agar lebih bersih, mudah dibaca, dan tetap mempertahankan fungsi asli.",
  explain: "Jelaskan code berikut baris per baris dalam bahasa Indonesia.",
  optimize: "Optimalkan code berikut untuk performa dan readability.",
  test: "Buatkan unit test untuk code berikut jika memungkinkan.",
  fix: "Perbaiki potensi bug atau masalah dalam code berikut tanpa mengubah maksudnya.",
  comment: "Tambahkan komentar yang jelas pada code berikut.",
  convert: "Ubah code berikut ke bahasa pemrograman lain yang diminta, jaga agar perilakunya sama.",
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const raw = m.text?.trim() || "";
    const parts = raw.split(/[ \t]+/).filter(Boolean);
    const mode = (parts[1] || "").toLowerCase();
    const promptText = parts.slice(2).join(" ").trim();
    const code = m.quoted?.text ? m.quoted.text : promptText;

    if (!code) {
      const modes = Object.keys(COPILOT_PROMPTS).join(", ");
      const text =
        novaCaption({
  emoji: "🤖",
  name: "ai-copilot",
  description: "Mode copilot: lanjutkan, refactor, atau jelaskan code",
  usage: `${prefix}ai-copilot <perintah> <code> | reply code`,
  example: `${prefix}ai-copilot continue function add(a,b)`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "ai-copilot");
      return { handled: true };
    }

    const selectedMode = COPILOT_PROMPTS[mode] ? mode : "continue";
    const systemPrompt = COPILOT_PROMPTS[selectedMode];
    m.react("🕒");
    const reply = await callAI({
      providerKey: "openai",
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: code },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text = claraWrap("AI Copilot",
      `Mode: *${selectedMode}*\n` +
      `Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`
    );

    await m.reply(text);
    m.react("🐣");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text = claraWrap("Gagal",
      `Status: *ɢᴀɢᴀʟ*\n` +
      `Alasan: *${error.message}*`,
      "error"
    );

    await m.reply(text, "ai-copilot");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
