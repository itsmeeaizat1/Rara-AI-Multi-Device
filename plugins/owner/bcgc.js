// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { fetchGroupsSafe } from "../../src/lib/rara-jpm-helper.js";
import { saluranCtx } from "../../src/lib/rara-context.js";
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, broadcastFormat, raraWrap } from "../../src/lib/rara-menu-style.js";

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
      return m.reply(raraBox("Broadcast Grup", ["Tidak ada broadcast yang sedang berjalan"]));
    }
    global.stopBcgc = true;
    return m.reply(raraWrap("bcgc", "Sedang dihentikan..."));
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
    return m.reply(raraBox("Broadcast Grup", ["✅ Berhasil diaktifkan", "Sekarang bisa broadcast ke semua grup"]));
  }

  if (input.toLowerCase() === "off") {
    db.setting("bcgcEnabled", false);
    return m.reply(raraWrap("bcgc", "Berhasil dinonaktifkan"));
  }

  if (!input && !m.quoted) {
    const enabled = db.setting("bcgcEnabled");
    const jeda = db.setting("jedaBcgc") || 5000;
    const groups = await fetchGroupsSafe(sock);
    const groupCount = Object.keys(groups).length;
    const blacklist = db.setting("jpmBlacklist") || [];
    return m.reply(
      raraWrap("bcgc", [
        "Broadcast pesan + media ke semua grup",
        "",
        "Target: " + groupCount + " grup" + (blacklist.length ? " (" + blacklist.length + " blacklist)" : ""),
        "Jeda: " + formatDelay(jeda),
        "Status: " + (enabled ? "ON" : "OFF"),
        "",
        `📌 Format: kirim teks/foto/video/audio, lalu reply dengan ${m.prefix}bcgc`,
        "",
        "💡 Contoh:",
        `${m.prefix}bcgc on — aktifkan broadcast`,
        `${m.prefix}bcgc off — nonaktifkan`,
        `${m.prefix}jedabcgc 5s — atur jeda 5 detik`,
        `${m.prefix}stopbcgc — hentikan broadcast`,
      ])
    );
  }

  if (global.statusBcgc) {
    return m.reply(raraWrap("bcgc", "Sedang berjalan.\nKetik *" + m.prefix + "stopbcgc* untuk hentikan"));
  }

  const enabled = db.setting("bcgcEnabled");
  if (!enabled) {
    return m.reply(raraWrap("bcgc", "Belum aktif.\nKetik *" + m.prefix + "bcgc on* untuk mengaktifkan"));
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
        raraWrap("bcgc", [
          "Tidak ada konten terdeteksi",
          "",
          `📌 Format: kirim teks/foto/video/audio, lalu reply dengan ${m.prefix}bcgc`,
          "",
          "💡 Contoh: kirim pesan promo, reply dengan " + m.prefix + "bcgc",
        ])
      );
    }

    const allGroups = await fetchGroupsSafe(sock);
    let groupIds = Object.keys(allGroups);

    const blacklist = db.setting("jpmBlacklist") || [];
    const blCount = groupIds.filter((id) => blacklist.includes(id)).length;
    groupIds = groupIds.filter((id) => !blacklist.includes(id));

    if (groupIds.length === 0) {
      return m.reply(
        raraWrap("bcgc", "Tidak ada grup yang bisa dituju" + (blCount > 0 ? " (" + blCount + " grup di-blacklist)" : ""), "error")
      );
    }

    const jeda = db.setting("jedaBcgc") || 5000;
    const ctx = saluranCtx();

    // Status report ke owner
    await m.react("🕒");
    await m.reply(
      raraWrap("bcgc", [
        "Broadcast Grup Dimulai",
        "",
        "Pesan: " + text.substring(0, 50) + (text.length > 50 ? "..." : ""),
        "Media: " + (mediaBuffer ? mediaType : "Tidak ada"),
        "Target: " + groupIds.length + " grup",
        "Jeda: " + formatDelay(jeda),
        "Estimasi: " + Math.ceil((groupIds.length * jeda) / 60000) + " menit",
        "",
        "Sedang mengirim ke semua grup...",
        `Hentikan: ${m.prefix}stopbcgc`,
      ])
    );

    global.statusBcgc = true;
    let success = 0;
    let failed = 0;

    // Format pesan dengan header info untuk penerima
    const botName = config.bot?.name || "Rara AI";
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
        await m.react("❌");
        await m.reply(
          raraWrap("bcgc", [
            "Broadcast Grup Dihentikan",
            "",
            `Berhasil: ${success}`,
            `Gagal: ${failed}`,
            `Sisa: ${groupIds.length - success - failed}`,
          ])
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
    await m.react("🐣");
    await m.reply(
      raraWrap("bcgc", [
        "Broadcast Grup Selesai",
        "",
        `Berhasil: ${success}`,
        `Gagal: ${failed}`,
        `Total: ${groupIds.length} grup`,
        `Sukses Rate: ${Math.round((success / groupIds.length) * 100)}%`,
      ])
    );
  } catch (e) {
    delete global.statusBcgc;
    await m.react("❌");
    m.reply(
      raraWrap("bcgc", "Terjadi kesalahan saat broadcast\n" + te(m.prefix, m.command, m.pushName), "error")
    );
  }
}

async function handleSetDelay(m, db, input) {
  const current = db.setting("jedaBcgc") || 5000;

  if (!input) {
    return m.reply(
      "*Jeda Broadcast Grup*\n\n" +
      "📋 Atur jeda antar pengiriman ke setiap grup\n" +
      "🔒 Semakin lama jeda = semakin aman dari spam\n\n" +
      "⏱️ Jeda saat ini: " + formatDelay(current) + " (" + current + "ms)\n\n" +
      "📌 *Cara Pakai:*\n" +
      "`" + m.prefix + "jedabcgc <angka><satuan>`\n\n" +
      "💡 *Satuan:*\n" +
      "s — detik | m — menit | h — jam | d — hari\n\n" +
      "💡 *Contoh:*\n" +
      "`" + m.prefix + "jedabcgc 5s` → 5 detik\n" +
      "`" + m.prefix + "jedabcgc 2m` → 2 menit\n" +
      "`" + m.prefix + "jedabcgc 1h` → 1 jam"
    );
  }

  const ms = parseDelay(input);
  if (!ms || ms < 1000) {
    return m.reply(raraWrap("bcgc", "Format salah.\n💡 Contoh: 5s, 2m, 1h, 1d"));
  }

  db.setting("jedaBcgc", ms);
  return m.reply(
    "✅ Jeda berhasil diubah\n" +
    "📌 Sebelumnya: " + formatDelay(current) + " (" + current + "ms)\n" +
    "📌 Sekarang: " + formatDelay(ms) + " (" + ms + "ms)\n\n" +
    "📊 Estimasi 100 grup: " + Math.ceil((100 * ms) / 60000) + " menit"
  );
}

export { pluginConfig as config, handler }
