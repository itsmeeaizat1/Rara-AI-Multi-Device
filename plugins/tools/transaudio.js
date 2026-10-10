// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .transaudio — Translate voice note / audio (STT → MyMemory, tanpa Google)
// Replika native tool "Terjemahan Audio" EzAITranslate.
import te from "../../src/lib/rara-error.js";
import { transcribeAudio } from "../../src/lib/rara-stt.js";
import { translateTextFree, normalizeLang, textStats } from "../../src/lib/rara-translate-tools.js";
import { raraWrap, raraCaption, tipText } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "transaudio",
  alias: ["transaudio", "transvoice", "transvn", "translateaudio"],
  category: "tools",
  description: "Terjemahkan voice note / audio ke bahasa lain",
  usage: ".transaudio <bahasa> (reply voice note)",
  example: ".transaudio en (reply VN)",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 30,
  energi: 3,
  isEnabled: true,
};

const AUDIO_LIMIT = 16 * 1024 * 1024; // 16 MB
const TRANSCRIPT_LIMIT = 8000; // karakter transkrip yang ditranslate

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || ".";
  try {
    const quoted = m.quoted || m;
    const isAudio = quoted.type === "audioMessage" || /audio|ogg/.test(quoted.mimetype || quoted.msg?.mimetype || "");
    const args = m.text?.trim().split(/\s+/).slice(1) || [];
    const target = normalizeLang(args[0]);

    if (!isAudio || !target) {
      const text =
        raraCaption({
          emoji: "🎤",
          name: "transaudio",
          description: "Terjemahkan voice note / audio ke bahasa lain",
          usage: `${prefix}transaudio <bahasa> (reply voice note)`,
          example: `${prefix}transaudio en (reply VN)`,
        }) +
        "\n" +
        tipText(`Voice note akan ditranskrip (Whisper) lalu diterjemahkan`);
      await m.reply(text, "transaudio");
      return { handled: true };
    }

    await m.react("🕒");
    const buffer = await quoted.download();
    if (!buffer || buffer.length < 1000) {
      await m.react("❌");
      return m.reply(raraWrap("Transaudio", `❌ *Audio terlalu kecil atau gagal diunduh*`), "transaudio");
    }
    if (buffer.length > AUDIO_LIMIT) {
      await m.react("❌");
      return m.reply(raraWrap("Transaudio", `❌ *Audio terlalu besar*\n\nMaksimal 16 MB (file: ${(buffer.length / 1048576).toFixed(1)} MB)`), "transaudio");
    }

    const mime = quoted.mimetype || quoted.msg?.mimetype || "audio/ogg";
    const transcript = await transcribeAudio(buffer, mime);
    if (!transcript || !transcript.trim()) {
      await m.react("❌");
      return m.reply(raraWrap("Transaudio", `❌ *Tidak dapat mendeteksi suara*\n\nPastikan audio jelas dan tidak terlalu pendek`), "transaudio");
    }

    const clipped = transcript.length > TRANSCRIPT_LIMIT;
    const input = clipped ? transcript.slice(0, TRANSCRIPT_LIMIT) : transcript;
    const { translated, ok } = await translateTextFree(input, target, "id");

    const st = textStats(transcript);
    await m.react("🐣");
    await m.reply(raraWrap("Transaudio", [
      `🎤 *Transkrip (Indonesia)*`,
      transcript.slice(0, 1200) + (transcript.length > 1200 ? "..." : ""),
      ``,
      `🌐 *Terjemahan (${target.toUpperCase()})*`,
      (ok ? translated : "(gagal translate — transkrip asli di atas)").slice(0, 1500),
      ``,
      `📊 ${st.chars.toLocaleString("id-ID")} karakter · ${st.words.toLocaleString("id-ID")} kata · ${st.lines.toLocaleString("id-ID")} baris`,
    ].join("\n")), "transaudio");
  } catch (error) {
    console.error("[transaudio]", error.message);
    await m.react("❌");
    m.reply(raraWrap("Transaudio", te(m.prefix, m.command, m.pushName), "error"), "transaudio");
  }
  return { handled: true };
}

export { pluginConfig as config, handler }
