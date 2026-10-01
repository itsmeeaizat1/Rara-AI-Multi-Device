// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// oneai.js — Onepunya API: AI_CHAT_GENERATION + MULTIMODAL_CHAT.
// .onechat [model] <teks>   — chat AI (model: chatgpt gemini qwen chat; default chatgpt)
// .onechat <reply foto> <teks> — foto dijawab (vision via multimodal)
// Sumber: onepunya.qzz.io (key .setkey onepunya) — numpang model Onepunya,
// beda dari AI satuan (.gpt4o dkk) yang udah ada.
import { getApiKey } from "../../src/lib/rara-api-keys.js";
import { raraWrap, raraGuideV2 } from "../../src/lib/rara-menu-style.js";
import { aiChat, multimodalChat } from "../../src/lib/rara-onepunya.js";
import { uploadImage } from "../../src/lib/rara-uploader.js";

const pluginConfig = {
  name: "onechat",
  alias: ["onechat", "oneai", "onepunyaai"],
  category: "ai",
  description: "Chat AI via Onepunya API (teks atau reply foto)",
  usage: ".onechat [chatgpt|gemini|qwen|chat] <teks>",
  example: ".onechat gemini jelaskan kuantum singkat",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 12,
  energi: 3,
  isEnabled: true,
};

const MODELS = ["chatgpt", "gemini", "qwen", "chat"];
const MULTIMODAL_MODELS = { "0": "chatgpt", "1": "gemini", "2": "qwen" };

async function handler(m, { sock }) {
  let args = [...(m.args || [])];
  const apiKey = getApiKey("onepunya");

  // model opsional di arg pertama
  let model = "chatgpt";
  if (args[0] && MODELS.includes(args[0].toLowerCase())) {
    model = args.shift().toLowerCase();
  }
  const text = args.join(" ").trim();

  try {
    // ── reply foto → multimodal vision ──
    const hasQuotedImage = !!(m.quoted && (m.quoted.isMedia || m.quoted.isImage));
    if (hasQuotedImage) {
      const prompt = text || "Deskripsikan isi gambar ini.";
      const buf = await m.quoted.download();
      if (!buf || !buf.length) {
        return m.reply(raraWrap("Onepunya AI", "Gagal mengunduh foto yang di-reply."));
      }
      const imgUrl = await uploadImage(Buffer.from(buf), "onepunya-vision.jpg");
      // multimodal pakai model "0"|"1"|"2" (chatgpt|gemini|qwen)
      const mmModel = Object.entries(MULTIMODAL_MODELS).find(([, n]) => n === model)?.[0] || "0";
      const res = await multimodalChat(apiKey, {
        system: "Kamu asisten AI yang membantu, jawab dengan bahasa yang sama dengan user.",
        input_file: imgUrl,
        model: mmModel,
        messages: [{ role: "user", content: prompt }],
      });
      const answer = res?.response || res?.text || "";
      if (!answer) throw new Error("Respon kosong dari server.");
      return m.reply(raraWrap("Onepunya AI", `🤖 (${model})\n\n${String(answer).slice(0, 3000)}`));
    }

    // ── teks biasa → AI chat ──
    if (!text) {
      return m.reply(raraGuideV2("onechat", {
 kaomoji: "(๑˃̵ᴗ˂̵)و",
 sapaan: "satu pintu banyak model AI, tanya apa pun! (๑•̀ㅂ•́)✧",
        cara: "ketik pertanyaannya sesudah command",
        contoh: `${m.prefix}onechat ${model === "chatgpt" ? "" : model + " "}jelaskan kuantum singkat`,
        note: `model tersedia: ${MODELS.join(" | ")}`,
        spec: ["⚡ energi 3", "⏱ 12dtk", "💸 gratis"],
      }));
    }
    const res = await aiChat(apiKey, {
      model: model.toUpperCase(),
      messages: [{ role: "user", content: text }],
      stream: false,
      markdown: false,
    });
    // bentuk respon bervariasi: string | {response} | {message}
    const answer = typeof res === "string" ? res : (res?.response || res?.message || res?.result || "");
    if (!answer) throw new Error("Respon kosong dari server.");
    return m.reply(raraWrap("Onepunya AI", `🤖 (${model})\n\n${String(answer).slice(0, 3000)}`));
  } catch (e) {
    return m.reply(raraWrap("Onepunya AI", `Gagal: ${String(e.message || e).slice(0, 200)}`));
  }
}

export { pluginConfig as config, handler };
