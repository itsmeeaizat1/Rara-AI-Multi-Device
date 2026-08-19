// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "safemode",
  alias: ["modedaran", "emergencylock", "lockdown", "panicmode"],
  category: "owner",
  description: "Mode darurat — aktifkan SEMUA proteksi grup sekaligus dalam 1 perintah",
  usage: ".safemode <on|off|status>",
  example: ".safemode on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

// Semua proteksi yang akan diaktifkan
const ALL_PROTECTIONS = [
  "antilink",
  "antilinkgc",
  "antilinkall",
  "antivirtex",
  "antibug",
  "antikasar",
  "antitoxic",
  "antispam",
  "antijudol",
  "anti18plus",
  "anticaps",
  "antisticker",
  "antivn",
  "antifoto",
  "antivideo",
  "antimedia",
  "antidocument",
  "antinomorluar",
  "antibot",
  "anticulik",
  "antiribut",
];

// Setting bot yang juga diaktifkan
const BOT_SECURITY = [
  "anticall",
  "antispam",
  "antispamdm",
];

async function handler(m, { sock }) {
  const db = await getDatabase();
  const args = m.args || [];
  const sub = (args[0] || "").toLowerCase();
  const groupId = m.key.remoteJid;

  // ===== ON =====
  if (sub === "on") {
    if (!db.data.groups) db.data.groups = {};
    if (!db.data.groups[groupId]) db.data.groups[groupId] = {};
    if (!db.data.settings) db.data.settings = {};

    let activated = [];
    let alreadyActive = [];

    // Aktifkan semua proteksi grup
    ALL_PROTECTIONS.forEach((prot) => {
      if (!db.data.groups[groupId][prot]) {
        db.data.groups[groupId][prot] = true;
        activated.push(prot);
      } else {
        alreadyActive.push(prot);
      }
    });

    // Aktifkan setting bot
    BOT_SECURITY.forEach((s) => {
      if (!db.data.settings[s]) {
        db.data.settings[s] = true;
        activated.push(s);
      } else {
        alreadyActive.push(s);
      }
    });

    // Aktifkan self mode
    if (!db.data.settings.selfMode) {
      db.data.settings.selfMode = true;
      db.data.settings.publicMode = false;
      activated.push("selfMode");
    } else {
      alreadyActive.push("selfMode");
    }

    await db.save();

    let lines = [
      "MODE DARURAT DIAKTIFKAN",
      "",
      "Baru diaktifkan (" + activated.length + "):",
    ];
    activated.forEach((p) => lines.push("✅ " + p));
    if (alreadyActive.length > 0) {
      lines.push("");
      lines.push("Sudah aktif sebelumnya (" + alreadyActive.length + "):");
      alreadyActive.forEach((p) => lines.push("✅ " + p));
    }
    lines.push("");
    lines.push("Total proteksi aktif: " + (activated.length + alreadyActive.length));
    lines.push("Bot masuk SELF MODE — hanya owner yang bisa akses.");
    lines.push("");
    lines.push("Untuk matikan: .safemode off");

    return m.reply(claraWrap("Safe Mode", lines, "success"));
  }

  // ===== OFF =====
  if (sub === "off") {
    if (!db.data.groups) db.data.groups = {};
    if (!db.data.groups[groupId]) db.data.groups[groupId] = {};
    if (!db.data.settings) db.data.settings = {};

    let deactivated = [];

    ALL_PROTECTIONS.forEach((prot) => {
      if (db.data.groups[groupId][prot]) {
        db.data.groups[groupId][prot] = false;
        deactivated.push(prot);
      }
    });

    if (db.data.settings.selfMode) {
      db.data.settings.selfMode = false;
      db.data.settings.publicMode = true;
      deactivated.push("selfMode");
    }

    await db.save();

    if (deactivated.length === 0) {
      return m.reply(claraWrap("Safe Mode", "Tidak ada proteksi yang aktif untuk dimatikan."));
    }

    let lines = [
      "Mode darurat DIMATIKAN",
      "",
      "Proteksi yang dimatikan (" + deactivated.length + "):",
    ];
    deactivated.forEach((p) => lines.push("❌ " + p));
    lines.push("");
    lines.push("Bot kembali ke PUBLIC MODE.");
    lines.push("Hati-hati — semua proteksi grup sekarang nonaktif!");
    lines.push("Untuk aktifkan lagi: .safemode on");

    return m.reply(claraWrap("Safe Mode", lines, "warn"));
  }

  // ===== STATUS =====
  if (sub === "status") {
    if (!db.data.groups) db.data.groups = {};
    if (!db.data.groups[groupId]) db.data.groups[groupId] = {};
    if (!db.data.settings) db.data.settings = {};

    let active = [];
    let inactive = [];

    ALL_PROTECTIONS.forEach((prot) => {
      if (db.data.groups[groupId][prot]) active.push(prot);
      else inactive.push(prot);
    });

    BOT_SECURITY.forEach((s) => {
      if (db.data.settings[s]) active.push(s);
      else inactive.push(s);
    });

    if (db.data.settings.selfMode) active.push("selfMode");
    else inactive.push("selfMode");

    let lines = [
      "Status Safe Mode: " + (active.length > 15 ? "*AKTIF*" : "*SEBAGIAN*"),
      "",
      "Proteksi aktif (" + active.length + "):",
    ];
    active.forEach((p) => lines.push("✅ " + p));

    if (inactive.length > 0) {
      lines.push("");
      lines.push("Proteksi nonaktif (" + inactive.length + "):");
      inactive.forEach((p) => lines.push("❌ " + p));
    }

    lines.push("");
    lines.push("Aktifkan semua: .safemode on");
    lines.push("Matikan semua: .safemode off");

    return m.reply(claraWrap("Safe Mode", lines));
  }

  // ===== HELP =====
  return sendReplyWithNav(sock, m, claraWrap("Safe Mode", [
    "Mode darurat — aktifkan/matikan SEMUA proteksi sekaligus",
    "",
    "CARA PAKAI:",
    m.prefix + "safemode on — Aktifkan semua proteksi + self mode",
    m.prefix + "safemode off — Matikan semua proteksi + public mode",
    m.prefix + "safemode status — Lihat status semua proteksi",
    "",
    "Proteksi yang diatur:",
    "Anti-link, Anti-virtex, Anti-bug, Anti-kasar, Anti-toxic,",
    "Anti-spam, Anti-judol, Anti-18+, Anti-caps, Anti-sticker,",
    "Anti-VN, Anti-foto, Anti-video, Anti-media, Anti-dokumen,",
    "Anti-nomor luar, Anti-bot, Anti-culik, Anti-ribut",
    "+ Anti-call, Self Mode",
    "",
    "Gunakan saat grup kena serangan atau ada spam massal!",
  ]), "safemode");
}

export { pluginConfig as config, handler };
