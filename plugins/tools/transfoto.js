// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .transfoto — Translate teks di gambar (OCR lokal → MyMemory, tanpa Google)
// Replika native tool "Terjemahan Gambar" EzAITranslate.
import * as _tesseract from "tesseract.js";
import te from "../../src/lib/rara-error.js";
import { translateTextFree, normalizeLang, textStats } from "../../src/lib/rara-translate-tools.js";
import { raraWrap, raraCaption, tipText } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "transfoto",
  alias: ["transfoto", "transimage", "transpic", "transgambar"],
  category: "tools",
  description: "Terjemahkan teks di dalam gambar (OCR lokal)",
  usage: ".transfoto <bahasa> [ocrLang] (reply gambar)",
  example: ".transfoto en (reply gambar)",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 20,
  energi: 2,
  isEnabled: true,
};

const IMG_LIMIT = 10 * 1024 * 1024; // 10 MB
const OCR_LIMIT = 5000; // karakter OCR yang ditranslate

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || ".";
  try {
    const quoted = m.quoted || m;
    const isImage = quoted.type === "imageMessage" || m.isImage || (quoted.msg?.mimetype || "").startsWith("image/");
    const args = m.text?.trim().split(/\s+/).slice(1) || [];
    const target = normalizeLang(args[0]);

    if (!isImage || !target) {
      const text =
        raraCaption({
          emoji: "🖼️",
          name: "transfoto",
          description: "Terjemahkan teks di dalam gambar (OCR lokal)",
          usage: `${prefix}transfoto <bahasa> [ocrLang] (reply gambar)`,
          example: `${prefix}transfoto en (reply gambar)`,
        }) +
        "\n" +
        tipText(`ocrLang default: eng (opsional: ind, eng+ind)`);
      await m.reply(text, "transfoto");
      return { handled: true };
    }

    await m.react("🕒");
    let buffer;
    if (quoted.isMedia || quoted.type === "imageMessage") buffer = await quoted.download();
    else if (m.isMedia) buffer = await m.download();
    if (!buffer || buffer.length === 0) {
      await m.react("❌");
      return m.reply(raraWrap("Transfoto", `❌ *Gagal download gambar*`), "transfoto");
    }
    if (buffer.length > IMG_LIMIT) {
      await m.react("❌");
      return m.reply(raraWrap("Transfoto", `❌ *Gambar terlalu besar*\n\nMaksimal 10 MB`), "transfoto");
    }

    const ocrLang = (args[1] && /^[a-z]{3}(\+[a-z]{3})*$/i.test(args[1])) ? args[1].toLowerCase() : "eng";
    const Tesseract = _tesseract;
    const { data } = await Tesseract.recognize(buffer, ocrLang, {});
    const ocrText = (data?.text || "").trim();
    if (!ocrText) {
      await m.react("🐣");
      return m.reply(raraWrap("Transfoto", `❌ *Tidak ada teks terdeteksi di gambar*\n\nCoba gambar yang lebih jelas / resolusi lebih tinggi`), "transfoto");
    }

    const clipped = ocrText.length > OCR_LIMIT;
    const input = clipped ? ocrText.slice(0, OCR_LIMIT) : ocrText;
    const { translated, ok } = await translateTextFree(input, target, "id");

    const st = textStats(ocrText);
    await m.react("🐣");
    await m.reply(raraWrap("Transfoto", [
      `🖼️ *Teks Terdeteksi (OCR ${ocrLang})*`,
      ocrText.slice(0, 800) + (ocrText.length > 800 ? "..." : ""),
      ``,
      `🌐 *Terjemahan (${target.toUpperCase()})*`,
      (ok ? translated : "(gagal translate — teks OCR di atas)").slice(0, 1200),
      ``,
      `📊 ${st.chars.toLocaleString("id-ID")} karakter · ${st.words.toLocaleString("id-ID")} kata`,
    ].join("\n")), "transfoto");
  } catch (error) {
    console.error("[transfoto]", error.message);
    await m.react("❌");
    m.reply(raraWrap("Transfoto", te(m.prefix, m.command, m.pushName), "error"), "transfoto");
  }
  return { handled: true };
}

export { pluginConfig as config, handler }
