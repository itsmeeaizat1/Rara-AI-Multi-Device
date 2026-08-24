// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

const pluginConfig = {
  name: "aianalyze",
  alias: ["aianalyze", "analyze", "analisismedia", "visionai", "cekmedia"],
  category: "ai",
  description: "Analisis gambar/file dengan AI",
  usage: ".aianalyze (reply media)",
  example: ".aianalyze (reply foto)",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    const media = m.msg?.imageMessage || m.quoted?.msg?.imageMessage;
    if (!media) {
      const out =
        claraWrap("Cara Pakai", [`  ┊  ➶ Penggunaan: *${prefix}aianalyze*`,
          `  ┊  ➶ Reply media gambar/video, lalu ketik *${prefix}aianalyze*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(out);
      return { handled: true };
    }

    const buffer = await sock.downloadMediaMessage(m.quoted || m);
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;

    const aiConfig = botConfig.aiHelp || {};
    const apiKey = String(aiConfig.apiKey || "");
    const apiEndpoint = String(aiConfig.apiEndpoint || "https://api.openai.com/v1/chat/completions");
    const model = String(aiConfig.model || "gpt-4o-mini");

    if (!apiKey) {
      const out =
        claraWrap("Gagal", ["  ┊  ➶ Status: *Gagal*",
          "  ┊  ➶ Alasan: *API key AI belum diisi.*"].join("\n")) +
        "\n" +
        tipText("Isi `botConfig.aiHelp.apiKey` dulu, lalu coba lagi.");

      await m.reply(out);
      return { handled: true };
    }

    m.react("🐣");
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analisis media ini secara singkat: apa isinya, apa yang penting, dan berikan ringkasan dalam bahasa Indonesia." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AI error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || "Tidak dapat menganalisis media.";

    const out =
      claraWrap("AI Analyze", [`  ┊  ➶ Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}aianalyze untuk analisis lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(out);
    m.react("✅");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(text, "aianalyze");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
