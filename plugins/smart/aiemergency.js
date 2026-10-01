// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "aiemergency",
  alias: ["aiemergency", "emergency"],
  category: "smart",
  description: "AI Emergency Watch - deteksi kata darurat & alert admin",
  usage: ".emergency <command>",
  example: ".emergency on",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const DEFAULT_KEYWORDS = [
  "tolong", "darurat", "emergency", "kecelakaan", "kebakaran",
  "banjir", "gempa", "tabrakan", "keracunan", "pingsan",
  "tenggelam", "jatuh", "berdarah", "kejahatan", "maling",
  "pencurian", "rampok", "cantol", "celaka", "korban",
];

const KONTAK_DARURAT = {
  polisi: { nama: "Polisi", nomor: "110", desc: "Kejahatan, pencurian, kecelakaan" },
  pemadam: { nama: "Pemadam Kebakaran", nomor: "113", desc: "Kebakaran, rescue" },
  ambulans: { nama: "Ambulans", nomor: "118", desc: "Emergency medis" },
  sars: { nama: "SAR/BASARNAS", nomor: "115", desc: "Hilang, bencana alam" },
  pln: { nama: "PLN", nomor: "123", desc: "Gangguan listrik" },
  poskobencana: { nama: "Posko Bencana", nomor: "117", desc: "Bencana alam" },
};

function getEmergency(db, gid) {
  const all = db.setting("aiemergency") || {};
  if (!all[gid]) {
    all[gid] = {
      enabled: false,
      keywords: DEFAULT_KEYWORDS,
      admins: [],
      alertCount: 0,
      lastAlert: 0,
    };
    db.setting("aiemergency", all);
  }
  return all[gid];
}

function saveEmergency(db, gid, data) {
  const all = db.setting("aiemergency") || {};
  all[gid] = data;
  db.setting("aiemergency", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;

  // ==================== ON / OFF
  if (sub === "on" || sub === "enable") {
    if (!m.isOwner) {
      await m.reply(novaWrap("Emergency Watch", "Khusus admin/owner."));
      return { handled: true };
    }
    const data = getEmergency(db, gid);
    data.enabled = true;
    if (!data.admins.includes(m.sender)) data.admins.push(m.sender);
    saveEmergency(db, gid, data);
    await m.reply(novaWrap("Emergency Watch", "AKTIF!\nBot akan alert admin kalau ada kata darurat terdeteksi.\nKetik " + prefix + "emergency kontak untuk nomor darurat."));
    return { handled: true };
  }

  if (sub === "off" || sub === "disable") {
    if (!m.isOwner) {
      await m.reply(novaWrap("Emergency Watch", "Khusus admin/owner."));
      return { handled: true };
    }
    const data = getEmergency(db, gid);
    data.enabled = false;
    saveEmergency(db, gid, data);
    await m.reply(novaWrap("Emergency Watch", "Dimatikan."));
    return { handled: true };
  }

  // ==================== ADD ADMIN
  if (sub === "addadmin" || sub === "admin") {
    if (!m.isOwner) {
      await m.reply(novaWrap("Emergency Watch", "Khusus admin/owner."));
      return { handled: true };
    }
    const target = m.mentionedJid?.[0];
    if (!target) {
      await m.reply(novaWrap("Emergency Watch", "Format: " + prefix + "emergency addadmin @member"));
      return { handled: true };
    }
    const data = getEmergency(db, gid);
    if (!data.admins.includes(target)) data.admins.push(target);
    saveEmergency(db, gid, data);
    await m.reply(novaWrap("Emergency Watch", "Admin darurat ditambah: @" + target.split("@")[0]), { mentions: [target] });
    return { handled: true };
  }

  // ==================== KEYWORDS
  if (sub === "keyword" || sub === "kata") {
    if (!m.isOwner) {
      await m.reply(novaWrap("Emergency Watch", "Khusus admin/owner."));
      return { handled: true };
    }
    const action = (args[2] || "").toLowerCase();
    const word = args.slice(3).join(" ").trim().toLowerCase();
    const data = getEmergency(db, gid);
    if (action === "add" && word) {
      if (!data.keywords.includes(word)) {
        data.keywords.push(word);
        saveEmergency(db, gid, data);
        await m.reply(novaWrap("Emergency Watch", "Kata darurat ditambah: " + word));
      } else {
        await m.reply(novaWrap("Emergency Watch", "Kata sudah ada: " + word));
      }
      return { handled: true };
    }
    if (action === "del" && word) {
      data.keywords = data.keywords.filter(k => k !== word);
      saveEmergency(db, gid, data);
      await m.reply(novaWrap("Emergency Watch", "Kata dihapus: " + word));
      return { handled: true };
    }
    if (action === "list" || !action) {
      await m.reply(novaWrap("Emergency Watch", "Kata darurat (" + data.keywords.length + "):\n" + data.keywords.join(", ")));
      return { handled: true };
    }
  }

  // ==================== KONTAK DARURAT
  if (sub === "kontak" || sub === "darurat" || sub === "nomor") {
    const list = Object.values(KONTAK_DARURAT).map(k => k.nama + ": " + k.nomor + " (" + k.desc + ")").join("\n");
    await m.reply(novaWrap("Nomor Darurat", list));
    return { handled: true };
  }

  // ==================== STATUS
  if (sub === "status" || sub === "cek" || !sub) {
    const data = getEmergency(db, gid);
    const adminList = data.admins.length > 0
      ? data.admins.map(a => "@" + a.split("@")[0]).join(", ")
      : "(belum ada)";
    await m.reply(novaWrap("Emergency Watch", [
      "Status: " + (data.enabled ? "AKTIF" : "MATI"),
      "Keywords: " + data.keywords.length,
      "Admin darurat: " + adminList,
      "Total alert: " + data.alertCount,
    ].join("\n")), { mentions: data.admins });
    return { handled: true };
  }

  // ==================== HELP
  await m.reply(novaWrap("Emergency Watch", [
    "AI EMERGENCY WATCH",
    "",
    "Cara pakai:",
    prefix + "emergency on - aktifkan watch",
    prefix + "emergency off - matikan",
    prefix + "emergency addadmin @member",
    prefix + "emergency keyword add <kata>",
    prefix + "emergency keyword del <kata>",
    prefix + "emergency keyword list",
    prefix + "emergency kontak - nomor darurat",
    prefix + "emergency status",
    "",
    "Bot alert admin kalau ada kata darurat di grup.",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler, DEFAULT_KEYWORDS, KONTAK_DARURAT };
