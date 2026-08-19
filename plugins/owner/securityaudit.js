// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "securityaudit",
  alias: ["auditsecurity", "cekaudit", "auditkeamanan", "botaudit"],
  category: "owner",
  description: "Audit keamanan bot — cek semua proteksi yang aktif/tidak aktif",
  usage: ".securityaudit",
  example: ".securityaudit",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = await getDatabase();
  const groupId = m.key.remoteJid;

  let lines = [
    "Audit keamanan bot Nova AI",
    "Tanggal: " + new Date().toLocaleString("id-ID"),
    "",
    "STATUS BOT:",
  ];

  // Bot mode
  const isSelf = db.data?.settings?.selfMode || false;
  lines.push("Bot Mode: " + (isSelf ? "*SELF (Aman)* " : "*PUBLIC* — semua orang bisa pakai"));
  const isPublic = db.data?.settings?.publicMode || !isSelf;
  if (!isSelf) {
    lines.push("⚠ Mode PUBLIC — siapapun bisa kirim perintah ke bot");
  }

  // Anti-call
  lines.push("");
  lines.push("PROTEKSI TELEPON:");
  const antiCall = db.data?.settings?.anticall !== false;
  lines.push("Anti-Call: " + (antiCall ? "✅ Aktif" : "❌ Nonaktif"));

  // Anti-spam
  lines.push("");
  lines.push("PROTEKSI SPAM:");
  const antiSpam = db.data?.settings?.antispam !== false;
  lines.push("Anti-Spam: " + (antiSpam ? "✅ Aktif" : "❌ Nonaktif"));
  const antiSpamDM = db.data?.settings?.antispamdm !== false;
  lines.push("Anti-Spam DM: " + (antiSpamDM ? "✅ Aktif" : "❌ Nonaktif"));

  // Anti link/virtex
  lines.push("");
  lines.push("PROTEKSI GRUP:");
  const groupSettings = db.data?.groups?.[groupId] || {};
  const protections = [
    { key: "antilink", name: "Anti-Link" },
    { key: "antilinkgc", name: "Anti-Link GC" },
    { key: "antilinkall", name: "Anti-Link All" },
    { key: "antivirtex", name: "Anti-Virtex" },
    { key: "antibug", name: "Anti-Bug" },
    { key: "antikasar", name: "Anti-Kasar" },
    { key: "antitoxic", name: "Anti-Toxic" },
    { key: "antispam", name: "Anti-Spam GC" },
    { key: "antijudol", name: "Anti-Judol" },
    { key: "anti18plus", name: "Anti-18+" },
    { key: "anticaps", name: "Anti-Caps" },
    { key: "antisticker", name: "Anti-Sticker Spam" },
    { key: "antivn", name: "Anti-VN Spam" },
    { key: "antifoto", name: "Anti-Foto" },
    { key: "antivideo", name: "Anti-Video" },
    { key: "antimedia", name: "Anti-Media" },
    { key: "antidocument", name: "Anti-Dokumen" },
    { key: "antinomorluar", name: "Anti-Nomor Luar" },
    { key: "antibot", name: "Anti-Bot Lain" },
    { key: "anticulik", name: "Anti-Culik" },
  ];

  let activeCount = 0;
  protections.forEach((p) => {
    const active = groupSettings[p.key] === true;
    if (active) activeCount++;
    lines.push(p.name + ": " + (active ? "✅ Aktif" : "❌ Nonaktif"));
  });

  lines.push("");
  lines.push("Total proteksi grup aktif: " + activeCount + "/" + protections.length);

  // Session security
  lines.push("");
  lines.push("SESSION & DATA:");
  const autoBackup = db.data?.settings?.autobackup !== false;
  lines.push("Auto-Backup: " + (autoBackup ? "✅ Aktif" : "❌ Nonaktif"));
  const autoClearCache = db.data?.settings?.autoclearcache !== false;
  lines.push("Auto-Clear Cache: " + (autoClearCache ? "✅ Aktif" : "❌ Nonaktif"));

  // Owner security
  lines.push("");
  lines.push("OWNER & AKSES:");
  const ownerCount = db.data?.settings?.owner?.length || 0;
  lines.push("Total Owner: " + ownerCount);
  const selfMode = db.data?.settings?.selfMode || false;
  lines.push("Self Mode: " + (selfMode ? "✅ Aktif (aman)" : "❌ Nonaktif"));
  const onlyAdmin = db.data?.settings?.onlyadmin || false;
  lines.push("Only Admin: " + (onlyAdmin ? "✅ Aktif" : "❌ Nonaktif"));
  const onlyPC = db.data?.settings?.onlypc || false;
  lines.push("Only PC: " + (onlyPC ? "✅ Aktif" : "❌ Nonaktif"));

  // Banned users
  const bannedCount = db.data?.banned?.length || 0;
  lines.push("User dibanned: " + bannedCount);
  const blockedCount = db.data?.blocked?.length || 0;
  lines.push("Nomor diblokir: " + blockedCount);

  // Security score
  let score = 0;
  if (isSelf) score += 25;
  if (antiCall) score += 10;
  if (antiSpam) score += 10;
  if (antiSpamDM) score += 10;
  if (activeCount >= 5) score += 10;
  if (autoBackup) score += 10;
  if (autoClearCache) score += 5;
  if (selfMode) score += 10;
  if (bannedCount >= 0) score += 10; // sistem berfungsi

  const bar = "█".repeat(Math.floor(score / 10)) + "░".repeat(10 - Math.floor(score / 10));

  let verdict;
  if (score >= 80) verdict = "SANGAT AMAN";
  else if (score >= 60) verdict = "AMAN";
  else if (score >= 40) verdict = "CUKUP AMAN";
  else verdict = "PERLU PERHATIAN";

  lines.push("");
  lines.push("SKOR KEAMANAN: " + bar + " " + score + "/100");
  lines.push("Verdict: *" + verdict + "*");

  // Recommendations
  const recommendations = [];
  if (!isSelf) recommendations.push("Aktifkan Self Mode (.self) untuk batasi akses");
  if (!antiCall) recommendations.push("Aktifkan Anti-Call (.anticall on)");
  if (!antiSpam) recommendations.push("Aktifkan Anti-Spam (.antispam on)");
  if (!autoBackup) recommendations.push("Aktifkan Auto-Backup (.autobackup on)");
  if (activeCount < 5) recommendations.push("Aktifkan lebih banyak proteksi grup");

  if (recommendations.length > 0) {
    lines.push("");
    lines.push("REKOMENDASI:");
    recommendations.forEach((r, i) => {
      lines.push((i + 1) + ". " + r);
    });
  } else {
    lines.push("");
    lines.push("Semua proteksi sudah aktif. Mantap!");
  }

  return m.reply(claraWrap("Security Audit", lines));
}

export { pluginConfig as config, handler };
