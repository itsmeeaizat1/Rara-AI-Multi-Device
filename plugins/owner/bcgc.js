// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { fetchGroupsSafe } from "../../src/lib/nova-jpm-helper.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine, broadcastFormat } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "bcgc",
  alias: [
    "broadcastgc",
    "bcgroup",
    "jedabcgc",
    "delaybcgc",
    "setjedabcgc",
    "stopbcgc",
    "stopbroadcastgc",
  ],
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
      return m.reply(claraWrap("Broadcast Grup", "Tidak ada broadcast grup yang sedang berjalan."));
    }
    global.stopBcgc = true;
    return m.reply(claraWrap("Broadcast Grup", "Sedang dihentikan..."));
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
    return m.reply(claraWrap("Broadcast Grup", "Berhasil diaktifkan. Sekarang kamu bisa mengirim broadcast ke semua grup."));
  }

  if (input.toLowerCase() === "off") {
    db.setting("bcgcEnabled", false);
    return m.reply(claraWrap("Broadcast Grup", "Berhasil dinonaktifkan."));
  }

  if (!input && !m.quoted) {
    const enabled = db.setting("bcgcEnabled");
    const jeda = db.setting("jedaBcgc") || 5000;
    return sendReplyWithNav(sock, m, claraWrap("Broadcast Grup", [
      "Kirim pesan ke seluruh grup sekaligus dalam satu perintah.",
      "",
      "STATUS:",
      `Broadcast: ${enabled ? "Aktif" : "Nonaktif"}`,
      `Jeda: ${formatDelay(jeda)} (${jeda}ms)`,
      "",
      "PENGGUNAAN:",
      `${m.prefix}bcgc on — Aktifkan broadcast`,
      `${m.prefix}bcgc off — Nonaktifkan broadcast`,
      `${m.prefix}bcgc <pesan> — Kirim broadcast teks`,
      `${m.prefix}bcgc (reply media) — Kirim dengan media`,
      `${m.prefix}bcgc (reply teks) — Kirim isi pesan yang di-reply`,
      "",
      "JEDA:",
      `${m.prefix}jedabcgc 5s — Set jeda 5 detik`,
      `${m.prefix}jedabcgc 2m — Set jeda 2 menit`,
      "",
      "STOP:",
      `${m.prefix}stopbcgc — Hentikan broadcast`,
    ].join("\n")), "bcgc");
  }

  if (global.statusBcgc) {
    return m.reply(claraWrap("Broadcast Grup", `Sedang berjalan. Ketik ${m.prefix}stopbcgc untuk menghentikan.`));
  }

  const enabled = db.setting("bcgcEnabled");
  if (!enabled) {
    return m.reply(claraWrap("Broadcast Grup", `Belum aktif. Ketik ${m.prefix}bcgc on dulu untuk mengaktifkan.`));
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
      try { mediaBuffer = await qmsg.download(); mediaType = "image"; } catch {}
    } else if (qmsg.isVideo) {
      try { mediaBuffer = await qmsg.download(); mediaType = "video"; } catch {}
    } else if (qmsg.isAudio || qmsg.mimetype?.startsWith("audio")) {
      try { mediaBuffer = await qmsg.download(); mediaType = "audio"; } catch {}
    } else if (qmsg.isSticker) {
      try { mediaBuffer = await qmsg.download(); mediaType = "sticker"; } catch {}
    } else if (qmsg.isDocument || (qmsg.mimetype && !qmsg.mimetype.startsWith("text/plain"))) {
      try { mediaBuffer = await qmsg.download(); mediaType = "document"; } catch {}
    }

    if (!text && !mediaBuffer) {
      return sendReplyWithNav(sock, m, claraWrap("Broadcast Grup", [
        "Tidak ada konten terdeteksi.",
        "",
        "Cara yang benar:",
        `1. Kirim teks/foto/video/audio/dokumen`,
        `2. Reply pesan tersebut dengan ${m.prefix}bcgc`,
        "3. Bot akan broadcast ke semua grup",
      ].join("\n")), "bcgc");
    }

    const allGroups = await fetchGroupsSafe(sock);
    let groupIds = Object.keys(allGroups);

    const blacklist = db.setting("jpmBlacklist") || [];
    const blCount = groupIds.filter((id) => blacklist.includes(id)).length;
    groupIds = groupIds.filter((id) => !blacklist.includes(id));

    if (groupIds.length === 0) {
      return m.reply(claraWrap("Broadcast Grup", `Tidak ada grup yang bisa dituju${blCount > 0 ? ` (${blCount} grup di-blacklist)` : ""}.`));
    }

    const jeda = db.setting("jedaBcgc") || 5000;
    const ctx = saluranCtx();

    // Status report ke owner (claraWrap)
    await m.reply(claraWrap("Broadcast Grup Dimulai", [
      `Pesan: ${text.substring(0, 50)}${text.length > 50 ? "..." : ""}`,
      `Media: ${mediaBuffer ? mediaType : "Tidak ada"}`,
      `Target: ${groupIds.length} grup`,
      `Jeda: ${formatDelay(jeda)}`,
      `Estimasi: ${Math.ceil((groupIds.length * jeda) / 60000)} menit`,
      "",
      "Sedang mengirim ke semua grup...",
    ].join("\n")));

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
        await m.reply(claraWrap("Broadcast Grup Dihentikan", [
          `Berhasil: ${success}`,
          `Gagal: ${failed}`,
          `Sisa: ${groupIds.length - success - failed}`,
        ].join("\n")));
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
    m.react("✅");
    await m.reply(claraWrap("Broadcast Grup Selesai", [
      `Berhasil: ${success}`,
      `Gagal: ${failed}`,
      `Total: ${groupIds.length}`,
    ].join("\n")));
  } catch (e) {
    delete global.statusBcgc;
    m.reply(claraWrap("Broadcast Grup", te(m.prefix, m.command, m.pushName), "error"));
  }
}

async function handleSetDelay(m, db, input) {
  const current = db.setting("jedaBcgc") || 5000;

  if (!input) {
    return sendReplyWithNav(sock, m, claraWrap("Jeda Broadcast Grup", [
      "Atur jeda waktu antar pengiriman pesan ke setiap grup.",
      "Semakin lama jeda, semakin aman dari spam detection.",
      "",
      `Jeda saat ini: ${formatDelay(current)} (${current}ms)`,
      "",
      "CARA PAKAI:",
      `${m.prefix}jedabcgc <angka><satuan>`,
      "",
      "SATUAN:",
      "s — detik, m — menit, h — jam, d — hari",
      "",
      "CONTOH:",
      `${m.prefix}jedabcgc 5s -> 5 detik`,
      `${m.prefix}jedabcgc 2m -> 2 menit`,
      `${m.prefix}jedabcgc 1h -> 1 jam`,
    ].join("\n")), "bcgc");
  }

  const ms = parseDelay(input);
  if (!ms || ms < 1000) {
    return m.reply(claraWrap("Jeda Broadcast Grup", "Format salah. Contoh: 5s, 2m, 1h, 1d"));
  }

  db.setting("jedaBcgc", ms);
  return m.reply(claraWrap("Jeda Broadcast Grup", [
    "Jeda berhasil diubah",
    `Sebelumnya: ${formatDelay(current)} (${current}ms)`,
    `Sekarang: ${formatDelay(ms)} (${ms}ms)`,
    "",
    `Estimasi 100 grup: ${Math.ceil((100 * ms) / 60000)} menit`,
  ].join("\n")));
}

export { pluginConfig as config, handler }
