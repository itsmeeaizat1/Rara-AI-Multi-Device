// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
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
import { getApiKey } from "../../src/lib/nova-api-keys.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import { ttsGeneration, ttsVoiceList, vitsLanguages, vitsModels, vitsTtsGenerate, animeSpeech, animeSpeakerIds } from "../../src/lib/nova-onepunya.js";

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

async function sendAudio(m, sock, url, fileName, mimetype = "audio/mpeg") {
  try {
    const dl = await axios.get(url, { responseType: "arraybuffer", timeout: 120_000 });
    await sock.sendMessage(m.chat, { audio: Buffer.from(dl.data), mimetype, ptt: true, fileName }, { quoted: m });
  } catch {
    await sock.sendMessage(m.chat, { document: { url }, fileName, mimetype }, { quoted: m });
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
      if (!filtered.length) return m.reply(novaWrap("Onepunya TTS", "Gak ada voice cocok."));
      let out = `🗣 Voice tersedia (${filtered.length})\n\n`;
      filtered.slice(0, 30).forEach(v => { out += `${v.shortName} · ${v.gender}\n`; });
      if (filtered.length > 30) out += `... dan ${filtered.length - 30} lagi (filter: .onettvoices id-)\n`;
      return m.reply(novaWrap("Onepunya TTS", out));
    }

    // ── VITS bahasa ──
    if (cmd === "onevitslang") {
      const res = await vitsLanguages(apiKey);
      const langs = res?.languages || [];
      if (!langs.length) return m.reply(novaWrap("Onepunya TTS", "Gak nemu daftar bahasa."));
      let out = `🌍 VITS: ${res?.total || langs.length} bahasa\n\n`;
      out += langs.slice(0, 60).join(", ");
      return m.reply(novaWrap("Onepunya TTS", out));
    }

    // ── VITS model per bahasa ──
    if (cmd === "onevitsmodel") {
      const lang = text || "Indonesian";
      const res = await vitsModels(apiKey, lang);
      const choices = res?.default_model?.choices || [];
      if (!choices.length) return m.reply(novaWrap("Onepunya TTS", `Gak nemu model buat bahasa: ${lang}`));
      let out = `🎛 Model VITS — ${res?.language || lang}\n\n`;
      choices.slice(0, 15).forEach((c, i) => { out += `${i + 1}. ${Array.isArray(c) ? c[0] : c}\n`; });
      return m.reply(novaWrap("Onepunya TTS", out));
    }

    // ── daftar speaker id anime ──
    if (cmd === "oneanimesid") {
      const list = await animeSpeakerIds(apiKey);
      const kw = text.toLowerCase();
      const filtered = (Array.isArray(list) ? list : []).filter(s => !kw || String(s.name || "").toLowerCase().includes(kw));
      if (!filtered.length) return m.reply(novaWrap("Onepunya TTS", "Gak ada speaker cocok."));
      let out = `🎌 Speaker anime (${filtered.length})\n\n`;
      filtered.slice(0, 25).forEach(s => {
        const styles = (s.styles || []).map(x => x.id).join(",");
        out += `ID ${s.speakerId}: ${String(s.name || "").trim().slice(0, 25)}${styles ? " (style: " + styles + ")" : ""}\n`;
      });
      return m.reply(novaWrap("Onepunya TTS", out));
    }

    // ── ms-neural TTS ──
    if (cmd === "onettts") {
      const [voicePart, ...rest] = text.split("|");
      if (!rest.length) {
        return m.reply(novaWrap("Onepunya TTS", `Format: .onettts <voice>|<teks>\n\nContoh: .onettts id-ID-ArdiNeural|selamat pagi\n\nDaftar voice: .onettvoices [id-]`));
      }
      const voice = (voicePart || "").trim() || "id-ID-ArdiNeural";
      const teks = rest.join("|").trim();
      const res = await ttsGeneration(apiKey, teks, voice);
      const url = res?.url || "";
      if (!url) throw new Error("Server gak balikin audio.");
      return sendAudio(m, sock, url, `onepunya-tts.mp3`, "audio/mpeg");
    }

    // ── VITS TTS ──
    if (cmd === "onevits") {
      if (!text) return m.reply(novaWrap("Onepunya TTS", `Format: .onevits <teks>\n\nContoh: .onevits selamat pagi semuanya`));
      const res = await vitsTtsGenerate(apiKey, { language: "Indonesian", model: DEFAULT_VITS_MODEL, text, sid: 10, speed: 1 });
      const url = res?.url || res?.audio_url || "";
      if (!url) throw new Error("Server gak balikin audio (engine VITS upstream-nya kadang sibuk — coba lagi).");
      return sendAudio(m, sock, url, `onepunya-vits.wav`, "audio/wav");
    }

    // ── anime speech ──
    if (cmd === "oneanime" || cmd === "oneanimetts") {
      const [sidPart, ...rest] = text.split("|");
      if (!rest.length) {
        return m.reply(novaWrap("Onepunya TTS", `Format: .oneanime <speaker_id>|<teks>\n\nContoh: .oneanime 100|ohayou gozaimasu\n\nDaftar speaker: .oneanimesid`));
      }
      const sid = parseInt((sidPart || "100").trim(), 10);
      if (isNaN(sid)) throw new Error("Speaker id harus angka. Lihat daftar: .oneanimesid");
      const teks = rest.join("|").trim();
      const res = await animeSpeech(apiKey, teks, sid);
      const url = res?.url || "";
      if (!url) throw new Error("Server gak balikin audio.");
      return sendAudio(m, sock, url, `onepunya-anime.wav`, "audio/wav");
    }
  } catch (e) {
    return m.reply(novaWrap("Onepunya TTS", `Gagal: ${String(e.message || e).slice(0, 200)}`));
  }
}

export { pluginConfig as config, handler };
