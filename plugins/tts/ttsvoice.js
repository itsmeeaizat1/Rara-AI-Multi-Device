// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import { claraWrap } from '../../src/lib/nova-menu-style.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

const pluginConfig = {
  name: "ttsvoice",
  aliases: ["ttsvoice", "ttscustom", "voicett", "sayvoice"],
  category: "tts",
  description: "Text To Speech custom dengan pilihan bahasa & suara (Google TTS)",
  usage: ".ttsvoice <lang> <teks> | .ttsvoice list | .ttsvoice id Halo semua",
  example: ".ttsvoice id Halo semua | .ttsvoice en Hello world | .ttsvoice ja Konnichiwa",
  isGroupOnly: false,
};

const VOICES = {
  "id": { name: "Indonesia", code: "id" },
  "en": { name: "English (US)", code: "en" },
  "en-uk": { name: "English (UK)", code: "en-gb" },
  "ja": { name: "Japanese", code: "ja" },
  "ko": { name: "Korean", code: "ko" },
  "zh": { name: "Chinese", code: "zh-CN" },
  "ar": { name: "Arabic", code: "ar" },
  "fr": { name: "French", code: "fr" },
  "de": { name: "German", code: "de" },
  "es": { name: "Spanish", code: "es" },
  "it": { name: "Italian", code: "it" },
  "pt": { name: "Portuguese", code: "pt" },
  "ru": { name: "Russian", code: "ru" },
  "th": { name: "Thai", code: "th" },
  "vi": { name: "Vietnamese", code: "vi" },
  "hi": { name: "Hindi", code: "hi" },
  "tr": { name: "Turkish", code: "tr" },
  "nl": { name: "Dutch", code: "nl" },
  "pl": { name: "Polish", code: "pl" },
  "sv": { name: "Swedish", code: "sv" },
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const lang = (args[0] || "").toLowerCase();
    const content = args.slice(1).join(" ").trim();

    if (!lang || lang === "list" || !content) {
      return m.reply(claraWrap("TTS Voice", [
        "Text To Speech dengan pilihan bahasa.",
        "",
        "Format: " + usedPrefix + "ttsvoice <lang> <teks>",
        "Daftar bahasa: " + usedPrefix + "ttsvoice list",
        "",
        "Contoh:",
        usedPrefix + "ttsvoice id Halo semuanya",
        usedPrefix + "ttsvoice en Hello world",
        usedPrefix + "ttsvoice ja Konnichiwa",
        usedPrefix + "ttsvoice ko Annyeong",
        "",
        "Bahasa tersedia: " + Object.keys(VOICES).join(", "),
      ].join("\n")));
    }

    if (!VOICES[lang]) {
      return m.reply(claraWrap("TTS Voice", [
        "Bahasa tidak tersedia: " + lang,
        "Daftar: " + Object.keys(VOICES).join(", "),
      ].join("\n")));
    }

    if (content.length > 500) {
      return m.reply(claraWrap("TTS Voice", "Teks maksimal 500 karakter."));
    }

    const voiceCode = VOICES[lang].code;
    const ttsUrl = "https://translate.google.com/translate_tts?ie=UTF-8&q=" + encodeURIComponent(content) + "&tl=" + voiceCode + "&client=tw-ob";

    const res = await axios.get(ttsUrl, {
      timeout: 10000,
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });

    if (!res.data || res.data.length < 100) {
      return m.reply(claraWrap("TTS Voice", "Gagal generate audio. Coba lagi."));
    }

    const tmpDir = path.join(os.tmpdir(), 'nova-ttsvoice');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const outPath = path.join(tmpDir, 'tts_' + Date.now() + '.mp3');
    fs.writeFileSync(outPath, res.data);

    const audioBuf = fs.readFileSync(outPath);
    await conn.sendMessage(m.key.remoteJid, {
      audio: audioBuf,
      mimetype: "audio/mpeg",
      ptt: true,
      caption: claraWrap("TTS Voice", [
        "Berhasil!",
        "Bahasa: " + VOICES[lang].name + " (" + lang + ")",
        "Teks: " + content.slice(0, 50) + (content.length > 50 ? "..." : ""),
      ].join("\n")),
    });

    fs.unlinkSync(outPath);
  } catch (e) {
    console.error("ttsvoice error:", e.message);
    return m.reply(claraWrap("TTS Voice", "Error: " + e.message));
  }
}

export default { pluginConfig, handler };
