// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Auto Backup to Google Drive — backup otomatis project ke Google Drive
// Gabungan nova-auto-backup.js (ZIP creation) + uploadgdrive.js (Drive upload)
// .autobackupdrive on <interval> — enable auto backup ke Drive
// .autobackupdrive off — disable
// .autobackupdrive status — cek status
// .autobackupdrive now — trigger backup manual ke Drive
// .autobackupdrive folder <id> — set Google Drive folder ID
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import { createBackup, parseInterval, formatInterval } from "../../src/lib/nova-auto-backup.js";
import fs from "fs";
import path from "path";
import { CronJob } from "cron";

const DRIVE_STATE_FILE = path.join(process.cwd(), "database", "autobackup_drive.json");
const CREDS_PATH = path.join(process.cwd(), "config", "gdrive-service-account.json");
const FOLDER_ID_FILE = path.join(process.cwd(), "config", "gdrive-folder-id.txt");

let _driveClient = null;
let _googleapis = null;
let activeCronJob = null;

const pluginConfig = {
  name: "autobackupdrive",
  alias: ["autobackupdrive"],
  category: "owner",
  description: "Auto backup project ke Google Drive secara berkala",
  usage: ".autobackupdrive on <interval> | .autobackupdrive off | .autobackupdrive status | .autobackupdrive now | .autobackupdrive folder <id>",
  example: ".autobackupdrive on 6h\n.autobackupdrive on 1d\n.autobackupdrive folder 1a2b3c4d",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function loadState() {
  try {
    if (fs.existsSync(DRIVE_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(DRIVE_STATE_FILE, "utf-8"));
    }
  } catch (e) { console.error("[autobackupdrive] loadState:", e.message); }
  return { enabled: false, intervalMs: 21600000, intervalStr: "6h", lastBackup: null, backupCount: 0, folderId: "" };
}

function saveState(state) {
  try {
    const dir = path.dirname(DRIVE_STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DRIVE_STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (e) { console.error("[autobackupdrive] saveState:", e.message); }
}

function getFolderId() {
  try {
    if (fs.existsSync(FOLDER_ID_FILE)) {
      return fs.readFileSync(FOLDER_ID_FILE, "utf-8").trim();
    }
  } catch {}
  return "";
}

async function loadGoogleAPIs() {
  if (_googleapis) return _googleapis;
  _googleapis = await import("googleapis");
  return _googleapis;
}

async function getDriveClient() {
  if (_driveClient) return _driveClient;
  if (!fs.existsSync(CREDS_PATH)) throw new Error("NO_CREDENTIALS");
  let credentials;
  try {
    credentials = JSON.parse(fs.readFileSync(CREDS_PATH, "utf-8"));
  } catch { throw new Error("INVALID_CREDENTIALS"); }
  if (!credentials.client_email || !credentials.private_key) throw new Error("INVALID_CREDENTIALS");
  const { google } = await loadGoogleAPIs();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  const authClient = await auth.getClient();
  _driveClient = google.drive({ version: "v3", auth: authClient });
  return _driveClient;
}

async function uploadToDrive(filePath, fileName, folderId) {
  const drive = await getDriveClient();
  const fileMetadata = { name: fileName };
  if (folderId) fileMetadata.parents = [folderId];
  const media = {
    mimeType: "application/zip",
    body: fs.createReadStream(filePath),
  };
  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, name, size, webViewLink",
  });
  return response.data;
}

function intervalToCron(ms) {
  if (ms >= 24 * 60 * 60 * 1000) {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    return `0 0 */${days} * *`;
  }
  if (ms >= 60 * 60 * 1000) {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    return `0 */${hours} * * *`;
  }
  const minutes = Math.floor(ms / (60 * 1000));
  return `*/${minutes} * * * *`;
}

async function doBackupDrive(sock, notifyJid) {
  const state = loadState();
  const folderId = state.folderId || getFolderId();

  try {
    // Step 1: Create ZIP backup
    const backup = await createBackup();
    const fileName = `nova-backup_${backup.timestamp}.zip`;

    // Step 2: Upload to Google Drive
    try {
      const result = await uploadToDrive(backup.path, fileName, folderId);
      state.lastBackup = Date.now();
      state.backupCount = (state.backupCount || 0) + 1;
      saveState(state);

      const sizeMB = (backup.size / 1024 / 1024).toFixed(2);
      let msg = `Backup ke Google Drive Berhasil\n\n`;
      msg += `File: ${fileName}\n`;
      msg += `Size: ${sizeMB} MB\n`;
      msg += `Files di-ZIP: ${backup.fileCount}\n`;
      msg += `Drive ID: ${result.id}\n`;
      if (result.webViewLink) msg += `Link: ${result.webViewLink}\n`;
      msg += `Total backup: ${state.backupCount}`;

      if (sock && notifyJid) {
        await sock.sendMessage(notifyJid, { text: claraWrap("Auto Backup Drive", msg) });
      }
      return { success: true, sizeMB, fileName, driveId: result.id };
    } catch (uploadErr) {
      let msg = `Backup ZIP berhasil tapi GAGAL upload ke Drive\n\n`;
      msg += `Error: ${uploadErr.message}\n`;
      msg += `File ZIP ada di: ${backup.path}\n\n`;
      if (uploadErr.message === "NO_CREDENTIALS" || uploadErr.message === "INVALID_CREDENTIALS") {
        msg += `Google Drive belum dikonfigurasi!\n`;
        msg += `Upload file "gdrive-service-account.json" ke folder config/\n`;
        msg += `Atau set folder ID: .autobackupdrive folder <id>`;
      }
      if (sock && notifyJid) {
        await sock.sendMessage(notifyJid, { text: claraWrap("Auto Backup Drive", msg) });
      }
      return { success: false, error: uploadErr.message, zipPath: backup.path };
    }
  } catch (e) {
    let msg = `Gagal membuat backup: ${e.message}`;
    if (sock && notifyJid) {
      await sock.sendMessage(notifyJid, { text: claraWrap("Auto Backup Drive", msg) });
    }
    return { success: false, error: e.message };
  }
}

function startCron(sock) {
  if (activeCronJob) activeCronJob.stop();
  const state = loadState();
  if (!state.enabled) return;
  const cronExpr = intervalToCron(state.intervalMs);
  activeCronJob = new CronJob(cronExpr, async () => {
    const ownerNum = (await import("../../config.js")).default?.owner?.number?.[0];
    const notifyJid = ownerNum ? ownerNum.replace(/[^0-9]/g, "") + "@s.whatsapp.net" : null;
    await doBackupDrive(sock, notifyJid);
  });
  activeCronJob.start();
}

async function handler(m, { sock }) {
  const args = m.text?.trim().split(/\s+/) || [];
  const action = args[0]?.toLowerCase();
  const state = loadState();

  if (!action) {
    const ownerNum = (await import("../../config.js")).default?.owner?.number?.[0] || "Tidak diset";
    let txt = `Auto Backup Google Drive\n\n`;
    txt += `Status: ${state.enabled ? "ON" : "OFF"}\n`;
    txt += `Interval: ${formatInterval(state.intervalMs)} (${state.intervalStr})\n`;
    txt += `Last backup: ${state.lastBackup ? new Date(state.lastBackup).toLocaleString("id-ID") : "-"}\n`;
    txt += `Total backup: ${state.backupCount}\n`;
    txt += `Drive folder: ${state.folderId || getFolderId() || "Tidak diset"}\n`;
    txt += `Notif ke: ${ownerNum}\n\n`;
    txt += `Cara Pakai:\n`;
    txt += `${m.prefix}autobackupdrive on <interval>\n`;
    txt += `${m.prefix}autobackupdrive off\n`;
    txt += `${m.prefix}autobackupdrive status\n`;
    txt += `${m.prefix}autobackupdrive now\n`;
    txt += `${m.prefix}autobackupdrive folder <id>\n\n`;
    txt += `Format interval: 30m, 1h, 6h, 1d\n\n`;
    txt += `Contoh:\n`;
    txt += `${m.prefix}autobackupdrive on 6h - backup tiap 6 jam\n`;
    txt += `${m.prefix}autobackupdrive on 1d - backup tiap 1 hari`;
    return await m.reply( txt, "autobackupdrive");
  }

  switch (action) {
    case "on":
    case "enable":
    case "start": {
      const intervalStr = args[1];
      if (!intervalStr) {
        return m.reply(claraWrap("Auto Backup Drive", [
          `Interval dibutuhkan!\n\n`,
          `${m.prefix}autobackupdrive on <interval>\n`,
          `Contoh: ${m.prefix}autobackupdrive on 6h\n`,
          `Format: 30m, 1h, 6h, 1d`,
        ].join("\n")));
      }
      const parsed = parseInterval(intervalStr);
      if (!parsed) {
        return m.reply(claraWrap("Auto Backup Drive", `Format interval salah!\n\nFormat: 30m, 1h, 6h, 1d\nMin: 1 menit, Max: 7 hari`));
      }
      // Cek credentials
      if (!fs.existsSync(CREDS_PATH)) {
        return m.reply(claraWrap("Auto Backup Drive", [
          `Google Drive belum dikonfigurasi!\n\n`,
          `Upload file "gdrive-service-account.json" ke folder config/\n`,
          `Contoh nama file: config/gdrive-service-account.json\n\n`,
          `Set folder ID: ${m.prefix}autobackupdrive folder <id>\n`,
          `(opsional - kalau kosong akan upload ke root Drive)`,
        ].join("\n")));
      }
      state.enabled = true;
      state.intervalMs = parsed.ms;
      state.intervalStr = parsed.str;
      saveState(state);
      startCron(sock);
      return m.reply(claraWrap("Auto Backup Drive", [
        `Auto backup Drive AKTIF!\n\n`,
        `Interval: ${formatInterval(parsed.ms)} (${parsed.str})\n`,
        `Cron: ${intervalToCron(parsed.ms)}\n`,
        `Folder: ${state.folderId || getFolderId() || "root Drive"}\n\n`,
        `Backup otomatis akan jalan sesuai interval.\n`,
        `Trigger manual: ${m.prefix}autobackupdrive now`,
      ].join("\n")));
    }

    case "off":
    case "disable":
    case "stop": {
      state.enabled = false;
      saveState(state);
      if (activeCronJob) { activeCronJob.stop(); activeCronJob = null; }
      return m.reply(claraWrap("Auto Backup Drive", "Auto backup Drive DIMATIKAN."));
    }

    case "status": {
      const hasCreds = fs.existsSync(CREDS_PATH);
      const folderId = state.folderId || getFolderId();
      let txt = `Auto Backup Drive Status\n\n`;
      txt += `Status: ${state.enabled ? "ON" : "OFF"}\n`;
      txt += `Interval: ${formatInterval(state.intervalMs)} (${state.intervalStr})\n`;
      txt += `Last backup: ${state.lastBackup ? new Date(state.lastBackup).toLocaleString("id-ID") : "-"}\n`;
      txt += `Total backup: ${state.backupCount}\n`;
      txt += `Drive folder: ${folderId || "Tidak diset (root)"}\n`;
      txt += `Credentials: ${hasCreds ? "Ada" : "TIDAK ADA - upload gdrive-service-account.json"}\n`;
      return m.reply(claraWrap("Auto Backup Drive", txt));
    }

    case "now":
    case "backup":
    case "manual": {
      await m.reply(claraWrap("Auto Backup Drive", "Memulai backup ke Google Drive..."));
      const ownerNum = (await import("../../config.js")).default?.owner?.number?.[0];
      const notifyJid = m.key?.remoteJid;
      const result = await doBackupDrive(sock, notifyJid);
      if (!result.success) {
        return m.reply(claraWrap("Auto Backup Drive", `Backup gagal: ${result.error || "Unknown error"}`));
      }
      return;
    }

    case "folder":
    case "setfolder": {
      const folderId = args[1];
      if (!folderId) {
        return m.reply(claraWrap("Auto Backup Drive", [
          `Set Google Drive folder ID\n\n`,
          `${m.prefix}autobackupdrive folder <id>\n`,
          `Contoh: ${m.prefix}autobackupdrive folder 1a2b3c4d5e6f\n\n`,
          `Cara dapet folder ID:\n`,
          `1. Buka folder di Google Drive\n`,
          `2. Copy ID dari URL (bagian terakhir)`,
        ].join("\n")));
      }
      state.folderId = folderId;
      saveState(state);
      // Juga save ke file biar uploadgdrive.js bisa baca
      try { fs.writeFileSync(FOLDER_ID_FILE, folderId, "utf-8"); } catch {}
      return m.reply(claraWrap("Auto Backup Drive", `Drive folder ID diset: *${folderId}*`));
    }

    default:
      return m.reply(claraWrap("Auto Backup Drive", `Command tidak dikenal.\n\nKetik: ${m.prefix}autobackupdrive`));
  }
}

// Init cron saat bot start (dipanggil dari connection.js jika perlu)
function initAutoBackupDrive(sock) {
  const state = loadState();
  if (state.enabled) startCron(sock);
}

export { pluginConfig as config, handler, initAutoBackupDrive };
