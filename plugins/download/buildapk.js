// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// plugins/download/buildapk.js — .buildapk (8 Okt 2026)
// Bikin APK dari: ZIP project (build.sh / Gradle Android / Flutter / HTML) ·
// repo GitHub · website (WebView APK, icon custom via reply gambar).
// Builder = server khusus "apk-builder" di panel (egg APK Builder), di-drive via HTTP API.
// Semua user boleh — limit 15 menit/job (owner bypass), 1 job global (queue-nya di builder).
import config from "../../config.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { runBuildJob, builderStatus, isBuilderEnabled, setBuilderEnabled,
         userCooldownLeft, markUsed, _setBuilderStoreForTest } from "../../src/lib/rara-apk-builder.js";

export const cmd = "buildapk";
export const args = ["[zip/repo/url/status]"];
export const category = "download";
export const restricted = false;
export const aliases = ["apkbuild"];
export const usage = "<reply zip project | repo github | web nama|url>";
export const description = "Build project jadi APK (script/Gradle/Flutter/WebView) via builder panel";

const usageCard = (p) => raraWrap("buildapk",
`🔨 BUILD APK — PROJECT → .APK
Kirim job ke builder (server panel khusus), hasil dikirim sebagai file APK siap install.

Cara pakai:
• ${p}buildapk — *reply ZIP project* (auto-deteksi jenis: build.sh / Gradle Android / Flutter / HTML)
• ${p}buildapk web Nama Aplikasi|https://website.com — *WebView APK* (reply gambar = icon custom)
• ${p}buildapk https://github.com/user/repo — clone repo lalu build
• ${p}buildapk status — lihat status builder & job jalan

Jenis project yang dikenal:
• build.sh / rara-build.sh → *build script custom* (bebas)
• gradlew → *Android native* (assembleDebug)
• pubspec.yaml → *Flutter* (build apk debug)
• index.html → *WebView APK* dari template

Catatan:
• 1 job pada satu waktu (antrian otomatis)
• Limit 1 build / 15 menit per user (owner bebas)
• Maks 200 MB, timeout 25 menit`);

export async function handler(m, { sock }) {
  const p = m.prefix || ".";
  const text = (m.text || "").trim();
  const isOwner = m.isOwner || false;
  const args = text.split(/\s+/).slice(1).filter(Boolean);

  // ── sub: status ──
  if (args[0]?.toLowerCase() === "status") {
    let st;
    try { st = await builderStatus(1); }
    catch (e) { return m.reply(raraWrap("buildapk", `⚠️ Builder belum siap.\n\n${e.message}`)); }
    const apks = st.apks.map((a) => `• ${a.name} (${(a.size / 1048576).toFixed(1)} MB)`).join("\n") || "-";
    return m.reply(raraWrap("buildapk", `📍 STATUS BUILDER APK
Server: ${st.info.name} (ID ${st.info.id})
State: *${st.state}*${st.type ? ` — ${st.type}` : ""}
Job terakhir: ${st.seconds ? st.seconds + " detik" : "-"}
APK terakhir:
${apks}
Fitur: *${isBuilderEnabled() ? "AKTIF" : "MATI"}*
${st.error ? `\nError terakhir: ${st.error}` : ""}`));
  }

  // ── sub: owner on/off ──
  if (["on", "off"].includes(args[0]?.toLowerCase())) {
    if (!isOwner) return m.reply(raraWrap("buildapk", "Khusus owner."));
    const v = setBuilderEnabled(args[0].toLowerCase() === "on");
    return m.reply(raraWrap("buildapk", `Fitur build APK *${v ? "diaktifkan" : "dimatikan"}*.`));
  }

  if (!isBuilderEnabled()) return m.reply(raraWrap("buildapk", "Fitur build APK lagi dimatikan owner."));

  // ── limit user (owner bypass) ──
  if (!isOwner) {
    const left = userCooldownLeft(m.sender);
    if (left > 0) return m.reply(raraWrap("buildapk", `⏳ Limit build 15 menit. Tunggu *${left} menit* lagi (owner bebas limit).`));
  }

  // ── deteksi job ──
  let job = null; let label = "";
  const sub = args[0]?.toLowerCase();

  if (sub === "web") {
    // .buildapk web Nama Aplikasi|https://url  (reply gambar = icon)
    const rest = args.slice(1).join(" ");
    const [name, url] = rest.split("|").map((s) => s?.trim()).filter(Boolean);
    if (!url) return m.reply(usageCard(p));
    let icon = null;
    const q = m.quoted;
    if (q && /image\/(png|jpe?g|webp)/.test(q.mimetype || "")) {
      try { icon = (await q.download()).toString("base64"); } catch {}
    }
    job = { kind: "json", payload: { url, name: name || "Rara App", ...(icon ? { icon } : {}) } };
    label = `WebView APK: ${name || url}`;
  } else if (/^https:\/\/(github\.com|gitlab\.com)\//.test(args[0] || "")) {
    job = { kind: "json", payload: { repo: args[0] } };
    label = `Repo: ${args[0]}`;
  } else if (m.quoted) {
    const q = m.quoted;
    const isZip = /zip/.test(q.mimetype || "") || /\.zip$/i.test(q.filename || q.fileName || "");
    const isHtml = /html/.test(q.mimetype || "") || /\.html?$/i.test(q.filename || "");
    const isImage = /image\/(png|jpe?g|webp)/.test(q.mimetype || "");
    if (!isZip && !isHtml && !isImage) {
      return m.reply(raraWrap("buildapk", "Reply file *ZIP project* (atau .html / gambar icon buat web)."));
    }
    let buf;
    try { buf = await q.download(); } catch { return m.reply(raraWrap("buildapk", "Gagal download file yang di-reply.")); }
    if (isZip && buf.length > 200 * 1024 * 1024) return m.reply(raraWrap("buildapk", "ZIP kegedean (max 200 MB)."));
    if (isHtml || (isImage && !isZip)) {
      // HTML / gambar dikirim apa adanya → builder deteksi index.html di dalam zip? kirim sbg web:
      // HTML di-reply = WebView app dari file itu (nama opsional di args)
      if (isHtml) {
        job = { kind: "zip", buffer: zipBare([["index.html", buf]]), payload: {} };
        label = "WebView APK dari HTML";
      } else {
        return m.reply(usageCard(p));
      }
    } else {
      job = { kind: "zip", buffer: buf, payload: {} };
      label = `Project: ${q.filename || "project.zip"}`;
    }
  } else {
    return m.reply(usageCard(p));
  }

  // ── jalankan ──
  await m.reply(raraWrap("buildapk", `🔨 *MULAI BUILD*
${label}
Jenis auto-deteksi oleh builder. Build pertama bisa makan 5–15 menit (unduh dependensi).
Bot kabari begitu APK-nya siap — gak perlu nunggu online.`));
  markUsed(m.sender);

  try {
    const r = await runBuildJob(1, job, () => {});
    const card = `✅ *BUILD APK BERHASIL*
Jenis: ${r.type}
Waktu: ${r.seconds} detik
Nama file: ${r.apkName}
Ukuran: ${(r.size / 1048576).toFixed(1)} MB

File .apk siap install — RARA AI - MULTI DEVICE | by Aizat`;
    await sock.sendMessage(m.chat, {
      document: r.buffer,
      fileName: r.apkName,
      mimetype: "application/vnd.android.package-archive",
      caption: raraWrap("buildapk", card),
      contextInfo: { forwardingScore: 0, isForwarded: false },
    }, { quoted: m });
  } catch (e) {
    return m.reply(raraWrap("buildapk", `❌ *BUILD GAGAL*\n\n${e.message}\n\nCek ulang project — atau .buildapk status buat lihat log builder.`));
  }
}

// helper kecil: bikin zip sederhana (store) buat HTML tunggal — pakai zlib raw.
// (biar gak nambah dep: format zip minimal dengan CRC.)
import zlib from "node:zlib";
function crc32(buf) {
  let c, table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c; }
  }
  c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function zipBare(files) {
  const chunks = []; const central = []; let off = 0;
  for (const [name, data] of files) {
    const nb = Buffer.from(name, "utf8"); const db = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const crc = crc32(db);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6); lh.writeUInt16LE(0, 8);
    lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0, 12); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(db.length, 18); lh.writeUInt32LE(db.length, 22); lh.writeUInt16LE(nb.length, 26); lh.writeUInt16LE(0, 28);
    chunks.push(lh, nb, db);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0, 8); ch.writeUInt16LE(0, 10);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(db.length, 20); ch.writeUInt32LE(db.length, 24);
    ch.writeUInt16LE(nb.length, 28); ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32); ch.writeUInt16LE(0, 34);
    ch.writeUInt16LE(0, 36); ch.writeUInt32LE(0, 38); ch.writeUInt32LE(off, 42);
    central.push(Buffer.concat([ch, nb]));
    off += 30 + nb.length + db.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...chunks, cd, end]);
}
