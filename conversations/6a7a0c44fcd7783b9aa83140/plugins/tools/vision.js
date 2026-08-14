import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `vision_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    const media = m.msg?.imageMessage || m.quoted?.msg?.imageMessage;
    if (!media) {
      const text =
        claraWrap("Cara Pakai", [`◦ Penggunaan: *${prefix}vision <teks>*`,
          `◦ Kirim/reply foto, lalu ketik *${prefix}vision <pertanyaan>*`,
          `◦ Contoh: *${prefix}vision apa yang ada di foto ini?*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "vision");
      return { handled: true };
    }

    const prompt = m.text?.trim() || "Deskripsikan gambar ini secara detail dalam bahasa Indonesia.";
    const buffer = await sock.downloadMediaMessage(m.quoted || m);
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;

    const aiConfig = botConfig.aiHelp || {};
    const apiKey = String(aiConfig.apiKey || "");
    const apiEndpoint = String(aiConfig.apiEndpoint || "https://api.openai.com/v1/chat/completions");
    const model = String(aiConfig.model || "gpt-4o-mini");

    if (!apiKey) {
      const text =
        claraWrap("Gagal", ["◦ Status: *Gagal*",
          "◦ Alasan: *API key AI belum diisi.*"].join("\n")) +
        "\n" +
        tipText("Isi `botConfig.aiHelp.apiKey` dulu, lalu coba lagi.");

      await sendReplyWithNav(sock, m, text, "vision");
      return { handled: true };
    }

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
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AI error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || "Tidak ada respon dari AI.";

    const out =
      claraWrap("Vision", [`◦ Pertanyaan: *${prompt}*`,
        `◦ Hasil: *${reply}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}vision <pertanyaan> untuk analisis lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(out);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, text, "vision");
  }

  return { handled: true };
}

const pluginConfig = {
  name: "vision",
  alias: ["vision", "imganalysis", "imageai2"],
  category: "ai",
  description: "Analisis gambar dengan AI",
  usage: ".vision <pertanyaan> (reply foto)",
  example: ".vision apa yang ada di foto ini?",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

export { pluginConfig as config, handler }
