// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { separateStems } from "../../src/lib/nova-stemsplit.js";
import te from "../../src/lib/nova-error.js";
import { novaWrap, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";
import { mediaInfoCaption } from "../../src/lib/nova-media-info.js";

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
    if (!quoted) return m.reply(novaWrap("vocalremover", "Reply audio dengan caption .vocalremover atau .instrumenremover", "guide"));

    const isAudio = quoted.type === "audioMessage" || quoted.type === "pttMessage" || quoted.mtype === "audioMessage" || quoted.mtype === "pttMessage";
    if (!isAudio) return m.reply(novaWrap("vocalremover", "Reply harus audio/voice note!", "guide"));

    await m.react("🕒");

    const mediaBuffer = await quoted.download();
    if (!mediaBuffer) { await m.react("❌"); return m.reply(novaWrap("vocalremover", "Gagal mengunduh audio.")); }

    if (mediaBuffer.length > 5 * 1024 * 1024) { await m.react("❌"); return m.reply(novaWrap("vocalremover", "Ukuran audio terlalu besar, maksimal 5MB.")); }

    const stems = await separateStems(mediaBuffer, { filename: "audio.mp3", contentType: "audio/mpeg" });
    await m.react("🐣");

    // vocalremover → kirim instrumental | instrumenremover → kirim vocal
    const isVocalRemover = command === "vocalremover" || command === "vocalremove";
    const resultUrl = isVocalRemover ? stems.instrumental : stems.vocals;

    const fileName = isVocalRemover ? "instrumental.mp3" : "vocal.mp3";

    // format info hasil (request owner 19-20 Sep — field sesuai fitur)
    const caption = mediaInfoCaption({ header: "Nova Vocal Remover", fields: [
      { icon: "📥", label: "Input", value: "Audio" },
      { icon: "🎛️", label: "Mode", value: isVocalRemover ? "Instrumental (tanpa vocal)" : "Vocal saja (tanpa instrumental)" },
      { icon: "⚙️", label: "Engine", value: "StemSplit REST API" },
      { icon: "⬇️", label: "Hasil", value: "Audio MP3" },
    ] });

    await sock.sendMessage(m.chat, {
      audio: { url: resultUrl },
      mimetype: "audio/mpeg",
      fileName: fileName,
      caption: caption,
    }, { quoted: m });
  } catch (e) {
    console.error("vocalremover error:", e.message);
    await m.react("❌");
    m.reply(novaGangguan("vocalremover"));
  }
}

export { pluginConfig as config, handler };
