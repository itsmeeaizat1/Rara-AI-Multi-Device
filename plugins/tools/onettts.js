// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// onettts.js — Onepunya API: 3 engine TTS + pendukungnya.
// .onettts <voice>|<teks>      — Microsoft Neural TTS (voice id-ID-ArdiNeural dll)
// .onettvoices [keyword]       — daftar voice tersedia (filter keyword opsional)
// .onevits <teks>              — VITS TTS (default bahasa Indonesia)
// .onevitslang                — daftar bahasa VITS (53)
// .onevitsmodel <bahasa>       — daftar model VITS per bahasa
// .oneanime <sid>|<teks>       — suara anime jepang (speaker id)
// .oneanimesid [keyword]       — daftar speaker id anime
// Sumber: onepunya.qzz.io (key .setkey onepunya).
import axios from "axios";
import { getApiKey } from "../../src/lib/rara-api-keys.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { ttsGeneration, ttsVoiceList, vitsLanguages, vitsModels, vitsTtsGenerate, animeSpeech, animeSpeakerIds } from "../../src/lib/rara-onepunya.js";
import { mediaInfoCaption } from "../../src/lib/rara-media-info.js";

const pluginConfig = {
  name: "onettts",
  alias: ["onettts", "onettvoices", "onevits", "onevitslang", "onevitsmodel", "oneanime", "oneanimesid", "oneanimetts"],
  category: "tools",
  description: "Text-to-speech via Onepunya API: suara Indonesia, VITS multi-bahasa, suara anime",
  usage: ".onettts <voice>|<teks> · .onevits <teks> · .oneanime <sid>|<teks>",
  example: ".onettts id-ID-ArdiNeural|selamat pagi",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 12,
  energi: 3,
  isEnabled: true,
};

const DEFAULT_VITS_MODEL = "csukuangfj/vits-piper-id_ID-news_tts-medium";

async function sendAudio(m, sock, url, fileName, mimetype = "audio/mpeg", info = null) {
  let size = 0, asDoc = false;
  try {
    const dl = await axios.get(url, { responseType: "arraybuffer", timeout: 120_000 });
    const buf = Buffer.from(dl.data); size = buf.length;
    await sock.sendMessage(m.chat, { audio: buf, mimetype, ptt: true, fileName }, { quoted: m });
  } catch {
    asDoc = true;
    await sock.sendMessage(m.chat, { document: { url }, fileName, mimetype }, { quoted: m });
  }
  if (info) {
    await m.reply(mediaInfoCaption({ header: "Onepunya TTS", fields: [
      { label: "Input", value: "Teks (" + info.chars + " karakter)" },
      { label: "Mode", value: info.mode },
      { label: info.voiceLabel, value: info.voice },
      { label: "Engine", value: "Onepunya API" },
      { label: "Hasil", value: (asDoc ? "Dokumen audio " : "Voice note ") + (mimetype === "audio/wav" ? "(WAV)" : "(MP3)") },
      { label: "Ukuran", value: size ? (size / 1024).toFixed(1) + " KB" : "" },
    ] }));
  }
}

async function handler(m, { sock }) {
  const cmd = (m.command || "").toLowerCase();
  const args = m.args || [];
  const text = args.join(" ").trim();
  const apiKey = getApiKey("onepunya");

  try {
    // ── daftar voice ms-neural ──
    if (cmd === "onettvoices") {
      const list = await ttsVoiceList(apiKey);
      const kw = text.toLowerCase();
      const filtered = (Array.isArray(list) ? list : []).filter(v => !kw || (v.shortName || "").toLowerCase().includes(kw) || (v.locale || "").toLowerCase().includes(kw));
      if (!filtered.length) return m.reply(raraWrap("Onepunya TTS", "Gak ada voice cocok."));
      let out = `🗣 Voice tersedia (${filtered.length})\n\n`;
      filtered.slice(0, 30).forEach(v => { out += `${v.shortName} · ${v.gender}\n`; });
      if (filtered.length > 30) out += `... dan ${filtered.length - 30} lagi (filter: .onettvoices id-)\n`;
      return m.reply(raraWrap("Onepunya TTS", out));
    }

    // ── VITS bahasa ──
    if (cmd === "onevitslang") {
      const res = await vitsLanguages(apiKey);
      const langs = res?.languages || [];
      if (!langs.length) return m.reply(raraWrap("Onepunya TTS", "Gak nemu daftar bahasa."));
      let out = `🌍 VITS: ${res?.total || langs.length} bahasa\n\n`;
      out += langs.slice(0, 60).join(", ");
      return m.reply(raraWrap("Onepunya TTS", out));
    }

    // ── VITS model per bahasa ──
    if (cmd === "onevitsmodel") {
      const lang = text || "Indonesian";
      const res = await vitsModels(apiKey, lang);
      const choices = res?.default_model?.choices || [];
      if (!choices.length) return m.reply(raraWrap("Onepunya TTS", `Gak nemu model buat bahasa: ${lang}`));
      let out = `🎛 Model VITS — ${res?.language || lang}\n\n`;
      choices.slice(0, 15).forEach((c, i) => { out += `${i + 1}. ${Array.isArray(c) ? c[0] : c}\n`; });
      return m.reply(raraWrap("Onepunya TTS", out));
    }

    // ── daftar speaker id anime ──
    if (cmd === "oneanimesid") {
      const list = await animeSpeakerIds(apiKey);
      const kw = text.toLowerCase();
      const filtered = (Array.isArray(list) ? list : []).filter(s => !kw || String(s.name || "").toLowerCase().includes(kw));
      if (!filtered.length) return m.reply(raraWrap("Onepunya TTS", "Gak ada speaker cocok."));
      let out = `🎌 Speaker anime (${filtered.length})\n\n`;
      filtered.slice(0, 25).forEach(s => {
        const styles = (s.styles || []).map(x => x.id).join(",");
        out += `ID ${s.speakerId}: ${String(s.name || "").trim().slice(0, 25)}${styles ? " (style: " + styles + ")" : ""}\n`;
      });
      return m.reply(raraWrap("Onepunya TTS", out));
    }

    // ── ms-neural TTS ──
    if (cmd === "onettts") {
      const [voicePart, ...rest] = text.split("|");
      if (!rest.length) {
        return m.reply(raraWrap("Onepunya TTS", `Format: .onettts <voice>|<teks>\n\nContoh: .onettts id-ID-ArdiNeural|selamat pagi\n\nDaftar voice: .onettvoices [id-]`));
      }
      const voice = (voicePart || "").trim() || "id-ID-ArdiNeural";
      const teks = rest.join("|").trim();
      const res = await ttsGeneration(apiKey, teks, voice);
      const url = res?.url || "";
      if (!url) throw new Error("Server gak balikin audio.");
      return sendAudio(m, sock, url, `onepunya-tts.mp3`, "audio/mpeg", { chars: teks.length, mode: "TTS suara", voiceLabel: "Suara", voice });
    }

    // ── VITS TTS ──
    if (cmd === "onevits") {
      if (!text) return m.reply(raraWrap("Onepunya TTS", `Format: .onevits <teks>\n\nContoh: .onevits selamat pagi semuanya`));
      const res = await vitsTtsGenerate(apiKey, { language: "Indonesian", model: DEFAULT_VITS_MODEL, text, sid: 10, speed: 1 });
      const url = res?.url || res?.audio_url || "";
      if (!url) throw new Error("Server gak balikin audio (engine VITS upstream-nya kadang sibuk — coba lagi).");
      return sendAudio(m, sock, url, `onepunya-vits.wav`, "audio/wav", { chars: text.length, mode: "VITS Indonesia", voiceLabel: "Model", voice: DEFAULT_VITS_MODEL.split("/").pop() });
    }

    // ── anime speech ──
    if (cmd === "oneanime" || cmd === "oneanimetts") {
      const [sidPart, ...rest] = text.split("|");
      if (!rest.length) {
        return m.reply(raraWrap("Onepunya TTS", `Format: .oneanime <speaker_id>|<teks>\n\nContoh: .oneanime 100|ohayou gozaimasu\n\nDaftar speaker: .oneanimesid`));
      }
      const sid = parseInt((sidPart || "100").trim(), 10);
      if (isNaN(sid)) throw new Error("Speaker id harus angka. Lihat daftar: .oneanimesid");
      const teks = rest.join("|").trim();
      const res = await animeSpeech(apiKey, teks, sid);
      const url = res?.url || "";
      if (!url) throw new Error("Server gak balikin audio.");
      return sendAudio(m, sock, url, `onepunya-anime.wav`, "audio/wav", { chars: teks.length, mode: "Suara anime", voiceLabel: "Speaker ID", voice: String(sid) });
    }
  } catch (e) {
    return m.reply(raraWrap("Onepunya TTS", `Gagal: ${String(e.message || e).slice(0, 200)}`));
  }
}

export { pluginConfig as config, handler };
