// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// dbexport.js — Export database bot jadi file Excel (.xlsx) pakai exceljs
// Fitur baru 9 Sep 2026 (request owner: fitur baru biar nambah dependencies)
// Owner only — data semua pemain sensitif.
//   .dbexport        → full export (Ringkasan + RPG + Users + Groups)
//   .dbexport rpg    → cuma sheet Pemain RPG
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

// kartu info media (batch owner) — helper ringkas, best-effort tak pernah ganggu kirim
async function dlCard(type, probe, request) {
  try {
    const info = probe.buffer != null ? await probeBuffer(probe.buffer, { mime: probe.mime }) : await probeMedia(probe.url);
    return mediaResultCard({
      header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
      type, request,
      size: info?.size, mime: info?.mime, width: info?.width, height: info?.height, duration: info?.duration,
    });
  } catch { return null; }
}

const TMP_DIR = path.join(process.cwd(), "tmp");

const pluginConfig = {
  name: "dbexport",
  alias: ["dbexport", "exportdb", "dbexcel", "exceldb"],
  category: "owner",
  description: "Export database bot jadi file Excel .xlsx (owner only)",
  usage: ".dbexport\n.dbexport rpg",
  example: ".dbexport",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 20,
  energi: 0,
  isEnabled: true,
};

const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF00A884" } };

function styleHeaderRow(sheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
  row.eachCell((cell) => { cell.fill = HEADER_FILL; cell.alignment = { vertical: "middle", horizontal: "center" }; });
  row.height = 22;
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

function autoWidth(sheet) {
  sheet.columns.forEach((col) => {
    let max = 10;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 3, 34);
  });
}

function buildRingkasanSheet(wb, db) {
  const users = Object.values(db.data.users || {});
  const groups = Object.keys(db.data.groups || {});
  const rpgPlayers = users.filter((u) => u.rpg);
  const premium = users.filter((u) => u.premium);

  const totalGold = rpgPlayers.reduce((s, u) => s + (u.rpg.gold || 0), 0);
  const totalCash = rpgPlayers.reduce((s, u) => s + (u.rpg.cash || 0), 0);

  const ws = wb.addWorksheet("Ringkasan");
  ws.columns = [{ width: 30 }, { width: 32 }];
  ws.addRow(["📊 RARA AI — EXPORT DATABASE"]);
  ws.getRow(1).font = { bold: true, size: 14, color: { argb: "FF00A884" } };
  const rows = [
    ["Waktu Export", new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })],
    ["Total User", users.length],
    ["Total Grup", groups.length],
    ["Pemain RPG", rpgPlayers.length],
    ["User Premium", premium.length],
    ["Total Gold (semua pemain)", totalGold],
    ["Total Uang (semua pemain)", "Rp " + totalCash.toLocaleString("id-ID")],
  ];
  rows.forEach(([k, v]) => ws.addRow([k, v]).font = { bold: true });
  ws.getColumn(2).font = { bold: false };
  return ws;
}

function buildRpgSheet(wb, db) {
  const ws = wb.addWorksheet("Pemain RPG");
  ws.columns = [
    { header: "No" }, { header: "Nama" }, { header: "Nomor" },
    { header: "Level" }, { header: "EXP" }, { header: "Gold" },
    { header: "Uang (Rp)" }, { header: "Energi" },
    { header: "Level Kerja" }, { header: "PVP" }, { header: "Kills" }, { header: "Boss Kills" },
  ].map((c) => ({ ...c }));

  const players = Object.values(db.data.users || {}).filter((u) => u.rpg);
  players
    .sort((a, b) => (b.rpg.gold || 0) - (a.rpg.gold || 0))
    .forEach((u, i) => {
      const r = u.rpg;
      ws.addRow([
        i + 1, u.name || "-", u.number || "-",
        r.level || 1, r.exp || 0, r.gold || 0,
        r.cash || 0, r.energi ?? "-",
        r.jobLevel || 1, r.pvpRating || 1000, r.totalKills || 0, r.bossKills || 0,
      ]);
    });
  // number format kolom numerik
  ["E", "F", "G"].forEach((col) => { ws.getColumn(col).numFmt = "#,##0"; });
  styleHeaderRow(ws);
  autoWidth(ws);
  return ws;
}

function buildUsersSheet(wb, db) {
  const ws = wb.addWorksheet("Users");
  ws.columns = [
    { header: "No" }, { header: "Nama" }, { header: "Nomor" },
    { header: "Premium" }, { header: "Limit" }, { header: "Energi" },
    { header: "Terdaftar Sebagai Pemain RPG" },
  ];
  Object.values(db.data.users || {}).forEach((u, i) => {
    ws.addRow([
      i + 1, u.name || "-", u.number || "-",
      u.premium ? "Ya" : "Tidak", u.energi ?? "-", u.energi ?? "-",
      u.rpg ? "Ya" : "Tidak",
    ]);
  });
  styleHeaderRow(ws);
  autoWidth(ws);
  return ws;
}

function buildGroupsSheet(wb, db) {
  const ws = wb.addWorksheet("Groups");
  ws.columns = [{ header: "No" }, { header: "ID Grup" }, { header: "Jumlah Setting" }];
  Object.keys(db.data.groups || {}).forEach((gid, i) => {
    const g = db.data.groups[gid] || {};
    ws.addRow([i + 1, gid, Object.keys(g).length]);
  });
  styleHeaderRow(ws);
  autoWidth(ws);
  return ws;
}

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const db = getDatabase();
    const mode = (m.args[0] || "").toLowerCase();
    const rpgOnly = ["rpg", "pemain", "rpgplayer"].includes(mode);

    const wb = new ExcelJS.Workbook();
    wb.creator = "Rara AI";
    wb.created = new Date();

    buildRpgSheet(wb, db);
    if (!rpgOnly) {
      buildRingkasanSheet(wb, db);
      buildUsersSheet(wb, db);
      buildGroupsSheet(wb, db);
    }

    const buffer = await wb.xlsx.writeBuffer();

    if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
    const fileName = `dbexport-${rpgOnly ? "rpg-" : ""}${Date.now()}.xlsx`;
    const filePath = path.join(TMP_DIR, fileName);
    fs.writeFileSync(filePath, buffer);

    const rpgCount = Object.values(db.data.users || {}).filter((u) => u.rpg).length;
    const caption =
      `📗 *dbexport* *selesai*\n\n` +
      `${rpgOnly ? "Mode: RPG only\n" : "Mode: Full (Ringkasan + RPG + Users + Groups)\n"}` +
      `Pemain RPG: ${rpgCount} | User: ${Object.keys(db.data.users || {}).length}\n` +
      `Waktu: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`;

    const card = await dlCard("dokumen", { buffer: fs.readFileSync(filePath), mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }, [["Engine", "XLSX Export Database"], ["Pemain RPG", String(rpgCount || "-")], ["Nama File", String(fileName || "-").slice(0, 50)]]);
    await sock.sendMessage(m.chat, {
      document: { url: filePath },
      fileName,
      mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      caption: card ? `${caption}\n\n${card}` : caption,
    }, { quoted: m });
    await m.react("🐣");
  } catch (e) {
    await m.react("❌");
    m.reply(raraWrap("dbexport", "Gagal export database: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
