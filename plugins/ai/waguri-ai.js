// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import te from "../../src/lib/nova-error.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, novaGuideV2 } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "waguri-ai",
  alias: ["waguri-ai", "waguri"],
  category: "ai",
  description: "Chat dengan Waguri-san — Gadis pemalu yang lupa kacamata",
  usage: ".waguri-ai <pertanyaan>",
  example: ".waguri-ai Waguri-san, halo!",
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
    return m.reply(novaGuideV2("waguri-ai", {
 kaomoji: "(๑ᵔ⤙ᵔ๑)",
 sapaan: "ngobrol sama Waguri, gadis pemalu yang manis dan sering salah tingkah! (˶ᵔ ᵕ ᵔ˶)",
      cara: "ketik pertanyaannya sesudah command",
      contoh: `${m.prefix}waguri-ai Waguri-san, halo!`,
      spec: ["⚡ energi 2", "⏱ 10dtk", "💸 gratis"],
    }));
  }
  try {
  await m.react("🕒");
    const result = await UnlimitedAI(text, "waguri-ai");

    if (!result.status) {
      { return await m.reply(claraWrap("waguri-ai", `${result.error || "Gagal dapet respons nih"}`, "error")); };
    }
    const reply = result.answer;
    await m.react("🐣");
    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply);
  } catch (e) {
    console.error(e);
    m.reply(claraWrap("waguri-ai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
