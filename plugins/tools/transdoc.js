// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .transdoc — Translate dokumen (TXT/MD/DOCX/PDF) ke bahasa lain
// Replika native tool "Terjemahan Dokumen" EzAITranslate (tanpa Google — MyMemory).
import te from "../../src/lib/rara-error.js";
import {
  detectDocKind, extractDocText, translateTextFree, textStats, normalizeLang, MAX_TEXT_DEFAULT,
} from "../../src/lib/rara-translate-tools.js";
import { raraWrap, raraCaption, tipText } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "transdoc",
  alias: ["transdoc", "transdok", "translatedoc", "transdokumen"],
  category: "tools",
  description: "Terjemahkan dokumen (TXT/MD/DOCX/PDF) ke bahasa lain",
  usage: ".transdoc <bahasa> (reply dokumen)",
  example: ".transdoc en (reply dokumen)",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 60,
  energi: 3,
  isEnabled: true,
};

const DOC_LIMIT = 15 * 1024 * 1024; // 15 MB file
const TEXT_LIMIT_OWNER = 60000;

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || ".";
  try {
    const quoted = m.quoted || m;
    const isDoc = quoted.type === "documentMessage" || quoted.isDocument;
    const args = m.text?.trim().split(/\s+/).slice(1) || [];
    const target = normalizeLang(args[0]);

    if (!isDoc || !target) {
      const text =
        raraCaption({
          emoji: "📄",
          name: "transdoc",
          description: "Terjemahkan dokumen (TXT/MD/DOCX/PDF) ke bahasa lain",
          usage: `${prefix}transdoc <bahasa> (reply dokumen)`,
          example: `${prefix}transdoc en (reply dokumen)`,
        }) +
        "\n" +
        tipText(`Format didukung: TXT, MD, DOCX, PDF (maks 15 MB)`);
      await m.reply(text, "transdoc");
      return { handled: true };
    }

    await m.react("🕒");
    const fileName = quoted.msg?.fileName || quoted.fileName || "dokumen";
    const mimetype = quoted.msg?.mimetype || quoted.mimetype || "";
    const kind = detectDocKind(fileName, mimetype);
    if (!kind) {
      await m.react("❌");
      return m.reply(raraWrap("Transdoc",
        `❌ *Format tidak didukung*\n\nFile: ${fileName}\nDidukung: TXT, MD, DOCX, PDF`), "transdoc");
    }

    const buffer = await quoted.download();
    if (!buffer || buffer.length < 10) {
      await m.react("❌");
      return m.reply(raraWrap("Transdoc", `❌ *Gagal download dokumen*\n\nCoba ulang, file mungkin terlalu besar`), "transdoc");
    }
    if (buffer.length > DOC_LIMIT) {
      await m.react("❌");
      return m.reply(raraWrap("Transdoc", `❌ *File terlalu besar*\n\nMaksimal 15 MB (file: ${(buffer.length / 1048576).toFixed(1)} MB)`), "transdoc");
    }

    const { text: source } = await extractDocText(buffer, kind);
    if (!source || !source.trim()) {
      await m.react("❌");
      return m.reply(raraWrap("Transdoc", `❌ *Teks kosong*\n\nGak ada teks yang bisa diekstrak dari dokumen ini (mungkin hasil scan/gambar)`), "transdoc");
    }

    const limit = m.isOwner ? TEXT_LIMIT_OWNER : MAX_TEXT_DEFAULT;
    const clipped = source.length > limit;
    const input = clipped ? source.slice(0, limit) : source;

    const { translated, ok } = await translateTextFree(input, target, "id");
    if (!ok) {
      await m.react("❌");
      return m.reply(raraWrap("Transdoc",
        `❌ *Gagal translate*\n\nKode bahasa "${args[0]}" mungkin tidak didukung, coba: en, jv, ar, ja, ko, zh-CN, es, fr`), "transdoc");
    }

    const st = textStats(input);
    const baseName = String(fileName).replace(/\.[^.]+$/, "");
    const outName = `${baseName}_${target}.txt`;
    const outBuf = Buffer.from(translated + (clipped ? "\n\n[...dokumen dipotong karena limit karakter]" : ""), "utf-8");

    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      document: outBuf,
      mimetype: "text/plain",
      fileName: outName,
      caption: raraWrap("Transdoc", [
        `📄 *${fileName}* → *${outName}*`,
        `🌐 Bahasa: Indonesia → *${target.toUpperCase()}*`,
        `📊 ${st.chars.toLocaleString("id-ID")} karakter · ${st.words.toLocaleString("id-ID")} kata · ${st.lines.toLocaleString("id-ID")} baris`,
        clipped ? `✂️ Dipotong ke ${limit.toLocaleString("id-ID")} karakter (owner: maks 60.000)` : ``,
      ].filter(Boolean).join("\n")),
    }, { quoted: m });
  } catch (error) {
    console.error("[transdoc]", error.message);
    await m.react("❌");
    m.reply(raraWrap("Transdoc", te(m.prefix, m.command, m.pushName), "error"), "transdoc");
  }
  return { handled: true };
}

export { pluginConfig as config, handler }
