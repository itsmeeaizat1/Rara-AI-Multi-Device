// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Qwen3 replaced with callIkyy (ikyyxd qwen endpoint)
import { saluranCtx } from "../../src/lib/nova-context.js";
import te from "../../src/lib/nova-error.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap, novaGuideV2 } from "../../src/lib/nova-menu-style.js";
import { aiFallbackChat } from "../../src/lib/nova-ai-fallback.js";

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
    return m.reply(novaGuideV2("qwen3", {
 kaomoji: "(๑´ㅂ`๑)",
 sapaan: "tanya apa aja ke Qwen3, model besar dari Alibaba yang jago bahasa apa aja! (◍•ᴗ•◍)",
      cara: "ketik pertanyaannya sesudah command",
      contoh: `${m.prefix}qwen3 Apa itu machine learning?`,
      note: "model 80B, jadi agak lama tapi jawabannya mantap",
      spec: ["⚡ energi 2", "⏱ 10dtk", "💸 gratis"],
    }));
  }
  try {
    await m.react("🕒");
    // ikyy qwen endpoint udah mati → rantai fallback multi-API
    const reply = await aiFallbackChat(text, { persona: "Qwen3 — model AI besar dari Alibaba yang jago bahasa apa aja" , sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName});
    await m.react("🐣");
    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply);
  } catch (e) {
    console.error(e);
    m.reply(novaError("Qwen3", te(m.prefix, m.command, m.pushName, e), "error"));
  }
}

export { pluginConfig as config, handler };
