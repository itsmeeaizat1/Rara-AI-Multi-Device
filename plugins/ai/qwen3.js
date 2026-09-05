// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Qwen3 replaced with callIkyy (ikyyxd qwen endpoint)
import { saluranCtx } from "../../src/lib/nova-context.js";
import te from "../../src/lib/nova-error.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import { callIkyy } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "qwen3",
  alias: ["qwen3"],
  category: "ai",
  description: "Chat dengan Qwen3 80B via OverChat",
  usage: ".qwen3 <pertanyaan>",
  example: ".qwen3 Apa itu machine learning?",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ");
  if (!text) {
    return m.reply(claraWrap("qwen3", [
      "Tanya apa aja ke AI Qwen3 — model besar dari Alibaba yang jago bahasa apa aja.",
      "",
      "📌 Format:",
      `${m.prefix}qwen3 <pertanyaan>`,
      "",
      "💡 Contoh:",
      `${m.prefix}qwen3 Apa itu machine learning?`,
      "",
      `${m.prefix}qwen3 Buat resep masakan Indonesia`,
      "",
      "Model 80B, jadi agak lama tapi jawabannya mantap",
    ]));
  }
  try {
  await m.react("🕒");
    const result = await callIkyy(text, {});

    if (!result.status) {
      return m.reply(claraWrap("Qwen3 Gagal", `${result.error || "Gagal dapet respons nih"}`));
    }
    const reply = `${result.answer}`;
    await m.react("🐣");
    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply);
  } catch (e) {
    console.error(e);
    m.reply(novaError("Qwen3", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
