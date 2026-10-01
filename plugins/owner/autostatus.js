// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

/**
 * .autostatus — halaman status ON/OFF semua fitur automasi (owner only).
 * Menampilkan 33 plugin auto sekaligus dari sumber state masing-masing:
 * lib getter, db.data.automation, db.setting flag, file state, dan per-grup.
 */

import { raraError, raraBox, toSC } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { getBmkgStatus } from "../../src/lib/rara-bmkg-scheduler.js";
import { getHealthStatus } from "../../src/lib/rara-auto-api-health.js";
import { getReengageStatus } from "../../src/lib/rara-auto-reengage.js";
import { getRefillStatus } from "../../src/lib/rara-auto-refill.js";
import { getRenewalStatus } from "../../src/lib/rara-auto-renewal.js";
import { getReportStatus } from "../../src/lib/rara-auto-report.js";
import { getBirthdayStatus } from "../../src/lib/rara-auto-birthday.js";
import { getBackupStatus } from "../../src/lib/rara-auto-backup.js";
import { getSettings as getCleanCacheSettings } from "../../src/lib/rara-cache-cleaner.js";
import { getAllNotifyStatus } from "../../src/lib/rara-saluran-broadcast.js";
import fs from "fs";
import path from "path";

const pluginConfig = {
  name: "autostatus",
  alias: ["autostatus", "statusauto", "statusautoall"],
  category: "owner",
  description: "Cek status ON/OFF semua fitur automasi bot sekaligus",
  usage: ".autostatus",
  example: ".autostatus",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ── util aman: baca state tanpa bikin crash ──
function safe(fn, fallback = false) {
  try {
    const v = fn();
    return v === undefined || v === null ? fallback : v;
  } catch {
    return null; // null = tidak diketahui (gagal baca state)
  }
}

function readDriveState() {
  try {
    const p = path.join(process.cwd(), "src", "database", "auto", "autobackup_drive.json");
    if (!fs.existsSync(p)) return false;
    return !!JSON.parse(fs.readFileSync(p, "utf-8")).enabled;
  } catch {
    return null;
  }
}

/**
 * Kembalikan array { name, status } semua fitur automasi.
 * status: true | false | "on/off" (parsial) | "per-grup (...)" | null (tidak diketahui)
 */
function collectStatuses(m) {
  const db = getDatabase();
  const rows = [];

  // ── Lib getter ──
  rows.push({ name: "autobmkg", status: safe(() => !!getBmkgStatus().enabled) });
  rows.push({ name: "autohealth", status: safe(() => !!getHealthStatus().enabled) });
  rows.push({ name: "autoreengage", status: safe(() => !!getReengageStatus().enabled) });
  rows.push({ name: "autorefill", status: safe(() => !!getRefillStatus().enabled) });
  rows.push({ name: "autorenewal", status: safe(() => !!getRenewalStatus().enabled) });
  rows.push({ name: "autoreport", status: safe(() => !!getReportStatus().enabled) });
  rows.push({ name: "autoulah", status: safe(() => !!getBirthdayStatus().enabled) });
  rows.push({ name: "autobackup", status: safe(() => !!getBackupStatus().enabled) });
  rows.push({ name: "autobackupdrive", status: readDriveState() });
  rows.push({ name: "autocleancache", status: safe(() => !!getCleanCacheSettings().enabled) });

  // autobroadcastchannel: multi-event → bisa parsial
  const bc = safe(() => Object.values(getAllNotifyStatus()), null);
  if (Array.isArray(bc) && bc.length) {
    const on = bc.filter((e) => e.enabled).length;
    rows.push({ name: "autobroadcastchannel", status: on === 0 ? false : on === bc.length ? true : "on/off" });
  } else {
    rows.push({ name: "autobroadcastchannel", status: null });
  }

  // ── db.data.automation.<key> ──
  const auto = db?.db?.data?.automation || {};
  for (const [name, key] of [
    ["autochurn", "churnDetect"],
    ["autoconflict", "autoConflict"],
    ["autocontent", "autoContent"],
    ["autofailover", "autoFailover"],
    ["autoforward", "autoforward"],
    ["autolang", "autoLang"],
    ["automod", "automod"],
    ["autopredict", "autoPredict"],
    ["autoresource", "autoResource"],
    ["autosmartmod", "smartMod"],
    ["autosmartwelcome", "autoSmartWelcome"],
    ["autosummary", "autoSummary"],
    ["autoweeklyreport", "weeklyReport"],
  ]) {
    rows.push({ name, status: safe(() => !!auto[key]?.enabled) });
  }

  // ── db.setting flags ──
  rows.push({ name: "autoapicheck", status: safe(() => !!db.setting("apicheck_enabled")) });
  rows.push({ name: "autoplugin", status: safe(() => !!db.setting("autoplugin_enabled")) });
  rows.push({ name: "autoreactsticker", status: safe(() => !!db.setting("autoreactstickerEnabled")) });
  rows.push({ name: "autoreactvn", status: safe(() => !!db.setting("autoreactvnEnabled")) });
  rows.push({ name: "autosholat", status: safe(() => !!db.setting("autoSholat")) });

  // autoweatherrealtime: object { realtime, notification, ... } — default realtime ON saat belum diset
  const wr = safe(() => db.setting("weatherRealtime"), false);
  rows.push({
    name: "autoweatherrealtime",
    status: wr ? !!(wr.realtime || wr.notification) : true,
  });

  // autostatusview: object { read:{enabled}, react:{enabled} }
  const sv = safe(() => db.setting("autoStatusView"), null);
  rows.push({
    name: "autostatusview",
    status:
      sv === null
        ? false
        : sv.read?.enabled && sv.react?.enabled
          ? true
          : !(sv.read?.enabled || sv.react?.enabled)
            ? false
            : "on/off",
  });

  // ── Per-grup ──
  const inGroup = m?.isGroup || String(m?.chat || "").endsWith("@g.us");

  // autotranslatevn: db.data.autoVnTranslate { gid: { enabled, lang } }
  const vnMap = safe(() => db.db.data.autoVnTranslate, null);
  if (vnMap && typeof vnMap === "object") {
    const enabledGroups = Object.values(vnMap).filter((g) => g?.enabled).length;
    if (inGroup && vnMap[m.chat]) {
      rows.push({ name: "autotranslatevn", status: !!vnMap[m.chat].enabled });
    } else {
      rows.push({ name: "autotranslatevn", status: `per-grup (${enabledGroups} on)` });
    }
  } else {
    rows.push({ name: "autotranslatevn", status: "per-grup" });
  }

  // autosambut: groupData.autoSambut per grup
  if (inGroup) {
    const gd = safe(() => db.getGroup(m.chat), null);
    rows.push({ name: "autosambut", status: gd ? !!gd.autoSambut?.enabled : false });
  } else {
    rows.push({ name: "autosambut", status: "per-grup" });
  }

  return rows;
}

function formatStatus(s) {
  if (s === true) return "ON";
  if (s === false) return "OFF";
  if (s === null) return "?";
  return String(s);
}

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rows = collectStatuses(m);
    const lines = rows.map((r) => `• ${toSC(r.name)} : ${toSC(formatStatus(r.status))}`);

    const on = rows.filter((r) => r.status === true).length;
    const off = rows.filter((r) => r.status === false).length;
    const partial = rows.length - on - off;

    lines.push("---");
    lines.push(`• ${toSC("Total ON")} : ${on}`);
    lines.push(`• ${toSC("Total OFF")} : ${off}`);
    if (partial > 0) lines.push(`• ${toSC("Per-Grup/Parsial")} : ${partial}`);
    lines.push(`• ${toSC("Nyalakan")} : .autoxxx on`);

    const txt = raraBox("Status Automasi", lines);
    await m.react("🐣");
    return m.reply(txt);
  } catch (e) {
    console.error("[autostatus] error:", e.message || e);
    await m.react("❌");
    return m.reply(raraError("AutoStatus", e.message || "Gagal membaca status automasi"));
  }
}

export { pluginConfig as config, handler };
