// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .kamusai — Kamus AI: arti kata, contoh, sinonim, terjemahan, varian regional
// Replika native tool "Kamus AI" EzAITranslate.
import { raraError, tipText, raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";
import { startAiStatus } from "../../src/lib/rara-ai-status.js";
import { callAI } from "../../src/lib/rara-ai-service.js";
import { normalizeLang } from "../../src/lib/rara-translate-tools.js";

const pluginConfig = {
  name: "kamusai",
  alias: ["kamusai", "aikamus", "kamusaif"],
  category: "ai",
  description: "Kamus AI: arti kata, contoh, sinonim & terjemahan",
  usage: ".kamusai <kata> [bahasa]",
  example: ".kamusai rumah en",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || ".";
  let aiStatus = null;
  try {
    const raw = m.text?.trim() || "";
    const body = raw.replace(/^\.kamusai\S*\s*/i, "").trim();
    const parts = body.split(/\s+/).filter(Boolean);
    // arg terakhir boleh kode bahasa (opsional)
    let word = body, target = null;
    if (parts.length >= 2 && normalizeLang(parts[parts.length - 1])) {
      target = normalizeLang(parts[parts.length - 1]);
      word = parts.slice(0, -1).join(" ");
    }

    if (!word || word.length < 2) {
      const text =
        raraCaption({
          emoji: "📖",
          name: "kamusai",
          description: "Kamus AI: arti kata, contoh, sinonim & terjemahan",
          usage: `${prefix}kamusai <kata> [bahasa]`,
          example: `${prefix}kamusai rumah en`,
        }) +
        "\n" +
        tipText(`Bahasa opsional: en, jv, ar, ja, ko, dll`);
      await m.react("🐣");
      await m.reply(text, "kamusai");
      return { handled: true };
    }

    aiStatus = await startAiStatus(sock, m);
    const targetNote = target
      ? `Sertakan terjemahan ke bahasa kode "${target}" pada bagian Terjemahan.`
      : `Sertakan terjemahan ke bahasa Inggris pada bagian Terjemahan.`;
    const reply = await callAI({
      providerKey: "ikyy_gemini",
      model: "gemini",
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah kamus bahasa Indonesia yang akurat. Jawab HANYA dalam format ini (tanpa tambahan lain):\n" +
            "Arti: <definisi singkat, bahasa Indonesia>\n" +
            "Kelas: <kelas kata (nomina/verba/adjektiva/dll)>\n" +
            "Contoh: <1 contoh kalimat pemakaian>\n" +
            "Sinonim: <sinonim dipisah koma, atau '-'>\n" +
            "Terjemahan: <terjemahan kata + 1 contoh kalimat terjemahan>\n" +
            "Varian: <varian regional (mis. Jawa/Sunda/daerah) atau '-'>\n" +
            targetNote,
        },
        { role: "user", content: `Kata: ${word}` },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    if (!reply || !reply.trim()) throw new Error("AI kosong");
    const lines = reply.trim().split("\n");
    const hasil = lines.slice(0, 12).join("\n");

    const text =
      raraWrap("Kamusai", [`🔍 *${word}*`, ``, hasil].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}kamusai <kata> untuk kata lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await aiStatus.finish(text);
  } catch (error) {
    console.error("[kamusai]", error.message);
    if (aiStatus) await aiStatus.fail("AI kamus gagal merespons — coba lagi ya");
    else {
      await m.react("❌");
      await m.reply(raraError("Kamusai", "Gagal nih, coba lagi ya"), "kamusai");
    }
  }
  return { handled: true };
}

export { pluginConfig as config, handler }
