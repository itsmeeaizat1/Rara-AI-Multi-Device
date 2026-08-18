// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { queueFFmpeg } from '../../src/lib/nova-ffmpeg.js'
import { claraWrap } from '../../src/lib/nova-menu-style.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

const pluginConfig = {
  name: "audioconvert",
  aliases: ["audioconvert", "audio2audio", "konversiaudio", "audioformat"],
  category: "convert",
  description: "Convert audio ke audio format lain (10+ format)",
  usage: ".audioconvert <format> (reply audio) | format: mp3, wav, flac, aac, m4a, ogg, opus, wma, ac3, amr",
  isGroupOnly: false,
};

const FORMATS = {
  mp3:  { codec: "libmp3lame",      ext: "mp3",  mime: "audio/mpeg",      desc: "MP3 (universal)" },
  wav:  { codec: "pcm_s16le",       ext: "wav",  mime: "audio/wav",       desc: "WAV (uncompressed)" },
  flac: { codec: "flac",            ext: "flac", mime: "audio/flac",      desc: "FLAC (lossless)" },
  aac:  { codec: "aac",             ext: "aac",  mime: "audio/aac",       desc: "AAC (efficient)" },
  m4a:  { codec: "aac",             ext: "m4a",  mime: "audio/mp4",       desc: "M4A (Apple)" },
  ogg:  { codec: "libvorbis",       ext: "ogg",  mime: "audio/ogg",       desc: "OGG Vorbis" },
  opus: { codec: "libopus",         ext: "opus", mime: "audio/opus",      desc: "Opus (low bitrate)" },
  wma:  { codec: "wmav2",           ext: "wma",  mime: "audio/x-ms-wma",   desc: "WMA (Windows)" },
  ac3:  { codec: "ac3",             ext: "ac3",  mime: "audio/ac3",       desc: "AC3 (Dolby)" },
  amr:  { codec: "libopencore_amrnb", ext: "amr", mime: "audio/amr",      desc: "AMR (mobile)" },
  aiff: { codec: "pcm_s16le",       ext: "aiff", mime: "audio/aiff",      desc: "AIFF (Apple)" },
  au:   { codec: "pcm_s16le",       ext: "au",   mime: "audio/basic",     desc: "AU (Sun)" },
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return m.reply(claraWrap("Audio Convert", "Reply audio yang mau di-convert."));
    const audioMsg = quoted.audioMessage || quoted.pttMessage || quoted.documentMessage;
    if (!audioMsg) return m.reply(claraWrap("Audio Convert", "Reply harus audio/voice note!"));

    const format = (args[0] || "").toLowerCase();
    if (!format || !FORMATS[format]) {
      const list = Object.entries(FORMATS).map(([k, v]) => k + " - " + v.desc).join("\n");
      return m.reply(claraWrap("Audio Convert", [
        "Format tujuan harus diisi!",
        "Format tersedia:",
        list,
        "",
        "Contoh: " + usedPrefix + "audioconvert mp3",
      ].join("\n")));
    }

    const fmt = FORMATS[format];
    const isPttInput = !!quoted.pttMessage;
    const tmpDir = path.join(os.tmpdir(), 'nova-audioconvert');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const inputExt = isPttInput ? "ogg" : (quoted.audioMessage?.mimetype?.split("/")[1] || "mp3");
    const inputPath = path.join(tmpDir, "input_" + Date.now() + "." + inputExt);
    const outputPath = path.join(tmpDir, "output_" + Date.now() + "." + fmt.ext);

    const buffer = await conn.downloadMediaMessage({ key: { remoteJid: m.key.remoteJid, id: m.quoted && m.quoted.id }, message: quoted });
    fs.writeFileSync(inputPath, buffer);

    let extraFlags = "";
    if (format === "amr") extraFlags = " -ar 8000 -ac 1";
    if (format === "opus") extraFlags = " -ar 48000";
    if (format === "ac3") extraFlags = " -ar 48000 -ac 2";
    if (format === "aiff" || format === "au") extraFlags = " -ar 44100 -ac 2";

    await queueFFmpeg('ffmpeg -y -i "' + inputPath + '" -c:a ' + fmt.codec + extraFlags + ' -q:a 2 "' + outputPath + '"');

    if (!fs.existsSync(outputPath)) {
      return m.reply(claraWrap("Audio Convert", "Gagal convert audio."));
    }

    const buf = fs.readFileSync(outputPath);
    const isPtt = format === "ogg" || format === "opus";
    await conn.sendMessage(m.key.remoteJid, {
      audio: buf,
      mimetype: fmt.mime,
      ptt: isPtt,
      caption: claraWrap("Audio Convert", [
        "Berhasil convert!",
        "Format: " + format.toUpperCase() + " (" + fmt.desc + ")",
        "Codec: " + fmt.codec,
        "Size: " + (buf.length / 1024).toFixed(0) + " KB",
      ].join("\n")),
    });

    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
  } catch (e) {
    console.error("audioconvert error:", e);
    return m.reply("Error: " + e.message);
  }
}

export default { pluginConfig, handler };
