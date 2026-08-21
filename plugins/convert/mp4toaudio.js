// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { queueFFmpeg } from '../../src/lib/nova-ffmpeg.js'
import { claraWrap } from '../../src/lib/nova-menu-style.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

const pluginConfig = {
  name: "mp4toaudio",
  aliases: ["mp4toaudio", "vidtoaudio", "videokeaudio", "extractaud"],
  category: "convert",
  description: "Extract audio dari video/MP4 ke berbagai format audio",
  usage: ".mp4toaudio <format> (reply video) | format: mp3, wav, flac, aac, m4a, ogg, opus, wma",
  isGroupOnly: false,
};

const AUDIO_FORMATS = {
  mp3: { codec: "libmp3lame", ext: "mp3", mime: "audio/mpeg", desc: "MP3 (universal)" },
  wav: { codec: "pcm_s16le", ext: "wav", mime: "audio/wav", desc: "WAV (uncompressed)" },
  flac: { codec: "flac", ext: "flac", mime: "audio/flac", desc: "FLAC (lossless)" },
  aac: { codec: "aac", ext: "aac", mime: "audio/aac", desc: "AAC (efficient)" },
  m4a: { codec: "aac", ext: "m4a", mime: "audio/mp4", desc: "M4A (Apple)" },
  ogg: { codec: "libvorbis", ext: "ogg", mime: "audio/ogg", desc: "OGG Vorbis" },
  opus: { codec: "libopus", ext: "opus", mime: "audio/opus", desc: "Opus (low bitrate)" },
  wma: { codec: "wmav2", ext: "wma", mime: "audio/x-ms-wma", desc: "WMA (Windows)" },
  ac3: { codec: "ac3", ext: "ac3", mime: "audio/ac3", desc: "AC3 (Dolby)" },
  amr: { codec: "libopencore_amrnb", ext: "amr", mime: "audio/amr", desc: "AMR (mobile)" },
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return m.reply(claraWrap("MP4 to Audio", "Reply video yang mau di-extract audionya."));
    const videoMsg = quoted.videoMessage || quoted.documentMessage;
    if (!videoMsg) return m.reply(claraWrap("MP4 to Audio", "Reply harus video/document video!"));

    const format = (args[0] || "mp3").toLowerCase();
    if (!AUDIO_FORMATS[format]) {
      const list = Object.entries(AUDIO_FORMATS).map(([k, v]) => k + " - " + v.desc).join("\n");
      return m.reply(claraWrap("MP4 to Audio", [
        "Format tidak didukung!",
        "Format tersedia:",
        list,
        "",
        "Contoh: " + usedPrefix + "mp4toaudio mp3",
      ].join("\n")));
    }

    const fmt = AUDIO_FORMATS[format];
    const tmpDir = path.join(os.tmpdir(), 'nova-mp4toaudio');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const inputPath = path.join(tmpDir, "input_" + Date.now() + ".mp4");
    const outputPath = path.join(tmpDir, "output_" + Date.now() + "." + fmt.ext);

    const buffer = await conn.downloadMediaMessage({ key: { remoteJid: m.key.remoteJid, id: m.quoted && m.quoted.id }, message: quoted });
    fs.writeFileSync(inputPath, buffer);

    let extraFlags = "";
    if (format === "amr") extraFlags = " -ar 8000 -ac 1";
    if (format === "opus") extraFlags = " -ar 48000";
    if (format === "ac3") extraFlags = " -ar 48000 -ac 2";

    await queueFFmpeg('ffmpeg -y -i "' + inputPath + '" -vn -c:a ' + fmt.codec + extraFlags + ' -c:a libopus -b:a 64k "' + outputPath + '"');

    if (!fs.existsSync(outputPath)) {
      return m.reply(claraWrap("MP4 to Audio", "Gagal extract audio dari video."));
    }

    const buf = fs.readFileSync(outputPath);
    const isPtt = format === "ogg" || format === "opus";
    await conn.sendMessage(m.key.remoteJid, {
      audio: buf,
      mimetype: fmt.mime,
      ptt: isPtt,
      caption: claraWrap("MP4 to Audio", [
        "Berhasil extract audio!",
        "Format: " + format.toUpperCase() + " (" + fmt.desc + ")",
        "Codec: " + fmt.codec,
        "Size: " + (buf.length / 1024).toFixed(0) + " KB",
      ].join("\n")),
    });

    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
  } catch (e) {
    console.error("mp4toaudio error:", e);
    return m.reply("Error: " + e.message);
  }
}

export default { pluginConfig, handler };
