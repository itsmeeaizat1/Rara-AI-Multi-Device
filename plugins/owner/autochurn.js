// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .autochurn — Auto Churn Detection & Re-engagement
 *
 * Fitur automation "bot masa depan" #5:
 * - Detect user yang udah lama gak pakai bot (7/14/30 hari)
 * - Auto-kirim re-engagement message ke user yang churn
 * - Integrasi dengan data user (lastSeen di database)
 * - Threshold configurable per tier (warning, churn, critical)
 * - Custom message template dengan variable substitution
 * - Cooldown per user (gak spam user yang udah di-contact)
 * - Exclude premium & owner dari churn detection
 * - Scheduled check tiap hari (default: 10:00 WIB)
 *
 * Commands:
 *   .autochurn                         — Dashboard status
 *   .autochurn on/off                  — Aktifkan/matikan
 *   .autochurn scan                    — Scan churn sekarang (dry-run, no send)
 *   .autochurn send                    — Kirim re-engagement ke churned users
 *   .autochurn threshold <tier> <days> — Set threshold (warning/churn/critical)
 *   .autochurn cooldown <days>         — Set cooldown re-contact (default 14 hari)
 *   .autochurn message <tier> <text>   — Set custom message per tier
 *   .autochurn exclude add/del <jid>   — Exclude user dari detection
 *   .autochurn list                    — Lihat user yang churn saat ini
 *   .autochurn reset                   — Reset contact history
 *   .autochurn settime HH:MM           — Set jam auto-scan harian
 */

import { CronJob } from "cron";
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaGuide, toSC, novaBox } from "../../src/lib/nova-menu-style.js";
import config from "../../config.js";

const pluginConfig = {
  name: "autochurn",
  alias: ["autochurn", "churndetect", "churnalert"],
  category: "owner",
  description: "Auto Churn Detection — detect & re-engage user yang sudah tidak aktif",
  usage: ".autochurn <on/off/scan/send/threshold/cooldown/message/exclude/list/reset/settime>",
  example: ".autochurn scan",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ============================================================
// STATE
// ============================================================
let cronJob = null;

// ============================================================
// SETTINGS
// ============================================================
function getSettings() {
  const db = getDatabase();
  if (!db.db.data.automation) db.db.data.automation = {};
  if (!db.db.data.automation.churnDetect) {
    db.db.data.automation.churnDetect = {
      enabled: false,
      scanTime: "10:00", // harian 10:00 WIB
      thresholds: {
        warning: 7,   // 7 hari → warning message
        churn: 14,    // 14 hari → churn message
        critical: 30, // 30 hari → critical message
      },
      cooldownDays: 14, // jangan re-contact user dalam 14 hari setelah dikirim
      sendTo: "pm", // "pm" atau "owner" (pm = user, owner = notif owner saja)
      excludeJids: [], // jids yang di-exclude
      messages: {
        warning: "Hai {name}! Kamu udah {days} hari gak pakai Nova AI. Ada fitur baru loh, coba .menu ya!",
        churn: "Hey {name}, kangen bot? Kamu udah {days} hari gak make. Coba fitur terbaru: .tanyaai, .hd, .yt. Sayang banget kalau dilewatin!",
        critical: "{name}, kamu udah {days} hari gak pakai Nova AI. Kami kangen kamu! Jangan lupa balik ya, ketik .menu untuk lihat semua fitur terbaru.",
      },
      contactHistory: {}, // { jid: { lastContacted: ISO, tier: "warning" } }
      lastScan: null,
      stats: { totalScanned: 0, totalContacted: 0, totalReactivated: 0 },
    };
  }
  return db.db.data.automation.churnDetect;
}

function saveSettings(db) {
  db.markDirty("settings");
  db.db.write?.();
}

// ============================================================
// CHURN DETECTION LOGIC
// ============================================================

/**
 * Cek apakah user harus di-exclude (owner, premium, atau di-exclude list)
 */
function isExcluded(user, jid, settings) {
  // Owner gak perlu di-re-engage
  try {
    if (config.isOwner?.(jid)) return true;
  } catch {}
  // Premium user gak perlu di-re-engage (mereka udah paying)
  if (user?.isPremium) return true;
  // Banned user gak perlu
  if (user?.isBanned) return true;
  // Explicit exclude
  if (settings.excludeJids?.includes(jid)) return true;
  return false;
}

/**
 * Hitung hari sejak lastSeen
 */
function daysSinceLastSeen(user) {
  if (!user?.lastSeen) return null;
  try {
    const last = new Date(user.lastSeen).getTime();
    if (isNaN(last)) return null;
    return Math.floor((Date.now() - last) / 86400000);
  } catch {
    return null;
  }
}

/**
 * Tentukan tier berdasarkan days inactive
 */
function getChurnTier(days, thresholds) {
  if (days >= thresholds.critical) return "critical";
  if (days >= thresholds.churn) return "churn";
  if (days >= thresholds.warning) return "warning";
  return null;
}

/**
 * Cek apakah user masih dalam cooldown (sudah di-contact baru-baru ini)
 */
function isInCooldown(jid, settings) {
  const history = settings.contactHistory?.[jid];
  if (!history?.lastContacted) return false;
  const lastContact = new Date(history.lastContacted).getTime();
  if (isNaN(lastContact)) return false;
  const cooldownMs = (settings.cooldownDays || 14) * 86400000;
  return (Date.now() - lastContact) < cooldownMs;
}

/**
 * Format message dengan variable substitution
 */
function formatMessage(template, user, jid, days) {
  const name = user?.name || user?.regName || jid.split("@")[0] || "User";
  return template
    .replace(/\{name\}/g, name)
    .replace(/\{days\}/g, days)
    .replace(/\{jid\}/g, jid)
    .replace(/\{number\}/g, jid.split("@")[0]);
}

/**
 * Scan all users untuk churn detection
 * @param {boolean} dryRun — jika true, gak kirim pesan, cuma return data
 * @returns {Object} { warning: [], churn: [], critical: [], total: N }
 */
function scanChurn(dryRun = true) {
  const db = getDatabase();
  const settings = getSettings();
  const users = db.db.data.users || {};

  const result = {
    warning: [],
    churn: [],
    critical: [],
    total: 0,
    excluded: 0,
  };

  for (const [jid, user] of Object.entries(users)) {
    // Skip jika tidak ada lastSeen
    const days = daysSinceLastSeen(user);
    if (days === null) continue;

    // Skip excluded
    if (isExcluded(user, jid, settings)) {
      result.excluded++;
      continue;
    }

    // Skip jika masih dalam cooldown
    if (!dryRun && isInCooldown(jid, settings)) continue;

    const tier = getChurnTier(days, settings.thresholds);
    if (!tier) continue;

    const entry = {
      jid: `${jid}@s.whatsapp.net`,
      name: user?.name || user?.regName || jid,
      days,
      tier,
      lastSeen: user.lastSeen,
      isPremium: user.isPremium || false,
      isRegistered: user.isRegistered || false,
    };

    result[tier].push(entry);
    result.total++;
  }

  // Sort by days descending (paling lama di atas)
  for (const tier of ["warning", "churn", "critical"]) {
    result[tier].sort((a, b) => b.days - a.days);
  }

  // Update stats
  settings.stats.totalScanned = Object.keys(users).length;
  settings.lastScan = new Date().toISOString();
  saveSettings(db);

  return result;
}

/**
 * Kirim re-engagement messages
 */
async function sendReengagement(sock, dryRun = false) {
  const settings = getSettings();
  const db = getDatabase();
  const scanResult = scanChurn(false);

  let sentCount = 0;
  let failCount = 0;
  const contacted = [];

  // Kirim dari critical dulu, lalu churn, lalu warning
  for (const tier of ["critical", "churn", "warning"]) {
    const users = scanResult[tier];
    const template = settings.messages[tier] || settings.messages.warning;

    for (const entry of users) {
      // Skip kalau masih dalam cooldown
      if (isInCooldown(entry.jid, settings)) continue;

      if (dryRun) {
        contacted.push({ ...entry, message: formatMessage(template, { name: entry.name }, entry.jid, entry.days) });
        continue;
      }

      try {
        const msg = formatMessage(template, { name: entry.name }, entry.jid, entry.days);
        await sock.sendMessage(entry.jid, { text: msg });

        // Record contact
        if (!settings.contactHistory) settings.contactHistory = {};
        settings.contactHistory[entry.jid] = {
          lastContacted: new Date().toISOString(),
          tier,
          daysInactive: entry.days,
        };

        sentCount++;
        contacted.push(entry);
      } catch (e) {
        console.error(`[autochurn] Failed to send to ${entry.jid}:`, e.message);
        failCount++;
      }

      // Delay 2 detik antar kirim biar gak rate-limit
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // Update stats
  settings.stats.totalContacted += sentCount;
  saveSettings(db);

  // Notifikasi owner
  const ownerNums = (config.owner?.number || []).map((n) => `${n}@s.whatsapp.net`);
  if (ownerNums.length > 0 && !dryRun && sentCount > 0) {
    const summary = novaBox(toSC("Churn Re-engagement"), [
      `${toSC("Terkirim")}: ${sentCount} ${toSC("user")}`,
      `${toSC("Gagal")}: ${failCount}`,
      `Warning: ${scanResult.warning.length}`,
      `Churn: ${scanResult.churn.length}`,
      `Critical: ${scanResult.critical.length}`,
    ]);
    for (const num of ownerNums) {
      try {
        await sock.sendMessage(num, { text: summary });
      } catch {}
    }
  }

  return { sentCount, failCount, contacted, scanResult };
}

// ============================================================
// CRON SCHEDULER
// ============================================================
function startCron(sock) {
  if (cronJob) cronJob.stop();

  const settings = getSettings();
  if (!settings.enabled) return;

  const [hour, minute] = (settings.scanTime || "10:00").split(":");
  cronJob = new CronJob(
    `0 ${minute || "00"} ${hour || "10"} * * *`,
    async () => {
      console.log("[autochurn] Cron triggered — scanning churned users...");
      await sendReengagement(sock, false);
    },
    null,
    true,
    "Asia/Jakarta"
  );

  console.log(`[autochurn] Cron started — daily ${settings.scanTime} WIB`);
}

function stopCron() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
  }
}

// ============================================================
// EXPORT FOR INDEX.JS
// ============================================================
export function startChurnMonitor(sock) {
  const settings = getSettings();
  if (settings.enabled) {
    startCron(sock);
  }
  console.log(`[autochurn] Monitor started — enabled: ${settings.enabled}, time: ${settings.scanTime}`);
}

export function stopChurnMonitor() {
  stopCron();
}

// ============================================================
// HANDLER
// ============================================================
async function handler(m, { sock, config: botConfig }) {
  const args = m.args || [];
  const subCmd = (args[0] || "").toLowerCase();
  const settings = getSettings();
  const db = getDatabase();

  // .autochurn (no args) — dashboard
  if (!subCmd || subCmd === "status" || subCmd === "dashboard") {
    const lines = [
      `Status: ${settings.enabled ? toSC("AKTIF") : toSC("MATI")}`,
      `Scan Time: ${settings.scanTime} WIB`,
      `Cooldown: ${settings.cooldownDays} hari`,
      `Send To: ${settings.sendTo === "owner" ? "Notif Owner" : toSC("PM User")}`,
      `Last Scan: ${settings.lastScan ? new Date(settings.lastScan).toLocaleString("id-ID") : "-"}`,
      ``,
      { sub: toSC("Thresholds") },
      `  Warning: ${settings.thresholds.warning} hari`,
      `  Churn: ${settings.thresholds.churn} hari`,
      `  Critical: ${settings.thresholds.critical} hari`,
      ``,
      { sub: toSC("Stats") },
      `  Total Scanned: ${settings.stats.totalScanned}`,
      `  Total Contacted: ${settings.stats.totalContacted}`,
      `  Excluded Users: ${settings.excludeJids?.length || 0}`,
      ``,
      `${toSC("Ketik")} .autochurn scan ${toSC("untuk cek churn sekarang")}`,
    ];

    await m.reply(novaBox(toSC("Auto Churn Detection"), lines));
    return;
  }

  // .autochurn on
  if (subCmd === "on") {
    settings.enabled = true;
    saveSettings(db);
    startCron(sock);
    await m.reply(novaBox(toSC("Auto Churn Detection"), [
      toSC("Churn detection AKTIF"),
      `Scan: harian ${settings.scanTime} WIB`,
      `Threshold: warning ${settings.thresholds.warning}d, churn ${settings.thresholds.churn}d, critical ${settings.thresholds.critical}d`,
    ]));
    return;
  }

  // .autochurn off
  if (subCmd === "off") {
    settings.enabled = false;
    saveSettings(db);
    stopCron();
    await m.reply(novaBox(toSC("Auto Churn Detection"), [
      toSC("Churn detection DIMATIKAN"),
    ]));
    return;
  }

  // .autochurn scan — dry-run scan
  if (subCmd === "scan") {
    await m.react("🕒");
    const result = scanChurn(true);

    if (result.total === 0) {
      await m.react("🐣");
      await m.reply(novaBox(toSC("Churn Scan Result"), [
        toSC("Tidak ada user churn"),
        `${toSC("Total user di DB")}: ${result.totalScanned}`,
        `${toSC("Excluded")}: ${result.excluded}`,
      ]));
      return;
    }

    const lines = [
      `${toSC("Total Churn")}: ${result.total}`,
      `${toSC("Excluded")}: ${result.excluded}`,
      ``,
    ];

    // Tampilkan top 5 per tier
    for (const tier of ["critical", "churn", "warning"]) {
      const list = result[tier];
      if (list.length === 0) continue;

      const tierLabel = tier === "critical" ? toSC("Critical") + ` (${settings.thresholds.critical}+ hari)` :
                       tier === "churn" ? toSC("Churn") + ` (${settings.thresholds.churn}+ hari)` :
                       toSC("Warning") + ` (${settings.thresholds.warning}+ hari)`;
      lines.push({ sub: `${tierLabel} — ${list.length} ${toSC("user")}` });

      for (const u of list.slice(0, 5)) {
        const name = (u.name || u.jid.split("@")[0]).slice(0, 18);
        lines.push(`  ${name} — ${u.days}d`);
      }
      if (list.length > 5) {
        lines.push(`  ...+${list.length - 5} ${toSC("lainnya")}`);
      }
      lines.push(``);
    }

    lines.push(`${toSC("Ketik")} .autochurn send ${toSC("untuk kirim re-engagement")}`);

    await m.react("🐣");
    await m.reply(novaBox(toSC("Churn Scan Result"), lines));
    return;
  }

  // .autochurn send — kirim re-engagement
  if (subCmd === "send") {
    await m.react("🕒");
    const result = await sendReengagement(sock, false);

    await m.react("🐣");
    await m.reply(novaBox(toSC("Re-engagement Sent"), [
      `${toSC("Terkirim")}: ${result.sentCount} ${toSC("user")}`,
      `${toSC("Gagal")}: ${result.failCount}`,
      ``,
      `Warning: ${result.scanResult.warning.length}`,
      `Churn: ${result.scanResult.churn.length}`,
      `Critical: ${result.scanResult.critical.length}`,
    ]));
    return;
  }

  // .autochurn threshold <tier> <days>
  if (subCmd === "threshold") {
    const tier = args[1]?.toLowerCase();
    const days = parseInt(args[2]);

    if (!tier || !["warning", "churn", "critical"].includes(tier)) {
      return m.reply(novaError("autochurn", "Tier: warning/churn/critical", ".autochurn threshold churn 14"));
    }
    if (isNaN(days) || days < 1 || days > 365) {
      return m.reply(novaError("autochurn", "Days: 1-365", ".autochurn threshold churn 14"));
    }

    // Validate tier ordering: warning < churn < critical
    const t = { ...settings.thresholds, [tier]: days };
    if (t.warning >= t.churn || t.churn >= t.critical) {
      return m.reply(novaError("autochurn", "warning < churn < critical wajib berurutan", ".autochurn threshold churn 14"));
    }

    settings.thresholds[tier] = days;
    saveSettings(db);

    await m.reply(novaBox(toSC("Threshold Updated"), [
      `Warning: ${t.warning} hari`,
      `Churn: ${t.churn} hari`,
      `Critical: ${t.critical} hari`,
    ]));
    return;
  }

  // .autochurn cooldown <days>
  if (subCmd === "cooldown") {
    const days = parseInt(args[1]);
    if (isNaN(days) || days < 1 || days > 90) {
      return m.reply(novaError("autochurn", "Days: 1-90", ".autochurn cooldown 14"));
    }

    settings.cooldownDays = days;
    saveSettings(db);

    await m.reply(novaBox(toSC("Cooldown Updated"), [
      `Cooldown: ${days} hari`,
      toSC("User gak akan di-contact lagi dalam periode ini"),
    ]));
    return;
  }

  // .autochurn message <tier> <text>
  if (subCmd === "message") {
    const tier = args[1]?.toLowerCase();
    const text = args.slice(2).join(" ");

    if (!tier || !["warning", "churn", "critical"].includes(tier)) {
      return m.reply(novaError("autochurn", "Tier: warning/churn/critical", ".autochurn message churn Hey {name}, kangen?"));
    }
    if (!text) {
      // Show current message
      await m.reply(novaBox(toSC("Current Message") + `: ${tier}`, [
        settings.messages[tier] || toSC("(belum diset)"),
        ``,
        toSC("Variables: {name} {days} {jid} {number}"),
      ]));
      return;
    }

    settings.messages[tier] = text;
    saveSettings(db);

    await m.reply(novaBox(toSC("Message Updated"), [
      `Tier: ${tier}`,
      `Message: ${text}`,
    ]));
    return;
  }

  // .autochurn exclude add/del <jid>
  if (subCmd === "exclude") {
    const action = args[1]?.toLowerCase();
    const jid = args[2]?.replace(/@s\.whatsapp\.net$/, "");

    if (!action || !["add", "del"].includes(action)) {
      return m.reply(novaError("autochurn", "Action: add/del", ".autochurn exclude add 628xxx"));
    }
    if (!jid) {
      return m.reply(novaError("autochurn", "Butuh nomor/JID", ".autochurn exclude add 628xxx"));
    }

    if (action === "add") {
      if (!settings.excludeJids.includes(jid)) {
        settings.excludeJids.push(jid);
      }
      saveSettings(db);
      await m.reply(novaBox(toSC("Exclude Updated"), [
        `${toSC("Ditambahkan")}: ${jid}`,
        `Total excluded: ${settings.excludeJids.length}`,
      ]));
    } else {
      settings.excludeJids = settings.excludeJids.filter((j) => j !== jid);
      saveSettings(db);
      await m.reply(novaBox(toSC("Exclude Updated"), [
        `${toSC("Dihapus")}: ${jid}`,
        `Total excluded: ${settings.excludeJids.length}`,
      ]));
    }
    return;
  }

  // .autochurn list — lihat user churn saat ini
  if (subCmd === "list") {
    await m.react("🕒");
    const result = scanChurn(true);

    if (result.total === 0) {
      await m.react("🐣");
      await m.reply(novaBox(toSC("Churned Users"), [
        toSC("Tidak ada user churn saat ini"),
      ]));
      return;
    }

    const lines = [`${toSC("Total")}: ${result.total}`, ``];

    for (const tier of ["critical", "churn", "warning"]) {
      const list = result[tier];
      if (list.length === 0) continue;

      lines.push({ sub: `${tier.toUpperCase()} — ${list.length}` });
      for (const u of list.slice(0, 10)) {
        const name = (u.name || u.jid.split("@")[0]).slice(0, 18);
        const status = u.isRegistered ? "" : toSC(" (unreg)");
        lines.push(`  ${name} — ${u.days}d${status}`);
      }
      if (list.length > 10) {
        lines.push(`  ...+${list.length - 10} ${toSC("lainnya")}`);
      }
      lines.push(``);
    }

    await m.react("🐣");
    await m.reply(novaBox(toSC("Churned Users"), lines));
    return;
  }

  // .autochurn settime HH:MM
  if (subCmd === "settime") {
    const time = args[1];
    if (!time || !/^\d{1,2}:\d{2}$/.test(time)) {
      return m.reply(novaError("autochurn", "Format: HH:MM", ".autochurn settime 10:00"));
    }

    settings.scanTime = time;
    saveSettings(db);

    if (settings.enabled) {
      stopCron();
      startCron(sock);
    }

    await m.reply(novaBox(toSC("Scan Time Updated"), [
      `Daily: ${time} WIB`,
    ]));
    return;
  }

  // .autochurn reset
  if (subCmd === "reset") {
    settings.contactHistory = {};
    settings.stats = { totalScanned: 0, totalContacted: 0, totalReactivated: 0 };
    settings.lastScan = null;
    saveSettings(db);

    await m.reply(novaBox(toSC("Auto Churn Detection"), [
      toSC("Contact history & stats direset"),
      toSC("Threshold & message tetap"),
    ]));
    return;
  }

  // .autochurn sendto pm/owner
  if (subCmd === "sendto") {
    const target = args[1]?.toLowerCase();
    if (target !== "pm" && target !== "owner") {
      return m.reply(novaError("autochurn", "Pilih: pm (user) atau owner (notif)", ".autochurn sendto pm"));
    }

    settings.sendTo = target;
    saveSettings(db);

    await m.reply(novaBox(toSC("Send Target Updated"), [
      `Send to: ${target === "owner" ? toSC("Notif Owner saja") : toSC("PM User")}`,
    ]));
    return;
  }

  // Unknown
  return m.reply(novaError("autochurn", novaGuide(botConfig.command?.prefix || ".", "autochurn", m.pushName), ".autochurn scan"));
}

export { pluginConfig, handler };
