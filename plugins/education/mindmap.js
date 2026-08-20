// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "mindmap",
  alias: ["mindmap", "peta pikiran", "petafikiran", "mindmapku", "conceptmap"],
  category: "education",
  description: "Generate mind map dari teks/topik - AI ekstrak konsep utama + sub-topik",
  usage: ".mindmap <topik/teks>",
  example: ".mindmap fotosintesis\n.mindmap sistem operasi\n.mindmap teks panjang tentang...",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 5,
  isEnabled: true,
};

async function handler(m, { sock, args, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || ".";
  const input = args.join(" ").trim();

  if (!input) {
    return sendReplyWithNav(m, sock, claraWrap("Mindmap - Peta Pikiran", [
      `Generate mind map dari topik atau teks menggunakan AI.`,
      ``,
      `Cara pakai:`,
      `1. ${prefix}mindmap <topik> - AI buat mind map dari topik`,
      `2. ${prefix}mindmap <teks> - AI ekstrak konsep dari teks panjang`,
      ``,
      `Contoh:`,
      `${prefix}mindmap fotosintesis`,
      `${prefix}mindmap sistem operasi komputer`,
      `${prefix}mindmap teks panjang tentang sejarah...`,
    ].join("\n")) + "\n" + tipText("Mind map ditampilkan dalam format teks visual"), { commandName: "mindmap" });
  }

  await m.react("🕐");
  try {
    const isLongText = input.length > 200;

    let prompt;
    if (isLongText) {
      prompt = `Analisis teks berikut dan buat mind map (peta pikiran) dalam format teks visual.

Teks:
"${input.substring(0, 3000)}"

Format mind map:
[TOPIC UTAMA]
  ├─ [Konsep 1]
  │    ├─ [Sub-konsep 1.1]
  │    └─ [Sub-konsep 1.2]
  ├─ [Konsep 2]
  │    ├─ [Sub-konsep 2.1]
  │    └─ [Sub-konsep 2.2]
  └─ [Konsep 3]

Pilih 4-6 konsep utama, masing-masing dengan 2-3 sub-konsep. Gunakan bahasa Indonesia.`;
    } else {
      prompt = `Buat mind map (peta pikiran) untuk topik: "${input}"

Format mind map:
${input.toUpperCase()}
  ├─ [Konsep 1]
  │    ├─ [Sub-konsep 1.1]
  │    └─ [Sub-konsep 1.2]
  ├─ [Konsep 2]
  │    ├─ [Sub-konsep 2.1]
  │    └─ [Sub-konsep 2.2]
  ├─ [Konsep 3]
  │    ├─ [Sub-konsep 3.1]
  │    └─ [Sub-konsep 3.2]
  └─ [Konsep 4]

Pilih 4-6 konsep utama yang paling penting, masing-masing dengan 2-3 sub-konsep. Gunakan bahasa Indonesia. Buat singkat dan padat.`;
    }

    const result = await callAI({
      prompt,
      systemPrompt: "Kamu adalah ahli mind mapping. Buat mind map yang terstruktur, jelas, dan mudah dipahami. Gunakan format teks dengan karakter box-drawing (├─ └─) untuk hierarki.",
    });

    // Wrap dalam code block agar monospace dan alignment rapi
    const mindmapText = "```" + result + "```";

    return sendReplyWithNav(m, sock, claraWrap("Mindmap", `${input.substring(0, 50)}${input.length > 50 ? "..." : ""}\n\n${mindmapText}`), { commandName: "mindmap" });
  } catch (e) {
    return sendReplyWithNav(m, sock, claraWrap("Error", `Gagal generate: ${e.message}`), { commandName: "mindmap" });
  }
}

export { pluginConfig as config, handler };
