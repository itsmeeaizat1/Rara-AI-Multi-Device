// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { fetchGroupsSafe } from "../../src/lib/nova-jpm-helper.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, broadcastFormat } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "bcgc",
  alias: ["bcgc"],
  category: "owner",
  description:
    "Broadcast pesan ke semua grup dengan dukungan semua jenis media",
  usage: ".bcgc",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

function parseDelay(input) {
  if (!input) return null;
  const match = input.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const val = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case "s":
      return val * 1000;
    case "m":
      return val * 60 * 1000;
    case "h":
      return val * 60 * 60 * 1000;
    case "d":
      return val * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

function formatDelay(ms) {
  if (ms >= 86400000) return `${(ms / 86400000).toFixed(0)} hari`;
  if (ms >= 3600000) return `${(ms / 3600000).toFixed(0)} jam`;
  if (ms >= 60000) return `${(ms / 60000).toFixed(0)} menit`;
  return `${(ms / 1000).toFixed(0)} detik`;
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const command = m.command?.toLowerCase() || "";
  const input = m.fullArgs?.trim() || m.text?.trim() || "";

  if (command === "stopbcgc" || command === "stopbroadcastgc") {
    if (!global.statusBcgc) {
      return m.reply("╭──「 Broadcast Grup 」\n│\n│ ℹ️ Tidak ada broadcast yang sedang berjalan\n╰──────────");
    }
    global.stopBcgc = true;
    return m.reply("╭──「 Broadcast Grup 」\n│\n│ 🔄 Sedang dihentikan...\n╰──────────");
  }

  if (
    command === "jedabcgc" ||
    command === "delaybcgc" ||
    command === "setjedabcgc"
  ) {
    return handleSetDelay(m, db, input);
  }

  if (input.toLowerCase() === "on") {
    db.setting("bcgcEnabled", true);
    return m.reply("╭──「 Broadcast Grup 」\n│\n│ ✅ Berhasil diaktifkan\n│ Sekarang bisa broadcast ke semua grup\n╰──────────");
  }

  if (input.toLowerCase() === "off") {
    db.setting("bcgcEnabled", false);
    return m.reply("╭──「 Broadcast Grup 」\n│\n│ ✅ Berhasil dinonaktifkan\n╰──────────");
  }

  if (!input && !m.quoted) {
    const enabled = db.setting("bcgcEnabled");
    const jeda = db.setting("jedaBcgc") || 5000;
    const groups = await fetchGroupsSafe(sock);
    const groupCount = Object.keys(groups).length;
    const blacklist = db.setting("jpmBlacklist") || [];
    return m.reply(
      "╭──「 Broadcast Grup 」\n" +
      "│\n" +
      "│ 📋 Broadcast pesan + media ke semua grup\n" +
      "│ 🎯 Target: " + groupCount + " grup" + (blacklist.length ? " (" + blacklist.length + " blacklist)" : "") + "\n" +
      "│ ⏱️ Jeda: " + formatDelay(jeda) + "\n" +
      "│ 🔒 Status: " + (enabled ? "ON ✅" : "OFF ❌") + "\n" +
      "│\n" +
      "│ 📌 *Cara Pakai:*\n" +
      "│ Kirim teks/foto/video/audio, lalu reply dengan `" + m.prefix + "bcgc`\n" +
      "│\n" +
      "│ 💡 *Contoh:*\n" +
      "│ `" + m.prefix + "bcgc on` — Aktifkan broadcast\n" +
      "│ `" + m.prefix + "bcgc off` — Nonaktifkan\n" +
      "│ `" + m.prefix + "jedabcgc 5s` — Atur jeda 5 detik\n" +
      "│ `" + m.prefix + "stopbcgc` — Hentikan broadcast\n" +
      "╰──────────"
    );
  }

  if (global.statusBcgc) {
    return m.reply("╭──「 Broadcast Grup 」\n│\n│ 🔄 Sedang berjalan\n│ ⏹️ Ketik `" + m.prefix + "stopbcgc` untuk hentikan\n╰──────────");
  }

  const enabled = db.setting("bcgcEnabled");
  if (!enabled) {
    return m.reply("╭──「 Broadcast Grup 」\n│\n│ ❌ Belum aktif\n│ Ketik `" + m.prefix + "bcgc on` untuk mengaktifkan\n╰──────────");
  }

  try {
    let mediaBuffer = null;
    let mediaType = null;
    let text = input || "";
    const qmsg = m.quoted || m;

    if (!text && m.quoted) {
      text = m.quoted.body || m.quoted.text || m.quoted.contentText || "";
    }

    if (qmsg.isImage) {
      try { mediaBuffer = await qmsg.download(); mediaType = "image"; } catch (e) { console.error('[bcgc.js]:', e.message); }
    } else if (qmsg.isVideo) {
      try { mediaBuffer = await qmsg.download(); mediaType = "video"; } catch (e) { console.error('[bcgc.js]:', e.message); }
    } else if (qmsg.isAudio || qmsg.mimetype?.startsWith("audio")) {
      try { mediaBuffer = await qmsg.download(); mediaType = "audio"; } catch (e) { console.error('[bcgc.js]:', e.message); }
    } else if (qmsg.isSticker) {
      try { mediaBuffer = await qmsg.download(); mediaType = "sticker"; } catch (e) { console.error('[bcgc.js]:', e.message); }
    } else if (qmsg.isDocument || (qmsg.mimetype && !qmsg.mimetype.startsWith("text/plain"))) {
      try { mediaBuffer = await qmsg.download(); mediaType = "document"; } catch (e) { console.error('[bcgc.js]:', e.message); }
    }

    if (!text && !mediaBuffer) {
      return m.reply(
        "╭──「 Broadcast Grup 」\n" +
        "│\n" +
        "│ ❌ Tidak ada konten terdeteksi\n" +
        "│\n" +
        "│ 📌 *Cara benar:*\n" +
        "│ 1. Kirim teks/foto/video/audio/dokumen\n" +
        "│ 2. Reply pesan tersebut dengan `" + m.prefix + "bcgc`\n" +
        "│ 3. Bot akan broadcast ke semua grup\n" +
        "╰──────────"
      );
    }

    const allGroups = await fetchGroupsSafe(sock);
    let groupIds = Object.keys(allGroups);

    const blacklist = db.setting("jpmBlacklist") || [];
    const blCount = groupIds.filter((id) => blacklist.includes(id)).length;
    groupIds = groupIds.filter((id) => !blacklist.includes(id));

    if (groupIds.length === 0) {
      return m.reply(
        "╭──「 Broadcast Grup 」\n" +
        "│\n" +
        "│ ❌ Tidak ada grup yang bisa dituju" + (blCount > 0 ? " (" + blCount + " grup di-blacklist)" : "") + "\n" +
        "╰──────────"
      );
    }

    const jeda = db.setting("jedaBcgc") || 5000;
    const ctx = saluranCtx();

    // Status report ke owner — Modern Box
    await m.reply(
      "╭──「 Broadcast Grup Dimulai 」\n" +
      "│\n" +
      "│ 📝 Pesan: " + text.substring(0, 50) + (text.length > 50 ? "..." : "") + "\n" +
      "│ 🎬 Media: " + (mediaBuffer ? mediaType : "Tidak ada") + "\n" +
      "│ 🎯 Target: " + groupIds.length + " grup\n" +
      "│ ⏱️ Jeda: " + formatDelay(jeda) + "\n" +
      "│ 📊 Estimasi: " + Math.ceil((groupIds.length * jeda) / 60000) + " menit\n" +
      "│\n" +
      "│ 🔄 Sedang mengirim ke semua grup...\n" +
      "│ ⏹️ Hentikan: `" + m.prefix + "stopbcgc`\n" +
      "╰──────────"
    );

    global.statusBcgc = true;
    let success = 0;
    let failed = 0;

    // Format pesan dengan header info untuk penerima
    const botName = config.bot?.name || "Nova AI";
    const senderName = m.pushName || "Owner";
    const broadcastText = broadcastFormat({
      botName,
      senderName,
      message: text,
      type: "group",
    });

    for (const gid of groupIds) {
      if (global.stopBcgc) {
        delete global.stopBcgc;
        delete global.statusBcgc;
        await m.reply(
          "╭──「 Broadcast Grup Dihentikan 」\n" +
          "│\n" +
          "│ ✅ Berhasil: " + success + "\n" +
          "│ ❌ Gagal: " + failed + "\n" +
          "│ ⏭️ Sisa: " + (groupIds.length - success - failed) + "\n" +
          "╰──────────"
        );
        return;
      }

      try {
        if (mediaType === "sticker") {
          // Sticker tidak bisa pakai caption, kirim sticker dulu lalu text info
          await sock.sendMessage(gid, { sticker: mediaBuffer, contextInfo: ctx });
          await sock.sendMessage(gid, { text: broadcastText, contextInfo: ctx });
        } else if (mediaType === "audio") {
          // Audio: kirim audio dulu, lalu text info terpisah
          await sock.sendMessage(gid, {
            audio: mediaBuffer,
            mimetype: qmsg.mimetype || "audio/mpeg",
            ptt: qmsg.ptt || false,
            contextInfo: ctx,
          });
          await sock.sendMessage(gid, { text: broadcastText, contextInfo: ctx });
        } else if (mediaType === "document") {
          await sock.sendMessage(gid, {
            document: mediaBuffer,
            mimetype: qmsg.mimetype || "application/octet-stream",
            fileName: qmsg.fileName || "file",
            caption: broadcastText,
            contextInfo: ctx,
          });
        } else if (mediaBuffer) {
          // Image/video: caption = broadcast text dengan header info
          await sock.sendMessage(gid, {
            [mediaType]: mediaBuffer,
            caption: broadcastText,
            contextInfo: ctx,
          });
        } else {
          // Text only
          await sock.sendMessage(gid, { text: broadcastText, contextInfo: ctx });
        }
        success++;
      } catch {
        failed++;
      }

      await new Promise((r) => setTimeout(r, jeda));
    }

    delete global.statusBcgc;
    m.react("🐣");
    await m.reply(
      "╭──「 Broadcast Grup Selesai 」\n" +
      "│\n" +
      "│ ✅ Berhasil: " + success + "\n" +
      "│ ❌ Gagal: " + failed + "\n" +
      "│ 📊 Total: " + groupIds.length + " grup\n" +
      "│ 📈 Sukses Rate: " + Math.round((success / groupIds.length) * 100) + "%\n" +
      "│\n" +
      "│ 🏷️ " + (config.bot?.name || "Nova AI") + "\n" +
      "╰──────────"
    );
  } catch (e) {
    delete global.statusBcgc;
    m.reply(
      "╭──「 Broadcast Grup — Error 」\n" +
      "│\n" +
      "│ ❌ Terjadi kesalahan saat broadcast\n" +
      "" + te(m.prefix, m.command, m.pushName) + "\n" +
      "╰──────────"
    );
  }
}

async function handleSetDelay(m, db, input) {
  const current = db.setting("jedaBcgc") || 5000;

  if (!input) {
    return m.reply(
      "╭──「 Jeda Broadcast Grup 」\n" +
      "│\n" +
      "│ 📋 Atur jeda antar pengiriman ke setiap grup\n" +
      "│ 🔒 Semakin lama jeda = semakin aman dari spam\n" +
      "│\n" +
      "│ ⏱️ Jeda saat ini: " + formatDelay(current) + " (" + current + "ms)\n" +
      "│\n" +
      "│ 📌 *Cara Pakai:*\n" +
      "│ `" + m.prefix + "jedabcgc <angka><satuan>`\n" +
      "│\n" +
      "│ 💡 *Satuan:*\n" +
      "│ s — detik | m — menit | h — jam | d — hari\n" +
      "│\n" +
      "│ 💡 *Contoh:*\n" +
      "│ `" + m.prefix + "jedabcgc 5s` → 5 detik\n" +
      "│ `" + m.prefix + "jedabcgc 2m` → 2 menit\n" +
      "│ `" + m.prefix + "jedabcgc 1h` → 1 jam\n" +
      "╰──────────"
    );
  }

  const ms = parseDelay(input);
  if (!ms || ms < 1000) {
    return m.reply("╭──「 Jeda Broadcast Grup 」\n│\n│ ❌ Format salah\n│ 💡 Contoh: `5s`, `2m`, `1h`, `1d`\n╰──────────");
  }

  db.setting("jedaBcgc", ms);
  return m.reply(
      "╭──「 Jeda Broadcast Grup 」\n" +
      "│\n" +
      "│ ✅ Jeda berhasil diubah\n" +
      "│ 📌 Sebelumnya: " + formatDelay(current) + " (" + current + "ms)\n" +
      "│ 📌 Sekarang: " + formatDelay(ms) + " (" + ms + "ms)\n" +
      "│\n" +
      "│ 📊 Estimasi 100 grup: " + Math.ceil((100 * ms) / 60000) + " menit\n" +
      "╰──────────"
    );

}

export { pluginConfig as config, handler }
