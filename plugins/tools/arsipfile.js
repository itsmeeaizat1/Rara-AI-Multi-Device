// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import AdmZip from "adm-zip";
import archiver from "archiver";
import * as tar from "tar";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import axios from "axios";
import { createWriteStream, createReadStream } from "node:fs";
import { createGzip, createGunzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "arsipfile",
  alias: ["arsipfile"],
  category: "tools",
  description: "Tools arsip file: create/extract zip, tar, tar.gz, gz, list, info",
  usage:
    ".arsipfile zip (reply file)\n.arsipfile unzip (reply zip)\n.arsipfile tar (reply file)\n.arsipfile untar (reply tar.gz)\n.arsipfile gz (reply file)\n.arsipfile ungz (reply .gz)\n.arsipfile list (reply arsip)\n.arsipfile info (reply arsip)",
  example: ".arsipfile zip",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function downloadFile(url) {
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 120000 });
  return Buffer.from(res.data);
}

function getTmpDir() {
  const dir = path.join(os.tmpdir(), "nova_arsip_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir) {
  try {
    if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) { console.error('[arsipfile.js]:', e.message); }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(2) + " MB";
}

async function getFilesFromMessage(m) {
  const files = [];
  // Quoted message
  if (m.quoted) {
    if (m.quoted.buffer) {
      files.push({ buffer: m.quoted.buffer, name: m.quoted.fileName || m.quoted.message?.documentMessage?.fileName || "file" });
    } else if (m.quoted.url) {
      try {
        const buffer = await downloadFile(m.quoted.url);
        files.push({ buffer, name: m.quoted.fileName || "file" });
      } catch (e) { console.error('[arsipfile.js]:', e.message); }
    }
  }
  // Current message
  if (m.buffer && (!m.quoted || !m.quoted.buffer)) {
    files.push({ buffer: m.buffer, name: m.fileName || m.message?.documentMessage?.fileName || "file" });
  } else if (m.url && (!m.quoted || !m.quoted.url)) {
    try {
      const buffer = await downloadFile(m.url);
      files.push({ buffer, name: m.fileName || "file" });
    } catch (e) { console.error('[arsipfile.js]:', e.message); }
  }
  return files;
}

async function handler(m, { sock }) {
  const subCmd = (m.args?.[0] || "").toLowerCase();

  if (!subCmd) {
    let txt = "ARSIP FILE TOOLS\n\n";
    txt += "1. zip — Buat arsip ZIP (reply 1+ file)\n";
    txt += "   .arsipfile zip\n\n";
    txt += "2. unzip — Extract arsip ZIP (reply .zip)\n";
    txt += "   .arsipfile unzip\n\n";
    txt += "3. tar — Buat arsip TAR.GZ (reply 1+ file)\n";
    txt += "   .arsipfile tar\n\n";
    txt += "4. untar — Extract arsip TAR.GZ (reply .tar.gz)\n";
    txt += "   .arsipfile untar\n\n";
    txt += "5. gz — Kompres file ke GZIP (reply 1 file)\n";
    txt += "   .arsipfile gz\n\n";
    txt += "6. ungz — Extract file GZIP (reply .gz)\n";
    txt += "   .arsipfile ungz\n\n";
    txt += "7. list — Lihat isi arsip (reply .zip/.tar.gz)\n";
    txt += "   .arsipfile list\n\n";
    txt += "8. info — Info arsip (reply .zip/.tar.gz)\n";
    txt += "   .arsipfile info\n\n";
    txt += "Format didukung: ZIP, TAR, TAR.GZ, GZ\n";
    txt += "Max ukuran file: 100 MB";
    return m.reply( txt, "arsipfile");
  }

  // === ZIP ===
  if (subCmd === "zip") return createZip(m, sock);

  // === UNZIP ===
  if (subCmd === "unzip" || subCmd === "extractzip" || subCmd === "unzipfile") return extractZip(m, sock);

  // === TAR ===
  if (subCmd === "tar" || subCmd === "targz") return createTar(m, sock);

  // === UNTAR ===
  if (subCmd === "untar" || subCmd === "extracttar" || subCmd === "untargz") return extractTar(m, sock);

  // === GZ ===
  if (subCmd === "gz" || subCmd === "gzip") return createGz(m, sock);

  // === UNGZ ===
  if (subCmd === "ungz" || subCmd === "ungzip" || subCmd === "gunzip") return extractGz(m, sock);

  // === LIST ===
  if (subCmd === "list" || subCmd === "isi" || subCmd === "contents") return listArchive(m, sock);

  // === INFO ===
  if (subCmd === "info" || subCmd === "detail") return archiveInfo(m, sock);

  return m.reply(claraWrap("Arsipfile", "Subcommand tidak dikenal. Ketik .arsipfile buat lihat daftar."));
}

// === CREATE ZIP ===
async function createZip(m, sock) {
  const files = await getFilesFromMessage(m);
  if (files.length === 0) {
    return m.reply(claraWrap("Arsipfile", "Reply 1 atau lebih file dengan caption .arsipfile zip"));
  }

  try {
    const tmpDir = getTmpDir();
    const zip = new AdmZip();

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = path.extname(f.name) || "";
      const base = path.basename(f.name, ext) || "file" + (i + 1);
      const fname = files.length > 1 ? base + ext : f.name;
      zip.addFile(fname, f.buffer);
    }

    const zipPath = path.join(tmpDir, "archive_" + Date.now() + ".zip");
    zip.writeZip(zipPath);

    const zipBuffer = fs.readFileSync(zipPath);
    await sock.sendMessage(m.chat, {
      document: { url: zipPath },
      fileName: "archive_" + Date.now() + ".zip",
      mimetype: "application/zip",
      caption: "Arsip ZIP dibuat\n\nFile: " + files.length + "\nUkuran: " + formatSize(zipBuffer.length),
    }, { quoted: m });

    cleanup(tmpDir);
  } catch (e) {
    return m.reply("Gagal bikin nih ZIP: " + e.message);
  }
}

// === EXTRACT ZIP ===
async function extractZip(m, sock) {
  const files = await getFilesFromMessage(m);
  if (files.length === 0) {
    return m.reply(claraWrap("Arsipfile", "Reply file ZIP dengan caption .arsipfile unzip"));
  }

  const file = files[0];
  const isZip = (file.name.endsWith(".zip") || file.buffer[0] === 0x50 && file.buffer[1] === 0x4B);

  if (!isZip) {
    return m.reply(claraWrap("Arsipfile", "File bukan arsip ZIP yang valid."));
  }

  try {
    const tmpDir = getTmpDir();
    const zipPath = path.join(tmpDir, "input.zip");
    fs.writeFileSync(zipPath, file.buffer);

    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();

    if (entries.length > 30) {
      cleanup(tmpDir);
      return m.reply(claraWrap("Info", "\u26a0\ufe0f Arsip terlalu banyak file (" + entries.length + "). Maksimal 30 file."));
    }

    zip.extractAllTo(tmpDir, true);

    let sent = 0;
    const allFiles = [];
    function scanDir(dir) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) {
          scanDir(full);
        } else if (item !== "input.zip") {
          allFiles.push(full);
        }
      }
    }
    scanDir(tmpDir);

    if (allFiles.length === 0) {
      cleanup(tmpDir);
      return m.reply(claraWrap("Arsipfile", "Arsip kosong, tidak ada file untuk diextract."));
    }

    await m.reply(claraWrap("Info", "\u23f3 Extracting " + allFiles.length + " file dari ZIP..."));

    for (const fp of allFiles.slice(0, 30)) {
      const relName = path.relative(tmpDir, fp);
      try {
        await sock.sendMessage(m.chat, {
          document: { url: fp },
          fileName: path.basename(relName),
          mimetype: "application/octet-stream",
        }, { quoted: m });
        sent++;
        if (sent < allFiles.length) await new Promise(r => setTimeout(r, 300));
      } catch (e) { console.error('[arsipfile.js]:', e.message); }
    }

    await m.reply(claraWrap("Info", "\u2705 Extract ZIP selesai. " + sent + " file terkirim."));
    cleanup(tmpDir);
  } catch (e) {
    return m.reply("Gagal extract ZIP: " + e.message);
  }
}

// === CREATE TAR.GZ ===
async function createTar(m, sock) {
  const files = await getFilesFromMessage(m);
  if (files.length === 0) {
    return m.reply(claraWrap("Arsipfile", "Reply 1 atau lebih file dengan caption .arsipfile tar"));
  }

  try {
    const tmpDir = getTmpDir();
    const tarPath = path.join(tmpDir, "archive_" + Date.now() + ".tar.gz");

    // Write files to temp dir
    const fileNames = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = path.extname(f.name) || "";
      const base = path.basename(f.name, ext) || "file" + (i + 1);
      const fname = files.length > 1 ? base + ext : f.name;
      const safeName = fname.replace(/[^a-zA-Z0-9._-]/g, "_");
      fs.writeFileSync(path.join(tmpDir, safeName), f.buffer);
      fileNames.push(safeName);
    }

    // Create tar.gz
    await tar.create({
      gzip: true,
      file: tarPath,
      cwd: tmpDir,
    }, fileNames);

    const tarBuffer = fs.readFileSync(tarPath);
    await sock.sendMessage(m.chat, {
      document: { url: tarPath },
      fileName: "archive_" + Date.now() + ".tar.gz",
      mimetype: "application/gzip",
      caption: "Arsip TAR.GZ dibuat\n\nFile: " + files.length + "\nUkuran: " + formatSize(tarBuffer.length),
    }, { quoted: m });

    cleanup(tmpDir);
  } catch (e) {
    return m.reply("Gagal bikin nih TAR.GZ: " + e.message);
  }
}

// === EXTRACT TAR.GZ ===
async function extractTar(m, sock) {
  const files = await getFilesFromMessage(m);
  if (files.length === 0) {
    return m.reply(claraWrap("Arsipfile", "Reply file TAR.GZ dengan caption .arsipfile untar"));
  }

  const file = files[0];

  try {
    const tmpDir = getTmpDir();
    const tarPath = path.join(tmpDir, "input.tar.gz");
    fs.writeFileSync(tarPath, file.buffer);

    await tar.extract({ file: tarPath, cwd: tmpDir });

    // Scan extracted files
    const allFiles = [];
    function scanDir(dir) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) {
          scanDir(full);
        } else if (item !== "input.tar.gz") {
          allFiles.push(full);
        }
      }
    }
    scanDir(tmpDir);

    if (allFiles.length === 0) {
      cleanup(tmpDir);
      return m.reply(claraWrap("Arsipfile", "Arsip kosong, tidak ada file untuk diextract."));
    }

    if (allFiles.length > 30) {
      cleanup(tmpDir);
      return m.reply(claraWrap("Info", "\u26a0\ufe0f Arsip terlalu banyak file (" + allFiles.length + "). Maksimal 30 file."));
    }

    await m.reply(claraWrap("Info", "\u23f3 Extracting " + allFiles.length + " file dari TAR.GZ..."));

    let sent = 0;
    for (const fp of allFiles.slice(0, 30)) {
      const relName = path.relative(tmpDir, fp);
      try {
        await sock.sendMessage(m.chat, {
          document: { url: fp },
          fileName: path.basename(relName),
          mimetype: "application/octet-stream",
        }, { quoted: m });
        sent++;
        if (sent < allFiles.length) await new Promise(r => setTimeout(r, 300));
      } catch (e) { console.error('[arsipfile.js]:', e.message); }
    }

    await m.reply(claraWrap("Info", "\u2705 Extract TAR.GZ selesai. " + sent + " file terkirim."));
    cleanup(tmpDir);
  } catch (e) {
    return m.reply("Gagal extract TAR.GZ: " + e.message);
  }
}

// === CREATE GZ ===
async function createGz(m, sock) {
  const files = await getFilesFromMessage(m);
  if (files.length === 0) {
    return m.reply(claraWrap("Arsipfile", "Reply 1 file dengan caption .arsipfile gz"));
  }

  if (files.length > 1) {
    return m.reply(claraWrap("Arsipfile", "GZIP hanya bisa kompres 1 file. Untuk multiple file, gunakan .arsipfile zip atau .arsipfile tar"));
  }

  const file = files[0];
  try {
    const tmpDir = getTmpDir();
    const inputPath = path.join(tmpDir, "input");
    const outputPath = path.join(tmpDir, "output.gz");
    fs.writeFileSync(inputPath, file.buffer);

    await pipeline(
      createReadStream(inputPath),
      createGzip(),
      createWriteStream(outputPath)
    );

    const gzBuffer = fs.readFileSync(outputPath);
    const originalName = path.basename(file.name, path.extname(file.name)) || "file";

    await sock.sendMessage(m.chat, {
      document: { url: outputPath },
      fileName: originalName + ".gz",
      mimetype: "application/gzip",
      caption: "GZIP dibuat\n\nAsli: " + formatSize(file.buffer.length) + "\nKompres: " + formatSize(gzBuffer.length) + "\nRasio: " + Math.round((1 - gzBuffer.length / file.buffer.length) * 100) + "%",
    }, { quoted: m });

    cleanup(tmpDir);
  } catch (e) {
    return m.reply("Gagal bikin nih GZIP: " + e.message);
  }
}

// === EXTRACT GZ ===
async function extractGz(m, sock) {
  const files = await getFilesFromMessage(m);
  if (files.length === 0) {
    return m.reply(claraWrap("Arsipfile", "Reply file .gz dengan caption .arsipfile ungz"));
  }

  const file = files[0];
  if (!file.name.endsWith(".gz") && !(file.buffer[0] === 0x1f && file.buffer[1] === 0x8b)) {
    return m.reply(claraWrap("Arsipfile", "File bukan GZIP yang valid."));
  }

  try {
    const tmpDir = getTmpDir();
    const inputPath = path.join(tmpDir, "input.gz");
    const baseName = file.name.endsWith(".gz") ? file.name.slice(0, -3) : path.basename(file.name, ".gz") || "output";
    const outputPath = path.join(tmpDir, baseName);
    fs.writeFileSync(inputPath, file.buffer);

    await pipeline(
      createReadStream(inputPath),
      createGunzip(),
      createWriteStream(outputPath)
    );

    const outBuffer = fs.readFileSync(outputPath);

    await sock.sendMessage(m.chat, {
      document: { url: outputPath },
      fileName: baseName,
      mimetype: "application/octet-stream",
      caption: "Extract GZIP selesai\n\nNama: " + baseName + "\nUkuran: " + formatSize(outBuffer.length),
    }, { quoted: m });

    cleanup(tmpDir);
  } catch (e) {
    return m.reply("Gagal extract GZIP: " + e.message);
  }
}

// === LIST ARCHIVE ===
async function listArchive(m, sock) {
  const files = await getFilesFromMessage(m);
  if (files.length === 0) {
    return m.reply(claraWrap("Arsipfile", "Reply file arsip dengan caption .arsipfile list"));
  }

  const file = files[0];

  try {
    let txt = "ISI ARSIP\n\n";
    let count = 0;
    let totalSize = 0;

    if (file.name.endsWith(".zip") || (file.buffer[0] === 0x50 && file.buffer[1] === 0x4B)) {
      // ZIP
      const tmpDir = getTmpDir();
      const zipPath = path.join(tmpDir, "temp.zip");
      fs.writeFileSync(zipPath, file.buffer);
      const zip = new AdmZip(zipPath);
      const entries = zip.getEntries();

      for (const entry of entries) {
        if (!entry.isDirectory) {
          count++;
          totalSize += entry.header.size;
          txt += count + ". " + entry.entryName + " (" + formatSize(entry.header.size) + ")\n";
        }
      }
      txt += "\nTotal: " + count + " file\n";
      txt += "Ukuran: " + formatSize(totalSize);
      cleanup(tmpDir);
    } else if (file.name.endsWith(".tar.gz") || file.name.endsWith(".tgz")) {
      // TAR.GZ
      const tmpDir = getTmpDir();
      const tarPath = path.join(tmpDir, "temp.tar.gz");
      fs.writeFileSync(tarPath, file.buffer);

      const entries = [];
      tar.t({
        file: tarPath,
        onentry: (entry) => {
          if (entry.type !== "Directory") {
            entries.push({ name: entry.path, size: entry.size });
          }
        },
        strict: false,
      }).then(() => {}).catch((e) => { console.error('[arsipfile.js]:', e.message); });

      // tar.t is sync-ish with callback, but we need to wait
      await new Promise((resolve) => {
        tar.t({
          file: tarPath,
          onentry: (entry) => {
            if (entry.type !== "Directory") {
              count++;
              totalSize += entry.size;
              txt += count + ". " + entry.path + " (" + formatSize(entry.size) + ")\n";
            }
          },
          strict: false,
        }).then(resolve).catch(resolve);
      });

      txt += "\nTotal: " + count + " file\n";
      txt += "Ukuran: " + formatSize(totalSize);
      cleanup(tmpDir);
    } else if (file.name.endsWith(".gz")) {
      // GZ - single file
      txt += "1. " + file.name.slice(0, -3) + "\n\n";
      txt += "Total: 1 file\n";
      txt += "GZIP hanya berisi 1 file";
    } else {
      return m.reply(claraWrap("Arsipfile", "Format tidak dikenali. Didukung: .zip, .tar.gz, .tgz, .gz"));
    }

    if (count > 50) {
      txt = txt.split("\n").slice(0, 55).join("\n") + "\n\n... (dipotong, terlalu banyak file)";
    }

    return m.reply( txt, "arsipfile");
  } catch (e) {
    return m.reply("Gagal membaca arsip: " + e.message);
  }
}

// === ARCHIVE INFO ===
async function archiveInfo(m, sock) {
  const files = await getFilesFromMessage(m);
  if (files.length === 0) {
    return m.reply(claraWrap("Arsipfile", "Reply file arsip dengan caption .arsipfile info"));
  }

  const file = files[0];

  try {
    let txt = "INFO ARSIP\n\n";
    txt += "Nama: " + file.name + "\n";
    txt += "Ukuran arsip: " + formatSize(file.buffer.length) + "\n";
    txt += "Format: ";

    let fileCount = 0;
    let totalUncompressed = 0;

    if (file.name.endsWith(".zip") || (file.buffer[0] === 0x50 && file.buffer[1] === 0x4B)) {
      txt += "ZIP\n\n";
      const tmpDir = getTmpDir();
      const zipPath = path.join(tmpDir, "temp.zip");
      fs.writeFileSync(zipPath, file.buffer);
      const zip = new AdmZip(zipPath);
      const entries = zip.getEntries();

      for (const entry of entries) {
        if (!entry.isDirectory) {
          fileCount++;
          totalUncompressed += entry.header.size;
        }
      }
      cleanup(tmpDir);
    } else if (file.name.endsWith(".tar.gz") || file.name.endsWith(".tgz")) {
      txt += "TAR.GZ\n\n";
      const tmpDir = getTmpDir();
      const tarPath = path.join(tmpDir, "temp.tar.gz");
      fs.writeFileSync(tarPath, file.buffer);

      await new Promise((resolve) => {
        tar.t({
          file: tarPath,
          onentry: (entry) => {
            if (entry.type !== "Directory") {
              fileCount++;
              totalUncompressed += entry.size;
            }
          },
          strict: false,
        }).then(resolve).catch(resolve);
      });
      cleanup(tmpDir);
    } else if (file.name.endsWith(".gz")) {
      txt += "GZIP\n\n";
      fileCount = 1;
      totalUncompressed = file.buffer.length * 3; // rough estimate
    } else {
      return m.reply(claraWrap("Arsipfile", "Format tidak dikenali. Didukung: .zip, .tar.gz, .tgz, .gz"));
    }

    txt += "Jumlah file: " + fileCount + "\n";
    txt += "Ukuran uncompressed: " + formatSize(totalUncompressed) + "\n";
    if (file.buffer.length > 0 && totalUncompressed > 0) {
      const ratio = Math.round((1 - file.buffer.length / totalUncompressed) * 100);
      txt += "Rasio kompresi: " + (ratio > 0 ? ratio + "%" : "0%");
    }

    return m.reply( txt, "arsipfile");
  } catch (e) {
    return m.reply("Gagal membaca info arsip: " + e.message);
  }
}

export { pluginConfig as config, handler };
