// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import { startAiStatus } from "../../src/lib/nova-ai-status.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

const pluginConfig = {
  name: "aianalyze",
  alias: ["aianalyze"],
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
    const prefix = botConfig.command?.prefix || ".";
  let aiStatus = null;
  try {

    const media = (m.quoted && m.quoted.isImage) || m.isImage; // FIX 10 Sep: flags isImage
    if (!media) {
      const out =
        novaCaption({
  emoji: "🤖",
  name: "aianalyze",
  description: "Analisis gambar/file dengan AI",
  usage: `${prefix}aianalyze (reply media)`,
  example: `${prefix}aianalyze (reply foto)`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.react("🐣");
      await m.reply(out);
      return { handled: true };
    }

    const buffer = m.quoted?.isImage ? await m.quoted.download() : await m.download();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;

    const aiConfig = botConfig.aiHelp || {};
    const apiKey = String(aiConfig.apiKey || "");
    const apiEndpoint = String(aiConfig.apiEndpoint || "https://api.openai.com/v1/chat/completions");
    const model = String(aiConfig.model || "gpt-4o-mini");

    if (!apiKey) {
      const out =
        novaError("AIAnalyze", "Gagal nih, coba lagi ya");

      await m.reply(out);
      return { handled: true };
    }

    // 🔹 status loading ala agent (owner 29 Sep) — 👀 scanning gambar → jawaban
    aiStatus = await startAiStatus(sock, m, { phases: ["👀 Scanning...", "🧠 Thinking...", "✍️ Composing..."] });
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
      claraWrap("AI Analyze", [`Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}aianalyze untuk analisis lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await aiStatus.finish(out);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("AIAnalyze", "Gagal nih, coba lagi ya");

    if (aiStatus) await aiStatus.fail("AI Analyze gagal — coba lagi ya");
    else { await m.react("❌"); await m.reply(text, "aianalyze"); }
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
