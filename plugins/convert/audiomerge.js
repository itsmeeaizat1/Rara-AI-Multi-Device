// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { queueFFmpeg } from '../../src/lib/nova-ffmpeg.js'
import { claraWrap } from '../../src/lib/nova-menu-style.js'
import { getDatabase } from '../../src/lib/nova-database.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

const pluginConfig = {
  name: "audiomerge",
  aliases: ["audiomerge", "mergeaudio", "audiojoin", "gabungaudio"],
  category: "convert",
  description: "Gabung 2+ audio jadi 1 file dengan jeda/crossfade",
  usage: ".audiomerge add (reply audio) | .audiomerge list | .audiomerge go | .audiomerge clear | .audiomerge gap <detik>",
  isGroupOnly: false,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.audioMerge) db.data.audioMerge = {};
    if (!db.data.audioMerge[groupId]) {
      db.data.audioMerge[groupId] = { queue: [], gap: 0 };
      await db.save();
    }

    const data = db.data.audioMerge[groupId];

    if (sub === "add") {
      const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) return m.reply(claraWrap("Audio Merge", `Reply audio yang mau digabung. Lalu ketik ${usedPrefix}audiomerge add`));

      const audioMsg = quoted.audioMessage || quoted.pttMessage;
      if (!audioMsg) return m.reply(claraWrap("Audio Merge", "Reply harus audio/voice note!"));

      const tmpDir = path.join(os.tmpdir(), 'nova-merge');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      const fileName = `merge_${Date.now()}_${data.queue.length}.mp3`;
      const filePath = path.join(tmpDir, fileName);

      const buffer = await conn.downloadMediaMessage({ key: { remoteJid: m.key.remoteJid, id: m.quoted?.id }, message: quoted });
      fs.writeFileSync(filePath, buffer);

      data.queue.push({ path: filePath, name: fileName, addedBy: m.sender });
      await db.save();

      return m.reply(claraWrap("Audio Merge", [
        `Audio ditambahkan!`,
        `Total dalam queue: ${data.queue.length}`,
        `Gap: ${data.gap} detik`,
        "",
        `${data.queue.length >= 2 ? `Ketik ${usedPrefix}audiomerge go untuk merge` : "Tambah minimal 1 audio lagi"}`,
      ].join("\n")));
    }

    if (sub === "go" || sub === "merge") {
      if (data.queue.length < 2) return m.reply(claraWrap("Audio Merge", `Minimal 2 audio. Tambah dengan ${usedPrefix}audiomerge add`));

      const tmpDir = path.join(os.tmpdir(), 'nova-merge');
      const outputPath = path.join(tmpDir, `merged_${Date.now()}.mp3`);

      let listFile = data.queue.map((q, i) => `file '${q.path}'`).join("\n");
      const listPath = path.join(tmpDir, `list_${Date.now()}.txt`);
      fs.writeFileSync(listPath, listFile);

      let filterCmd = `-f concat -safe 0 -i "${listPath}" -c:a libopus -b:a 64k "${outputPath}"`;
      if (data.gap > 0) {
        filterCmd = `-f concat -safe 0 -i "${listPath}" -af "adelay=${data.gap * 1000}|${data.gap * 1000}" -c:a libopus -b:a 64k "${outputPath}"`;
      }

      await queueFFmpeg(`ffmpeg -y ${filterCmd}`);

      if (!fs.existsSync(outputPath)) {
        return m.reply(claraWrap("Audio Merge", "Gagal merge audio. Coba lagi."));
      }

      const buffer = fs.readFileSync(outputPath);
      await conn.sendMessage(groupId, {
        audio: buffer,
        mimetype: "audio/ogg; codecs=opus",
        ptt: false,
        caption: claraWrap("Audio Merge", `Berhasil merge ${data.queue.length} audio! Gap: ${data.gap} detik`),
      });

      fs.unlinkSync(outputPath);
      fs.unlinkSync(listPath);
      data.queue.forEach(q => { try { fs.unlinkSync(q.path); } catch {} });
      data.queue = [];
      await db.save();
    }

    if (sub === "list") {
      if (data.queue.length === 0) return m.reply(claraWrap("Audio Merge", "Queue kosong."));
      const list = data.queue.map((q, i) => `${i + 1}. ${q.name} (@${q.addedBy.split("@")[0]})`).join("\n");
      return m.reply(claraWrap("Audio Merge", [`Queue (${data.queue.length}):`, "", list, "", `Gap: ${data.gap} detik`].join("\n")));
    }

    if (sub === "gap") {
      const sec = parseInt(args[1]) || 0;
      if (sec < 0 || sec > 10) return m.reply("Gap 0-10 detik. Contoh: .audiomerge gap 1");
      data.gap = sec;
      await db.save();
      return m.reply(claraWrap("Audio Merge", `Jeda antar audio diatur ke ${sec} detik.`));
    }

    if (sub === "clear") {
      data.queue.forEach(q => { try { fs.unlinkSync(q.path); } catch {} });
      data.queue = [];
      await db.save();
      return m.reply(claraWrap("Audio Merge", "Queue dibersihkan."));
    }

    if (sub === "remove" || sub === "del") {
      const idx = parseInt(args[1]) - 1;
      if (isNaN(idx) || idx < 0 || idx >= data.queue.length) return m.reply(`Cara: ${usedPrefix}audiomerge remove <nomor>`);
      try { fs.unlinkSync(data.queue[idx].path); } catch {}
      data.queue.splice(idx, 1);
      await db.save();
      return m.reply(claraWrap("Audio Merge", `Audio ${idx + 1} dihapus dari queue.`));
    }

    return m.reply(claraWrap("Audio Merge", [
      `Audio Merge - Gabung 2+ audio jadi 1 file`,
      "",
      `Command:`,
      `1. ${usedPrefix}audiomerge add (reply audio) - Tambah ke queue`,
      `2. ${usedPrefix}audiomerge list - Lihat queue`,
      `3. ${usedPrefix}audiomerge go - Mulai merge`,
      `4. ${usedPrefix}audiomerge gap <detik> - Set jeda antar audio`,
      `5. ${usedPrefix}audiomerge remove <nomor> - Hapus dari queue`,
      `6. ${usedPrefix}audiomerge clear - Bersihkan queue`,
    ].join("\n")));
  } catch (e) {
    console.error("audiomerge error:", e);
    return m.reply("Error: " + e.message);
  }
}

export default { pluginConfig, handler };
