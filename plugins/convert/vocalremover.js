// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { separateStems } from "../../src/lib/rara-stemsplit.js";
import te from "../../src/lib/rara-error.js";
import { raraWrap, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

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
    if (!quoted) return m.reply(raraWrap("vocalremover", "Reply audio dengan caption .vocalremover atau .instrumenremover", "guide"));

    const isAudio = quoted.type === "audioMessage" || quoted.type === "pttMessage" || quoted.mtype === "audioMessage" || quoted.mtype === "pttMessage";
    if (!isAudio) return m.reply(raraWrap("vocalremover", "Reply harus audio/voice note!", "guide"));

    await m.react("🕒");

    const mediaBuffer = await quoted.download();
    if (!mediaBuffer) { await m.react("❌"); return m.reply(raraWrap("vocalremover", "Gagal mengunduh audio.")); }

    if (mediaBuffer.length > 5 * 1024 * 1024) { await m.react("❌"); return m.reply(raraWrap("vocalremover", "Ukuran audio terlalu besar, maksimal 5MB.")); }

    const stems = await separateStems(mediaBuffer, { filename: "audio.mp3", contentType: "audio/mpeg" });
    await m.react("🐣");

    // vocalremover → kirim instrumental | instrumenremover → kirim vocal
    const isVocalRemover = command === "vocalremover" || command === "vocalremove";
    const resultUrl = isVocalRemover ? stems.instrumental : stems.vocals;

    const fileName = isVocalRemover ? "instrumental.mp3" : "vocal.mp3";

    await sock.sendMessage(m.chat, {
      audio: { url: resultUrl },
      mimetype: "audio/mpeg",
      fileName: fileName,
    }, { quoted: m });

    try {
      const info = await probeMedia(resultUrl);
      const card = mediaResultCard({
        header: pluginConfig.name,
        type: "audio",
        request: [
          ["Input", "Audio"],
          ["Mode", isVocalRemover ? "Instrumental" : "Vocal"],
          ["Engine", "StemSplit REST API"],
        ],
        size: info.size,
        mime: info.mime || "audio/mpeg",
        duration: info.duration,
      });
      if (card) await m.reply(card);
    } catch { /* best-effort */ }
  } catch (e) {
    console.error("vocalremover error:", e.message);
    await m.react("❌");
    m.reply(raraGangguan("vocalremover"));
  }
}

export { pluginConfig as config, handler };
