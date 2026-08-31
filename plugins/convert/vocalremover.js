// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { uploadToCatbox } from "../../src/lib/nova-uploader.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "vocalremover",
  alias: ["vocalremover"],
  aliases: ["vocalremover", "instrumenremover", "vocalremove", "instrumental"],
  category: "convert",
  description: "Pisahkan vocal dan instrumental dari audio",
  usage: ".vocalremover (reply audio) | .instrumenremover (reply audio)",
  example: ".vocalremover",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 30, energi: 3, isEnabled: true,
};

async function handler(m, { sock, command }) {
  try {
    const quoted = m.quoted;
    if (!quoted) return m.reply(claraWrap("vocalremover", "Reply audio dengan caption .vocalremover atau .instrumenremover", "guide"));

    const isAudio = quoted.type === "audioMessage" || quoted.type === "pttMessage" || quoted.mtype === "audioMessage" || quoted.mtype === "pttMessage";
    if (!isAudio) return m.reply(claraWrap("vocalremover", "Reply harus audio/voice note!", "guide"));

    await m.react("🕒");

    const mediaBuffer = await quoted.download();
    if (!mediaBuffer) { await m.react("❌"); return m.reply(claraWrap("vocalremover", "Gagal mengunduh audio.")); }

    if (mediaBuffer.length > 5 * 1024 * 1024) { await m.react("❌"); return m.reply(claraWrap("vocalremover", "Ukuran audio terlalu besar, maksimal 5MB.")); }

    const link = await uploadToCatbox(mediaBuffer, "audio.mp3");
    const apiUrl = `https://api.betabotz.eu.org/api/tools/voiceremover?url=${link}&apikey=beta-gilang`;
    const res = await axios.get(apiUrl, { timeout: 120000 });

    if (!res.data?.status) { await m.react("❌"); return m.reply(claraWrap("vocalremover", "Gagal memproses audio dari API.")); }

    await m.react("🐣");

    // vocalremover → kirim instrumental | instrumenremover → kirim vocal
    const isVocalRemover = command === "vocalremover" || command === "vocalremove";
    const resultUrl = isVocalRemover
      ? res.data.result.instrumental_path
      : res.data.result.vocal_path;

    const fileName = isVocalRemover ? "instrumental.mp3" : "vocal.mp3";
    const caption = isVocalRemover ? "🎵 Instrumental (tanpa vocal)" : "🎤 Vocal saja (tanpa instrumental)";

    await sock.sendMessage(m.chat, {
      audio: { url: resultUrl },
      mimetype: "audio/mpeg",
      fileName: fileName,
      caption: caption,
    }, { quoted: m });
  } catch (e) {
    console.error("vocalremover error:", e.message);
    await m.react("❌");
    m.reply(claraWrap("vocalremover", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
