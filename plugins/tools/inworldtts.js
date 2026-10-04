// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// inworldtts.js — Inworld AI: suara HD 200+ bahasa (platform.inworld.ai).
// .inworldtts [voice]|<teks>   — teks → voice note (voice opsional, default = voice custom workspace / katalog)
// .inworldvoice <deskripsi>|<teks> — DESAIN SUARA dari deskripsi bebas ("pria hangat kayak penyiar radio malam")
// .inworldvoices [keyword]    — daftar 285+ voice (filter keyword opsional)
// .inworldstt                 — reply voice note → transkrip + profil suara (gender/umur/emosi/aksen)
// Model: inworld-tts-2 (flagship, steering natural-language dalam [kurung siku],
// contoh: "Halo semuanya [nada antusias dan ceria] apa kabar?").
// Key: .setkey inworld <key> (dari https://platform.inworld.ai/api-keys)
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
import {
  inworldSynthesize, inworldListVoices, resolveDefaultVoice, inworldTranscribe, getInworldKey,
} from "../../src/lib/rara-inworld.js";

const pluginConfig = {
  name: "inworldtts",
  alias: ["inworldtts", "inworldvoice", "inworldvoices", "inworldstt", "inwtts", "inwvoice", "inwvoices", "inwstt"],
  category: "tools",
  description: "Inworld AI: TTS suara HD 200+ bahasa, desain suara dari deskripsi, STT voice note + profil suara",
  usage: ".inworldtts [voice]|<teks> · .inworldvoice <deskripsi>|<teks> · .inworldvoices [keyword] · .inworldstt (reply vn)",
  example: ".inworldtts halo semuanya, apa kabar? · .inworldvoice suara pria hangat kayak penyiar radio|selamat malam pendengar · .inworldstt (reply vn)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 12,
  energi: 3,
  isEnabled: true,
};

const MAX_TEXT = 2000;

async function sendVn(m, sock, buffer, mimetype = "audio/mpeg") {
  await sock.sendMessage(m.chat, { audio: buffer, mimetype, ptt: true }, { quoted: m });
  try {
    const info = await probeBuffer(buffer, { mime: mimetype });
    const card = mediaResultCard({
      header: "inworldtts",
      type: "audio",
      size: info.size, mime: info.mime, duration: info.duration,
    });
    if (card) await m.reply(card);
  } catch { /* best-effort */ }
}

async function handler(m, { sock }) {
  const cmd = (m.command || "").toLowerCase();
  const args = m.args || [];
  const text = args.join(" ").trim();

  if (!getInworldKey()) {
    return m.reply(raraWrap("Inworld AI", "API key Inworld belum di-set.\n\nCara: .setkey inworld <key>\nAmbil key: https://platform.inworld.ai/api-keys"));
  }

  try {
    // ── daftar voice ──
    if (cmd === "inworldvoices" || cmd === "inwvoices") {
      const voices = await inworldListVoices({ force: true });
      const kw = text.toLowerCase();
      const filtered = voices.filter(v =>
        !kw ||
        String(v.displayName || "").toLowerCase().includes(kw) ||
        String(v.voiceId || "").toLowerCase().includes(kw) ||
        String(v.description || "").toLowerCase().includes(kw)
      );
      if (!filtered.length) return m.reply(raraWrap("Inworld AI", `Gak ada voice cocok buat: ${text}`));
      const custom = filtered.filter(v => v.isCustom);
      const catalog = filtered.filter(v => !v.isCustom);
      let out = "";
      if (custom.length) {
        out += `⭐ Voice custom workspace (${custom.length})\n`;
        custom.slice(0, 10).forEach(v => { out += `• ${v.voiceId} — ${v.displayName}\n`; });
        out += "\n";
      }
      out += `🗣️ Voice katalog (${catalog.length} cocok)\n`;
      catalog.slice(0, 25).forEach(v => {
        const langs = (v.languages || []).join(",");
        out += `• ${v.voiceId}${langs ? ` (${langs})` : ""} — ${String(v.description || v.displayName || "").slice(0, 60)}\n`;
      });
      if (catalog.length > 25) out += `\n... dan ${catalog.length - 25} lagi — filter: .inworldvoices <keyword>\n`;
      return m.reply(raraWrap("Inworld AI", out));
    }

    // ── STT: reply voice note → transkrip ──
    if (cmd === "inworldstt" || cmd === "inwstt") {
      const q = m.quoted;
      const isAudio = q && ((q.mtype === "audioMessage") || q.msg?.ptt || (q.msg && q.msg.audioMessage));
      if (!isAudio) return m.reply(raraWrap("Inworld AI", "Reply voice note / audio-nya dulu ya.\n\nContoh: reply vn ketik .inworldstt"));
      const b = await q.download();
      if (!b || !b.length) return m.reply(raraWrap("Inworld AI", "Audio-nya gak kebaca, coba reply ulang."));
      const res = await inworldTranscribe({ audioB64: b.toString("base64"), encoding: "OGG_OPUS", language: "id" });
      if (!res.transcript) return m.reply(raraWrap("Inworld AI", "Gak ada ucapan yang kebaca di audio itu."));
      let out = `📝 Transkrip:\n"${res.transcript}"\n`;
      const p = res.profile || {};
      const bits = [];
      if (p.gender) bits.push("gender: " + p.gender);
      if (p.age) bits.push("umur: " + p.age);
      if (p.emotion) bits.push("emosi: " + p.emotion);
      if (p.accent) bits.push("aksen: " + p.accent);
      if (bits.length) out += `\n🎙️ Profil suara: ${bits.join(" · ")}\n`;
      return m.reply(raraWrap("Inworld AI", out));
    }

    // ── voice design: deskripsi suara bebas → TTS ──
    if (cmd === "inworldvoice" || cmd === "inwvoice") {
      const [desc, ...rest] = text.split("|");
      if (!rest.length || !String(desc).trim()) {
        return m.reply(raraWrap("Inworld AI",
          "Desain suara dari deskripsi bebas!\n\n" +
          "Format: .inworldvoice <deskripsi suara>|<teks>\n\n" +
          "Contoh:\n" +
          "• .inworldvoice suara pria dewasa hangat kayak penyiar radio malam|selamat malam pendengar\n" +
          "• .inworldvoice nenek gemes yang cerewet tapi sayang|makan dulu nak, jangan main melulu\n\n" +
          "Deskripsi 7-1000 karakter. Bahasa Indonesia bisa!"));
      }
      const teks = rest.join("|").trim().slice(0, MAX_TEXT);
      if (!teks) return m.reply(raraWrap("Inworld AI", "Teksnya kosong."));
      const res = await inworldSynthesize({ text: teks, designPrompt: String(desc).trim() });
      await sendVn(m, sock, res.buffer);
      return;
    }

    // ── TTS standar ──
    // .inworldtts <teks>            → voice default (custom workspace dulu)
    // .inworldtts <voice>|<teks>    → voice pilihan (lihat .inworldvoices)
    let voiceId = "";
    let teks = text;
    if (text.includes("|")) {
      const [v, ...rest] = text.split("|");
      voiceId = String(v).trim();
      teks = rest.join("|").trim();
    }
    if (!teks) {
      return m.reply(raraWrap("Inworld AI",
        "Teks → voice note kualitas HD (200+ bahasa, steering emosi di [kurung siku]).\n\n" +
        "Format:\n" +
        "• .inworldtts <teks>\n" +
        "• .inworldtts <voice>|<teks>\n\n" +
        "Contoh:\n" +
        "• .inworldtts halo semuanya, apa kabar hari ini?\n" +
        "• .inworldtts Halo! [nada antusias] selamat datang di grup!\n" +
        "• .inworldtts Daniel|good morning everyone\n\n" +
        "Daftar voice: .inworldvoices [keyword]\n" +
        "Desain suara custom: .inworldvoice <deskripsi>|<teks>"));
    }
    teks = teks.slice(0, MAX_TEXT);
    if (!voiceId) voiceId = await resolveDefaultVoice();
    const res = await inworldSynthesize({ text: teks, voiceId });
    await sendVn(m, sock, res.buffer);
  } catch (e) {
    m.reply(raraWrap("Inworld AI", String(e?.message || e), "error"));
  }
}

export { pluginConfig as config, handler };
