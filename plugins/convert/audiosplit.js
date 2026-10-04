// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { queueFFmpeg } from '../../src/lib/rara-ffmpeg.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { raraWrap } from '../../src/lib/rara-menu-style.js'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

const pluginConfig = {
  name: "audiosplit",
  alias: ["audiosplit"],
  aliases: ["audiosplit", "splitaudio", "audiotrim", "potongaudio"],
  category: "convert",
  description: "Potong/trim audio dari detik X ke Y, atau split jadi 2 bagian",
  usage: ".audiosplit trim <start> <end> (reply audio) | .audiosplit half (reply audio) | .audiosplit parts <jumlah> (reply audio)",
  isGroupOnly: false,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return m.reply(raraWrap("Audio Split", `Reply audio yang mau dipotong.`));
    const audioMsg = quoted.audioMessage || quoted.pttMessage;
    if (!audioMsg) return m.reply(raraWrap("Audio Split", "Reply harus audio/voice note!"));

    const sub = (args[0] || "").toLowerCase();
    const tmpDir = path.join(os.tmpdir(), 'rara-split');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const inputPath = path.join(tmpDir, `input_${Date.now()}.mp3`);
    const buffer = await conn.downloadMediaMessage({ key: { remoteJid: m.key.remoteJid, id: m.quoted?.id }, message: quoted });
    fs.writeFileSync(inputPath, buffer);

    if (sub === "trim") {
      const start = args[1];
      const end = args[2];
      if (!start || !end) {
        return m.reply(raraWrap("Audio Split", [
          `Cara: ${usedPrefix}audiosplit trim <start> <end>`,
          `Format: HH:MM:SS atau detik`,
          `Contoh: ${usedPrefix}audiosplit trim 00:05 00:15`,
          `Atau: ${usedPrefix}audiosplit trim 5 15`,
        ].join("\n")));
      }
      const startSec = parseTime(start);
      const endSec = parseTime(end);
      if (startSec >= endSec) return m.reply(raraWrap("Info", "Start harus lebih kecil dari end!"));

      const duration = endSec - startSec;
      const outputPath = path.join(tmpDir, `trimmed_${Date.now()}.mp3`);
      await queueFFmpeg(`ffmpeg -y -i "${inputPath}" -ss ${startSec} -t ${duration} -c:a libopus -b:a 64k "${outputPath}"`);

      if (!fs.existsSync(outputPath)) return m.reply(raraGagal("AudioSplit"));
      const buf = fs.readFileSync(outputPath);
      await conn.sendMessage(m.key.remoteJid, {
        audio: buf, mimetype: "audio/ogg; codecs=opus", ptt: false,
        caption: raraWrap("Audio Split", `Trimmed: ${start} - ${end} (${duration} detik)`),
      });
      try {
        const info = await probeBuffer(buf, { mime: "audio/ogg" });
        const card = mediaResultCard({
          header: pluginConfig.name,
          type: "audio",
          request: [["Mode", "Trim"], ["Rentang", `${start} - ${end}`], ["Durasi", `${duration} detik`]],
          size: info.size, mime: info.mime, duration: info.duration,
        });
        if (card) await m.reply(card);
      } catch { /* best-effort */ }
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    }

    else if (sub === "half") {
      const probePath = path.join(tmpDir, `probe_${Date.now()}.txt`);
      await queueFFmpeg(`ffmpeg -y -i "${inputPath}" 2>"${probePath}"`);
      const probe = fs.readFileSync(probePath, 'utf8');
      const durMatch = probe.match(/Duration:\s(\d{2}):(\d{2}):(\d{2})/);
      if (!durMatch) return m.reply(raraGagal("AudioSplit"));
      const totalSec = parseInt(durMatch[1]) * 3600 + parseInt(durMatch[2]) * 60 + parseInt(durMatch[3]);
      const halfSec = Math.floor(totalSec / 2);

      const out1 = path.join(tmpDir, `split1_${Date.now()}.mp3`);
      const out2 = path.join(tmpDir, `split2_${Date.now()}.mp3`);

      await queueFFmpeg(`ffmpeg -y -i "${inputPath}" -t ${halfSec} -c:a libopus -b:a 64k "${out1}"`);
      await queueFFmpeg(`ffmpeg -y -i "${inputPath}" -ss ${halfSec} -c:a libopus -b:a 64k "${out2}"`);

      if (fs.existsSync(out1) && fs.existsSync(out2)) {
        await conn.sendMessage(m.key.remoteJid, {
          audio: fs.readFileSync(out1), mimetype: "audio/ogg; codecs=opus", ptt: false,
          caption: raraWrap("Audio Split", `Bagian 1 (0 - ${halfSec} detik)`),
        });
        await conn.sendMessage(m.key.remoteJid, {
          audio: fs.readFileSync(out2), mimetype: "audio/ogg; codecs=opus", ptt: false,
          caption: raraWrap("Audio Split", `Bagian 2 (${halfSec} - ${totalSec} detik)`),
        });
        try {
          const info = await probeBuffer(buffer, { mime: "audio/ogg" });
          const card = mediaResultCard({
            header: pluginConfig.name,
            type: "audio",
            request: [["Mode", "Half (2 bagian)"], ["Total Durasi", `${totalSec} detik`]],
            size: info.size, mime: info.mime, duration: info.duration,
          });
          if (card) await m.reply(card);
        } catch { /* best-effort */ }
        fs.unlinkSync(out1);
        fs.unlinkSync(out2);
      } else {
        return m.reply(raraGagal("AudioSplit"));
      }
      fs.unlinkSync(inputPath);
      try { fs.unlinkSync(probePath); } catch (e) { console.error('[audiosplit.js]:', e.message); }
    }

    else if (sub === "parts") {
      const parts = parseInt(args[1]);
      if (!parts || parts < 2 || parts > 10) {
        return m.reply(raraWrap("Audio Split", [`Parts 2-10. Contoh: ${usedPrefix}audiosplit parts 3`].join("\n")));
      }

      const probePath = path.join(tmpDir, `probe_${Date.now()}.txt`);
      await queueFFmpeg(`ffmpeg -y -i "${inputPath}" 2>"${probePath}"`);
      const probe = fs.readFileSync(probePath, 'utf8');
      const durMatch = probe.match(/Duration:\s(\d{2}):(\d{2}):(\d{2})/);
      if (!durMatch) return m.reply(raraGagal("AudioSplit"));
      const totalSec = parseInt(durMatch[1]) * 3600 + parseInt(durMatch[2]) * 60 + parseInt(durMatch[3]);
      const partDur = Math.floor(totalSec / parts);

      for (let i = 0; i < parts; i++) {
        const start = i * partDur;
        const outPath = path.join(tmpDir, `part${i + 1}_${Date.now()}.mp3`);
        await queueFFmpeg(`ffmpeg -y -i "${inputPath}" -ss ${start} -t ${partDur} -c:a libopus -b:a 64k "${outPath}"`);
        if (fs.existsSync(outPath)) {
          await conn.sendMessage(m.key.remoteJid, {
            audio: fs.readFileSync(outPath), mimetype: "audio/ogg; codecs=opus", ptt: false,
            caption: raraWrap("Audio Split", `Part ${i + 1}/${parts} (${start} - ${start + partDur} detik)`),
          });
          fs.unlinkSync(outPath);
        }
      }
      try {
        const info = await probeBuffer(buffer, { mime: "audio/ogg" });
        const card = mediaResultCard({
          header: pluginConfig.name,
          type: "audio",
          request: [["Mode", `Parts (${parts} bagian)`], ["Total Durasi", `${totalSec} detik`]],
          size: info.size, mime: info.mime, duration: info.duration,
        });
        if (card) await m.reply(card);
      } catch { /* best-effort */ }
      fs.unlinkSync(inputPath);
      try { fs.unlinkSync(probePath); } catch (e) { console.error('[audiosplit.js]:', e.message); }
    }

    else {
      fs.unlinkSync(inputPath);
      return m.reply(raraWrap("Audio Split", [
        `Audio Split - Potong/split audio`,
        "",
        `Command:`,
        `1. ${usedPrefix}audiosplit trim <start> <end> - Trim dari X ke Y`,
        `2. ${usedPrefix}audiosplit half - Split jadi 2 bagian`,
        `3. ${usedPrefix}audiosplit parts <2-10> - Split jadi beberapa bagian`,
        "",
        `Format waktu: HH:MM:SS atau detik`,
        `Contoh: ${usedPrefix}audiosplit trim 00:05 00:15`,
      ].join("\n")));
    }
      // Selesai
  } catch (e) {
    console.error("audiosplit error:", e);
    return m.reply(raraGangguan("audiosplit"));
  }
}

function parseTime(t) {
  if (t.includes(":")) {
    const parts = t.split(":");
    if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return parseInt(t) || 0;
}

export { pluginConfig as config, handler };
