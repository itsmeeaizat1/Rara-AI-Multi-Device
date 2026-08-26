// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { 
  separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `stt_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    const quoted = m.quoted?.text ? m.quoted : m.msg?.text ? m : null;
    if (!quoted) {
      const text =
        claraWrap("Cara Pakai", [`│ ❏ Penggunaan: *${prefix}stt*`,
          `│ ❏ Contoh: *Kirim/reply audio/voice*, lalu ketik *${prefix}stt*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "stt");
      return { handled: true };
    }

    const text = quoted.text || m.text || "";
    const replyText = text.trim() || "Tidak ada teks untuk diproses.";

    const prompt = `Jelaskan ringkas pesan ini dalam bahasa Indonesia: ${replyText}`;
    const aiReply = await callAI(prompt, botConfig.aiHelp);

    const out =
      claraWrap("Speech to Text", [`│ ❏ Hasil: *${replyText.slice(0, 300)}${replyText.length > 300 ? "..." : ""}*`].join("\n")) +
      "\n\n" +
      claraWrap("RANGKUM", `│ ❏ Ringkasan: *${aiReply}*`) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Ketik ${prefix}stt untuk ringkas pesan lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(out);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`│ ❏ Status: *Gagal*`,
        `│ ❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(text, "stt");
  }

  return { handled: true };
}

async function callAI(prompt, aiConfig) {
  const { apiKey, apiEndpoint, model, systemPrompt } = aiConfig || {};
  if (!apiKey || !apiEndpoint || !model) {
    return "AI belum dikonfigurasi.";
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
        { role: "system", content: systemPrompt || "Kamu adalah asisten bot WhatsApp." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "Tidak ada respon dari AI.";
}

const pluginConfig = {
  name: "stt",
  alias: ["stt", "stt2", "speech2text"],
  category: "ai",
  description: "Ringkas pesan audio/teks menjadi teks",
  usage: ".stt",
  example: ".stt (reply pesan)",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

export { pluginConfig as config, handler }
