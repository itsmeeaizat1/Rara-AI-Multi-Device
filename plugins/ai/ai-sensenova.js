// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ai-sensenova — SenseNova AI (SenseTime) — multimodal vision + chat
// Model: sensenova-6.8-flash-lite (input text+image, 256K ctx, gratis).
// Key: apikeys.json novaai.sensenova (fallback env SENSENOVA_API_KEY).
// Support: tanya teks biasa, ATAU reply/kirim foto + pertanyaan (vision asli).
// Langsung ke sensenovaChat/sensenovaVision; mati → jatuh ke rantai fallback.
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { sensenovaChat, sensenovaVision } from "../../src/scraper/sensenova.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import { visionScan } from "../../src/lib/nova-vision-chain.js";

const pluginConfig = {
  name: "aisensenova",
  alias: ["sensenova", "sn", "sensetime"],
  category: "ai",
  description: "SenseNova AI — SenseTime, multimodal (bisa lihat gambar!), 256K context",
  usage: ".aisensenova <pertanyaan>\n.aisensenova <pertanyaan> (reply/kirim foto)",
  example: ".aisensenova apa itu AI multimodal?\n.aisensenova apa di foto ini? (reply foto)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  const isImage = m.isImage || (m.quoted && (m.quoted.isImage || m.quoted?.type === "imageMessage"));

  if (!text && !isImage) {
    return m.reply(claraWrap("aisensenova", `Mau nanya apa?\n\nContoh teks: ${m.prefix}aisensenova apa itu AI multimodal?\nContoh gambar: reply foto + ${m.prefix}aisensenova apa di foto ini?`, "guide"));
  }
  try {
    await m.react("🕒");
    let reply = "";
    let engine = "sensenova";

    if (isImage) {
      // Vision multimodal asli — SenseNova baca gambar langsung
      let buffer;
      if (m.quoted && m.quoted.isMedia) buffer = await m.quoted.download();
      else if (m.isMedia) buffer = await m.download();
      else {
        await m.react("❌");
        return m.reply(claraWrap("aisensenova", "Gagal download gambar. Coba kirim ulang.", "error"));
      }
      const q = text || "Deskripsikan gambar ini secara detail dalam bahasa Indonesia.";
      const result = await visionScan({ imageBuffer: buffer, question: q, sessionKey: "satuan:" + m.sender })
        .catch(() => null);
      if (result?.status) {
        reply = result.text;
        engine = result.engine;
      } else {
        await m.react("❌");
        return m.reply(claraWrap("aisensenova", result?.error || "Gagal menganalisis gambar", "error"));
      }
    } else {
      // Chat teks: SenseNova utama, 9Router dipakai bila endpoint/key bermasalah.
      try {
        reply = await sensenovaChat(text);
      } catch (primaryErr) {
        console.error("aisensenova SenseNova gagal, fallback 9Router:", primaryErr.message);
        reply = await callAI({
          providerKey: "tio_openai",
          messages: [{ role: "user", content: text }],
          systemPrompt: "Jawab dalam bahasa Indonesia dengan jelas.",
          senderJid: m.sender,
        });
        engine = "9Router fallback";
      }
      try {
        const { appendTurn } = await import("../../src/lib/nova-ai-session.js");
        appendTurn("satuan:" + m.sender, text, reply);
      } catch {}
    }

    if (!reply) throw new Error("balasan AI kosong");

    await m.react("🐣");
    const src = engine !== "sensenova" ? `\n\n⚙️ Engine: ${engine}` : "";
    return m.reply(reply.trim() + src);
  } catch (err) {
    console.error("aisensenova error:", err);
    await m.react("❌");
    return m.reply(claraWrap("aisensenova", err.message || te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
