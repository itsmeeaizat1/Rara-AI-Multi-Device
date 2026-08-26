// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "antiforward",
  alias: ["antiforward", "antiforwardgc", "antiteruskan", "forwardblock"],
  category: "group",
  description: "Blokir pesan forwarded (diteruskan) di grup untuk cegah penyebaran info hoax",
  usage: ".antiforward on | .antiforward off | .antiforward status",
  example: ".antiforward on",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isAdmin: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

export function checkForward(m, sock, db) {
  const groupId = m.key.remoteJid;
  const cfg = db.data?.groups?.[groupId]?.antiforward;
  if (!cfg || !cfg.enabled) return;

  // Cek apakah pesan ini forwarded
  // Baileys: m.message?.[type]?.contextInfo?.forwardingScore
  let forwardingScore = 0;
  try {
    const msg = m.message;
    const type = Object.keys(msg)[0];
    forwardingScore = msg[type]?.contextInfo?.forwardingScore || 0;
  } catch (e) { console.error('[antiforward.js]:', e.message); }

  if (forwardingScore >= (cfg.minScore || 1)) {
    const sender = m.key.participant || m.sender;
    const action = cfg.action || "delete";

    if (action === "delete" || action === "warn") {
      try { sock.sendMessage(groupId, { delete: m.key }); } catch (e) { console.error('[antiforward.js]:', e.message); }
    }

    if (action === "warn" || action === "kick") {
      if (!cfg.warns) cfg.warns = {};
      cfg.warns[sender] = (cfg.warns[sender] || 0) + 1;
      const warnCount = cfg.warns[sender];
      db.save();

      if (action === "kick" || (action === "warn" && warnCount >= (cfg.maxWarn || 3))) {
        try {
          sock.groupParticipantsUpdate(groupId, [sender], "remove");
          delete cfg.warns[sender];
          db.save();
        } catch (e) { console.error('[antiforward.js]:', e.message); }
      }

      sock.sendMessage(groupId, {
        text: claraWrap("Anti Forward", [
          "PESAN FORWARDED TERDETEKSI!",
          "@" + sender.split("@")[0] + " mengirim pesan yang diteruskan " + forwardingScore + "x",
          "Warning: " + warnCount + "/" + (cfg.maxWarn || 3),
          "Forward pesan dilarang di grup ini!",
        ], "warn"),
        mentions: [sender],
      });
    }
  }
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.groups) db.data.groups = {};
    if (!db.data.groups[groupId]) db.data.groups[groupId] = {};
    const groupCfg = db.data.groups[groupId];

    if (!groupCfg.antiforward) {
      groupCfg.antiforward = { enabled: false, minScore: 1, action: "delete", maxWarn: 3, warns: {} };
      await db.save();
    }
    const cfg = groupCfg.antiforward;

    // ON
    if (sub === "on" || sub === "aktif") {
      cfg.enabled = true;
      const scoreArg = parseInt(args[1]);
      if (scoreArg && scoreArg >= 1 && scoreArg <= 100) cfg.minScore = scoreArg;
      await db.save();

      return m.reply(claraWrap("Anti Forward", [
        "Anti Forward DIAKTIFKAN!",
        "",
        "Min forwarding score: " + cfg.minScore,
        "Action: " + (cfg.action || "delete").toUpperCase(),
        "",
        "Pesan yang diteruskan " + cfg.minScore + "x akan diblokir!",
        "Ketik .antiforward action <delete/warn/kick> untuk ubah aksi",
      ], "success"));
    }

    // OFF
    if (sub === "off" || sub === "mati" || sub === "nonaktif") {
      cfg.enabled = false;
      await db.save();
      return m.reply(claraWrap("Anti Forward", "Anti Forward DIMATIKAN.\nKetik .antiforward on untuk aktifkan lagi."));
    }

    // ACTION
    if (sub === "action" || sub === "aksi") {
      const action = (args[1] || "").toLowerCase();
      if (!["delete", "warn", "kick"].includes(action)) {
        return m.reply(claraWrap("Anti Forward", "Pilih: delete, warn, atau kick\nContoh: .antiforward action warn"));
      }
      cfg.action = action;
      await db.save();
      return m.reply(claraWrap("Anti Forward", "Action diubah ke: *" + action.toUpperCase() + "*", "success"));
    }

    // STATUS
    if (sub === "status" || sub === "cek" || sub === "info") {
      const warnedUsers = Object.entries(cfg.warns || {});
      let warnList = "Tidak ada";
      if (warnedUsers.length > 0) {
        warnList = warnedUsers.map(([jid, count]) => "@" + jid.split("@")[0] + " (" + count + "x)").join("\n");
      }

      return m.reply(claraWrap("Anti Forward", [
        "Status: " + (cfg.enabled ? "*ᴀᴋᴛɪꜰ*" : "Nonaktif"),
        "Min forwarding score: " + cfg.minScore,
        "Action: " + (cfg.action || "delete").toUpperCase(),
        "Max warning: " + (cfg.maxWarn || 3),
        "",
        "Member yang kena warning:",
        warnList,
        "",
        "Reset warning: .antiforward reset",
      ]));
    }

    // RESET
    if (sub === "reset") {
      cfg.warns = {};
      await db.save();
      return m.reply(claraWrap("Anti Forward", "Semua warning direset.", "success"));
    }

    // HELP
    return m.reply( claraWrap("Anti Forward", [
      "Blokir pesan forwarded (diteruskan) di grup",
      "",
      "Berguna untuk cegah penyebaran hoax/info yang udah diteruskan berkali-kali",
      "",
      "CARA PAKAI:",
      usedPrefix + "antiforward on [score] — Aktifkan (default score 1)",
      usedPrefix + "antiforward off — Matikan",
      usedPrefix + "antiforward action <delete/warn/kick> — Ubah aksi",
      usedPrefix + "antiforward status — Lihat status",
      usedPrefix + "antiforward reset — Reset warning",
      "",
      "Forwarding score = berapa kali pesan ini udah diteruskan",
      "Score 1 = diteruskan 1x, score 5 = diteruskan 5x",
      "",
      "CONTOH:",
      usedPrefix + "antiforward on (blokir semua forwarded)",
      usedPrefix + "antiforward on 5 (blokir yang diteruskan 5x+)",
      usedPrefix + "antiforward action kick",
    ]), "antiforward");
  } catch (e) {
    console.error("[Anti Forward]", e);
    m.reply(claraWrap("Anti Forward", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
