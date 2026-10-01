import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import FormData from "form-data";
import axios from "axios";
import { novaError, novaEmpty, novaGuide, novaNoInput, tipText, novaWrap } from "../../src/lib/nova-menu-style.js";
import { callAI, callIkyy } from "../../src/lib/nova-ai-service.js";
import config from "../../config.js";

// ─── Convert audio to WAV for transcription ───
function convertToWav(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    exec(
      `ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -f wav "${outputPath}"`,
      { timeout: 30000 },
      (err) => (err ? reject(err) : resolve())
    );
  });
}

// ─── Transcribe audio via Groq Whisper ───
async function transcribeAudio(wavBuffer, groqKey) {
  const form = new FormData();
  form.append("file", wavBuffer, { filename: "audio.wav", contentType: "audio/wav" });
  form.append("model", "whisper-large-v3");
  form.append("response_format", "json");

  const { data } = await axios.post(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    form,
    {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${groqKey}` },
      timeout: 60000,
      maxContentLength: Infinity,
    }
  );
  return data.text || "";
}

export default {
  config: {
  name: "slangtranslate",
  alias: ["slangtranslate", "slangtr"],
  category: "ai",
  desc: "Auto-Translator & Cultural Slang Contextualizer - Terjemahkan slang/idiom/bahasa gaul dengan konteks budaya. Support teks & voice note.",
  usage: ".slangtranslate (reply teks/VN yang ingin diterjemahkan)\n.slangtranslate <teks langsung>",
  example: ".slangtranslate that's cap fr fr\n.slangtranslate ngap sih lo",
  wait: "🕐",
  error: "❌",

  },
  async handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
    const aiConfig = botConfig.aiHelp || {};

    if (!aiConfig.apiKey) {
      const text =
        novaWrap("Slang Translator", [
          `Status: *Belum dikonfigurasi*`,
          ``,
          `Bot butuh AI API untuk menerjemahkan slang.`,
          `Owner: ketik *${prefix}aihelp* untuk set API key.`,
        ].join("\n")) +
        "\n" +
        tipText(`Setup AI dulu dengan ${prefix}aihelp`);
      await m.reply(text);
      return { handled: true };
    }

    // ─── Cek apakah reply ke voice note / audio ───
    const quoted = m.quoted;
    const isAudio = quoted && (
      quoted.type === "audioMessage" ||
      quoted.type === "pttMessage" ||
      /audio/.test(quoted.mimetype || "")
    );

    let inputText = "";

    // ─── Mode 1: Reply ke Voice Note / Audio ───
    if (isAudio) {
      const groqKey = config.APIkey?.groq;
      if (!groqKey) {
        const text =
          novaWrap("Slang Translator", [
            `Status: *Groq API belum dikonfigurasi*`,
            ``,
            `Untuk transcribe voice note, bot butuh Groq API key.`,
            `Owner: set di config.js → APIkey.groq`,
            `Gratis di https://console.groq.com`,
            ``,
            `Atau reply *teks* biasa untuk terjemahkan tanpa Groq.`,
          ].join("\n"));
        await m.reply(text);
        return { handled: true };
      }
      const tmpDir = os.tmpdir();
      const inputPath = path.join(tmpDir, `slangtr_${Date.now()}.ogg`);
      const wavPath = path.join(tmpDir, `slangtr_${Date.now()}.wav`);

      try {
      await m.react("🕒");
        // Download audio
        const buffer = await quoted.download();
        if (!buffer || buffer.length < 1000) {
          await m.react("🐣");
          await m.reply(novaWrap("Slang Translator", [
            `Status: *Gagal*`,
            `Audio terlalu kecil atau gagal diunduh.`,
          ].join("\n")));
          return { handled: true };
        }

        fs.writeFileSync(inputPath, buffer);

        // Convert to WAV
        await convertToWav(inputPath, wavPath);
        const wavBuffer = fs.readFileSync(wavPath);

        // Transcribe via Groq Whisper
        const transcribedText = await transcribeAudio(wavBuffer, groqKey);

        // Cleanup temp files
        try { fs.unlinkSync(inputPath); } catch (e) { console.error('[slangtranslate.js]:', e.message); }
        try { fs.unlinkSync(wavPath); } catch (e) { console.error('[slangtranslate.js]:', e.message); }

        if (!transcribedText || transcribedText.trim() === "") {
          await m.reply(novaWrap("Slang Translator", [
            `Status: *Gagal transcribe*`,
            `Tidak dapat mendeteksi suara dari voice note.`,
            `Pastikan audio jelas dan tidak terlalu pendek.`,
          ].join("\n")));
          return { handled: true };
        }

        inputText = transcribedText.trim();

        // Kirim info transcribe dulu
        await m.reply(novaWrap("Transcribe VN", [
          `🎙️ Hasil transcribe:`,
          `"${inputText.length > 200 ? inputText.slice(0, 200) + "..." : inputText}"`,
          ``,
          
        ].join("\n")));
      } catch (error) {
        try { fs.unlinkSync(inputPath); } catch (e) { console.error('[slangtranslate.js]:', e.message); }
        try { fs.unlinkSync(wavPath); } catch (e) { console.error('[slangtranslate.js]:', e.message); }
        const text =
          novaWrap("Slang Translator - Error", [
            `Status: *Gagal transcribe*`,
            `Alasan: *${error.message}*`,
            ``,
            `Cek Groq API key di config.js.`,
          ].join("\n"));
        await m.reply(text);
        return { handled: true };
      }

    // ─── Mode 2: Reply ke teks ───
    } else if (quoted) {
      if (quoted.text) {
        inputText = quoted.text.trim();
      } else {
        const text =
          novaWrap("Slang Translator", [
            `Status: *Format tidak didukung*`,
            ``,
            `Reply *teks* atau *voice note* yang ingin diterjemahkan.`,
            `Atau ketik langsung: *${prefix}slangtranslate <teks>*`,
          ].join("\n"));
        await m.reply(text);
        return { handled: true };
      }

    // ─── Mode 3: Teks langsung dari command ───
    } else {
      const raw = m.text?.trim() || "";
      inputText = raw
        .replace(new RegExp(`^${prefix}slangtranslate\\s+`, "i"), "")
        .replace(new RegExp(`^${prefix}slangtr\\s+`, "i"), "")
        .replace(new RegExp(`^${prefix}sltr\\s+`, "i"), "")
        .trim();
    }

    // ─── Validasi input ───
    if (!inputText || inputText.length < 2) {
      const text = novaGuide(
        "slangtranslate",
        `Reply pesan teks/VN yang mau diterjemahkan, lalu ketik ${prefix}slangtranslate\nAtau ketik langsung ${prefix}slangtranslate <teks>`,
        `${prefix}slangtranslate that's cap fr fr\n${prefix}slangtranslate ngap sih lo\nReply VN bahasa Sunda → .slangtranslate`
      );
      await m.reply(text);
      return { handled: true };
    }

    // Batasi panjang input
    if (inputText.length > 2000) {
      inputText = inputText.slice(0, 2000);
    }

    // ─── AI Slang Translation ───
    const systemPrompt = `Kamu adalah ahli linguistik budaya dan penerjemah slang. Tugasmu menganalisis teks yang mengandung slang, idiom, bahasa gaul, atau dialek daerah, lalu memberikan terjemahan beserta konteks budayanya.

Aturan output HARUS persis format ini (gunakan bahasa Indonesia):

ARTI HARFIAH:
[Terjemahan kata demi kata atau terjemahan literal]

ARTI SEBENARNYA:
[Makna sebenarnya dalam konteks percakapan sehari-hari]

KONTEKS BUDAYA:
[Penjelasan singkat asal-usul slang/idiom, siapa yang pakai, dan kapan dipakai]

BAHASA ASAL:
[Nama bahasa/dialek slang tersebut, misal: English Gen Z, Sunda kasar, Jawa ngoko, dll]

TINGKAT FORMALITAS:
[Santai/Formal/Kasar - pilih satu]

CONTOH PEMAKAIAN:
[Contoh kalimat menggunakan slang tersebut dalam konteks]

Aturan:
1. Jika teks sudah bahasa Indonesia baku tanpa slang, tetap analisis dan jelaskan itu bahasa formal
2. Jika teks mengandung multiple slang, jelaskan masing-masing
3. Sistematis dan ringkas, jangan bertele-tele
4. Untuk slang daerah Indonesia (Sunda, Jawa, Betawi, Minang, dll), jelaskan nuansa halus-kasarnya
5. Untuk slang internet/Gen Z (English), jelaskan era dan platform asalnya`;

    try {
      const reply = await callAI({
        providerKey: "ikyy_gemini",
        model: aiConfig.model || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Terjemahkan dan jelaskan slang/idiom dari teks berikut:\n\n"${inputText}"` },
        ],
        apiKey: aiConfig.apiKey,
        apiEndpoint: aiConfig.apiEndpoint,
        temperature: 0.3,
        maxTokens: 1024,
      });

      // Parse AI response into sections
      const sections = {};
      const labels = ["ARTI HARFIAH", "ARTI SEBENARNYA", "KONTEKS BUDAYA", "BAHASA ASAL", "TINGKAT FORMALITAS", "CONTOH PEMAKAIAN"];

      for (const label of labels) {
        const regex = new RegExp(`${label}:\\s*\\n?([\\s\\S]*?)(?=\\n\\n[A-Z]|$)`, "i");
        const match = reply.match(regex);
        sections[label] = match ? match[1].trim() : "-";
      }

      // Detect language for emoji
      let langFlag = "🌐";
      const langText = (sections["BAHASA ASAL"] || "").toLowerCase();
      if (langText.includes("english") || langText.includes("amerika") || langText.includes("inggris")) langFlag = "🇺🇸";
      else if (langText.includes("sunda")) langFlag = "⛰️";
      else if (langText.includes("jawa")) langFlag = "🏝️";
      else if (langText.includes("betawi")) langFlag = "🏛️";
      else if (langText.includes("minang")) langFlag = "🏞️";
      else if (langText.includes("indonesia")) langFlag = "🇮🇩";
      else if (langText.includes("jepang") || langText.includes("japanese")) langFlag = "🇯🇵";
      else if (langText.includes("korea") || langText.includes("korean")) langFlag = "🇰🇷";
      else if (langText.includes("arab")) langFlag = "🇸🇦";

      // Formalitas emoji
      let formalEmoji = "🟢";
      const formalText = (sections["TINGKAT FORMALITAS"] || "").toLowerCase();
      if (formalText.includes("kasar")) formalEmoji = "🔴";
      else if (formalText.includes("santai") || formalText.includes("gaul")) formalEmoji = "🟡";
      else if (formalText.includes("formal")) formalEmoji = "🔵";

      // Truncate input for display
      const displayInput = inputText.length > 100 ? inputText.slice(0, 100) + "..." : inputText;

      // Add VN indicator if from voice note
      const sourceLabel = isAudio ? `🎙️ (dari Voice Note)` : "";

      const text =
        novaWrap("Slang Translator", [
          `${langFlag} Teks Asli ${sourceLabel}:`,
          `"${displayInput}"`,
          ``,
          `📖 Arti Harfiah:`,
          `${sections["ARTI HARFIAH"]}`,
          ``,
          `🎯 Arti Sebenarnya:`,
          `${sections["ARTI SEBENARNYA"]}`,
          ``,
          `🏛️ Konteks Budaya:`,
          `${sections["KONTEKS BUDAYA"]}`,
          ``,
          `🔤 Bahasa Asal:`,
          `${sections["BAHASA ASAL"]}`,
          ``,
          `${formalEmoji} Tingkat Formalitas:`,
          `${sections["TINGKAT FORMALITAS"]}`,
          ``,
          `✍️ Contoh Pemakaian:`,
          `${sections["CONTOH PEMAKAIAN"]}`,
        ].join("\n")) +
        "\n" +
        tipText(`Reply teks/VN lain + ${prefix}slangtranslate untuk terjemahkan lagi`);

      await m.reply(text);
    } catch (error) {
      const text =
        novaWrap("Slang Translator - Error", [
          `Status: *Gagal*`,
          `Alasan: *${error.message}*`,
          ``,
          `Cek apakah AI API key masih valid.`,
          `Owner: *${prefix}aihelp* untuk cek konfigurasi.`,
        ].join("\n"));
      await m.reply(text);
    }

    return { handled: true };
  },
};
