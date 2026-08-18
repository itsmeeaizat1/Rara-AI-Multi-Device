// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { queueFFmpeg } from '../../src/lib/nova-ffmpeg.js'
import { claraWrap } from '../../src/lib/nova-menu-style.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

const pluginConfig = {
  name: "videoconvert",
  aliases: ["videoconvert", "video2video", "konversivideo", "videoformat"],
  category: "convert",
  description: "Convert video ke berbagai format video lain",
  usage: ".videoconvert <format> (reply video) | format: mp4, mkv, avi, mov, webm, flv, 3gp, wmv, gif, ts, ogv",
  isGroupOnly: false,
};

const FORMATS = {
  mp4:  { codec: "libx264",  ext: "mp4",  mime: "video/mp4",        audio: "aac",     desc: "MP4 (universal)", extra: "-preset fast -crf 23" },
  mkv:  { codec: "libx264",  ext: "mkv",  mime: "video/x-matroska", audio: "aac",     desc: "MKV (Matroska)",  extra: "-preset fast -crf 23" },
  avi:  { codec: "mpeg4",    ext: "avi",  mime: "video/x-msvideo",  audio: "mp3",     desc: "AVI (legacy)",     extra: "-q:v 5" },
  mov:  { codec: "libx264",  ext: "mov",  mime: "video/quicktime",  audio: "aac",     desc: "MOV (QuickTime)",  extra: "-preset fast -crf 23" },
  webm: { codec: "libvpx",   ext: "webm", mime: "video/webm",       audio: "libvorbis", desc: "WebM (web)",     extra: "-b:v 1M -b:a 128k" },
  flv:  { codec: "libx264",  ext: "flv",  mime: "video/x-flv",      audio: "aac",     desc: "FLV (Flash)",      extra: "-preset fast -crf 23" },
  "3gp":{ codec: "libx264",  ext: "3gp",  mime: "video/3gpp",       audio: "aac",     desc: "3GP (mobile)",     extra: "-s 320x240 -b:v 200k" },
  wmv:  { codec: "wmv2",     ext: "wmv",  mime: "video/x-ms-wmv",   audio: "wmav2",   desc: "WMV (Windows)",    extra: "-b:v 1M" },
  gif:  { codec: "gif",      ext: "gif",  mime: "image/gif",        audio: "",        desc: "GIF (no audio)",  extra: "-s 480x320 -r 15" },
  ts:   { codec: "libx264",  ext: "ts",   mime: "video/mp2t",       audio: "aac",     desc: "TS (broadcast)",   extra: "-preset fast -crf 23" },
  ogv:  { codec: "libtheora",ext: "ogv",  mime: "video/ogg",       audio: "libvorbis", desc: "OGV (Ogg)",      extra: "-b:v 1M" },
  m4v:  { codec: "libx264",  ext: "m4v",  mime: "video/x-m4v",      audio: "aac",     desc: "M4V (Apple)",      extra: "-preset fast -crf 23" },
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return m.reply(claraWrap("Video Convert", "Reply video yang mau di-convert."));
    const videoMsg = quoted.videoMessage || quoted.documentMessage;
    if (!videoMsg) return m.reply(claraWrap("Video Convert", "Reply harus video/document video!"));

    const format = (args[0] || "").toLowerCase();
    if (!format || !FORMATS[format]) {
      const list = Object.entries(FORMATS).map(([k, v]) => k + " - " + v.desc).join("\n");
      return m.reply(claraWrap("Video Convert", [
        "Format tujuan harus diisi!",
        "Format tersedia:",
        list,
        "",
        "Contoh: " + usedPrefix + "videoconvert mkv",
      ].join("\n")));
    }

    const fmt = FORMATS[format];
    const tmpDir = path.join(os.tmpdir(), 'nova-videoconvert');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const inputPath = path.join(tmpDir, "input_" + Date.now() + ".mp4");
    const outputPath = path.join(tmpDir, "output_" + Date.now() + "." + fmt.ext);

    const buffer = await conn.downloadMediaMessage({ key: { remoteJid: m.key.remoteJid, id: m.quoted && m.quoted.id }, message: quoted });
    fs.writeFileSync(inputPath, buffer);

    let cmd;
    if (format === "gif") {
      cmd = 'ffmpeg -y -i "' + inputPath + '" -an -vf "fps=15,scale=480:-1:flags=lanczos" "' + outputPath + '"';
    } else {
      let audioPart = fmt.audio ? ' -c:a ' + fmt.audio : ' -an';
      cmd = 'ffmpeg -y -i "' + inputPath + '" -c:v ' + fmt.codec + ' ' + fmt.extra + audioPart + ' "' + outputPath + '"';
    }

    await queueFFmpeg(cmd);

    if (!fs.existsSync(outputPath)) {
      return m.reply(claraWrap("Video Convert", "Gagal convert video."));
    }

    const buf = fs.readFileSync(outputPath);
    const isGif = format === "gif";

    if (isGif) {
      await conn.sendMessage(m.key.remoteJid, {
        video: buf,
        gifPlayback: true,
        caption: claraWrap("Video Convert", [
          "Berhasil convert!",
          "Format: GIF (480px, 15fps)",
          "Size: " + (buf.length / 1024).toFixed(0) + " KB",
        ].join("\n")),
      });
    } else {
      await conn.sendMessage(m.key.remoteJid, {
        video: buf,
        mimetype: fmt.mime,
        caption: claraWrap("Video Convert", [
          "Berhasil convert!",
          "Format: " + format.toUpperCase() + " (" + fmt.desc + ")",
          "Codec: " + fmt.codec,
          "Size: " + (buf.length / 1024).toFixed(0) + " KB",
        ].join("\n")),
      });
    }

    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
  } catch (e) {
    console.error("videoconvert error:", e);
    return m.reply("Error: " + e.message);
  }
}

export default { pluginConfig, handler };
