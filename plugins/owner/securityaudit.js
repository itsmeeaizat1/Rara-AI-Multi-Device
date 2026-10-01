// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { getBackupStatus } from "../../src/lib/nova-auto-backup.js";
import config from "../../config.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "securityaudit",
  alias: ["securityaudit"],
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
  const isSelf = db.setting("selfMode") ?? false;
  lines.push("Bot Mode: " + (isSelf ? "*SELF (Aman)*" : "*public* — semua orang bisa pakai"));
  if (!isSelf) {
    lines.push("⚠ Mode PUBLIC — siapapun bisa kirim perintah ke bot");
  }

  // Anti-call — DB setting (camelCase) fallback ke config
  lines.push("");
  lines.push("PROTEKSI TELEPON:");
  const antiCall = db.setting("antiCall") ?? config.features?.antiCall ?? false;
  lines.push("Anti-Call: " + (antiCall ? "✅ Aktif" : "❌ Nonaktif"));

  // Anti-spam DM — DB setting (antispamDM, object dgn .enabled)
  lines.push("");
  lines.push("PROTEKSI SPAM:");
  const antispamDMSetting = db.setting("antispamDM");
  const antiSpamDM = antispamDMSetting?.enabled === true;
  lines.push("Anti-Spam DM: " + (antiSpamDM ? "✅ Aktif" : "❌ Nonaktif"));

  // Anti-spam GC — per-group, cek group context
  const groupSettings = db.getGroup(groupId) || {};
  const antiSpamGC = groupSettings.antispam === true;
  lines.push("Anti-Spam GC (grup ini): " + (antiSpamGC ? "✅ Aktif" : "❌ Nonaktif"));

  // Anti link/virtex — per-group
  lines.push("");
  lines.push("PROTEKSI GRUP:");
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

  // Session security — autobackup pake getBackupStatus()
  lines.push("");
  lines.push("SESSION & DATA:");
  let backupInfo;
  try {
    backupInfo = getBackupStatus();
  } catch {
    backupInfo = { enabled: false };
  }
  lines.push("Auto-Backup: " + (backupInfo.enabled ? "✅ Aktif" : "❌ Nonaktif"));

  // Owner security
  lines.push("");
  lines.push("OWNER & AKSES:");
  const ownerList = db.owner || [];
  lines.push("Total Owner: " + ownerList.length);
  lines.push("Self Mode: " + (isSelf ? "✅ Aktif (aman)" : "❌ Nonaktif"));
  const onlyAdmin = db.setting("onlyAdmin") ?? false;
  lines.push("Only Admin: " + (onlyAdmin ? "✅ Aktif" : "❌ Nonaktif"));
  const onlyPC = db.setting("onlyPc") ?? false;
  lines.push("Only PC: " + (onlyPC ? "✅ Aktif" : "❌ Nonaktif"));

  // Banned & blocked users — cek dari users data
  const usersData = db.data?.users || {};
  let bannedCount = 0;
  let blockedCount = 0;
  for (const jid of Object.keys(usersData)) {
    if (usersData[jid]?.isBanned) bannedCount++;
    if (usersData[jid]?.isBlocked) blockedCount++;
  }
  lines.push("User dibanned: " + bannedCount);
  lines.push("Nomor diblokir: " + blockedCount);

  // Security score
  let score = 0;
  if (isSelf) score += 25;
  if (antiCall) score += 10;
  if (antiSpamDM) score += 10;
  if (antiSpamGC) score += 10;
  if (activeCount >= 5) score += 10;
  if (backupInfo.enabled) score += 10;
  if (isSelf) score += 10;
  if (bannedCount >= 0) score += 5; // sistem berfungsi
  if (blockedCount >= 0) score += 5;

  const bar = "▰".repeat(Math.floor(score / 10)) + "▱".repeat(10 - Math.floor(score / 10));

  let verdict;
  if (score >= 80) verdict = "SANGAT AMAN";
  else if (score >= 60) verdict = "AMAN";
  else if (score >= 40) verdict = "CUKUP AMAN";
  else verdict = "PERLU PERHATIAN";

  lines.push("");
  // FIX OWNER 2026-09-07: bar skor dikasih jarak biar gak dempet
  lines.push("SKOR KEAMANAN:");
  lines.push(bar + " " + score + "/100");
  lines.push("");
  lines.push("Verdict: *" + verdict + "*");

  // Recommendations
  const recommendations = [];
  if (!isSelf) recommendations.push("Aktifkan Self Mode (.self) untuk batasi akses");
  if (!antiCall) recommendations.push("Aktifkan Anti-Call (.anticall on)");
  if (!antiSpamDM) recommendations.push("Aktifkan Anti-Spam DM (.antispamdm on)");
  if (!backupInfo.enabled) recommendations.push("Aktifkan Auto-Backup (.autobackup on)");
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

  return m.reply(novaWrap("Security Audit", lines));
}

export { pluginConfig as config, handler };
