// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { GPT5 } from "../../src/scraper/gpt5.js";
import { saluranCtx } from "../../src/lib/rara-context.js";
import te from "../../src/lib/rara-error.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "gpt5",
  alias: ["gpt5"],
  category: "ai",
  description: "Chat dengan GPT-4.1 Nano via OverChat",
  usage: ".gpt5 <pertanyaan>",
  example: ".gpt5 Apa itu quantum computing?",
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
    return m.reply(raraGuide("gpt5", {
 kaomoji: "(๑˃ᴗ˂)ﻭ",
 sapaan: "tanya apa aja ke AI, dijawab pakai model GPT-4.1 Nano! (≧∇≦)ﾉ",
      cara: "ketik pertanyaannya sesudah command",
      contoh: `${m.prefix}gpt5 Apa itu quantum computing?`,
      note: "jawaban bisa agak lama, sabar ya",
      spec: ["⚡ energi 2", "⏱ 10dtk", "💸 gratis"],
    }));
  }
  try {
  await m.react("🕒");
    const result = await GPT5(text);

    if (!result.status) {
      return m.reply(raraWrap("GPT-5 Gagal", `${result.error || "Gagal dapet respons nih"}`));
    }
    const reply = `${result.answer}`;

    await m.react("🐣");
    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply);
  } catch (e) {
    console.error(e);
    m.reply(raraWrap("gpt5", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
