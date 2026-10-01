// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// plugins/owner/ytcookies.js — LOGIN GOOGLE VIA WHATSAPP (1 Okt 2026)
//
// Fitur pendamping fix bot-check YouTube (.play lokal gagal terus):
// owner gak perlu SSH ke VPS buat upload cookies.txt — cukup KIRIM
// FILE cookies.txt langsung di chat, bot simpan ke data/yt-cookies.txt
// dan yt-dlp otomatis pakai flag --cookies (lihat src/scraper/rara-ytdlp.js
// getYtCookiesArgs). ENV NOVA_YTDLP_COOKIES tetap menang kalau diset.
//
// Cara pakai:
//   .ytcookies <kirim/reply file cookies.txt>  → simpan + validasi
//   .ytcookies status                          → ada/gak, umur file, ukuran
//   .ytcookies clear                           → hapus (balik mode tanpa login)
//
// Validasi: minimal 1 baris cookie domain youtube.com/google.com dalam
// format Netscape (7 kolom TAB) — file salah format ditolak JELAS,
// file lama GAK ditimpa sampai valid.
import fs from "fs";
import path from "path";
import { raraError, raraGuideV2, raraWrap } from "../../src/lib/rara-menu-style.js";

const COOKIES_PATH = path.join(process.cwd(), "data", "yt-cookies.txt");

// Baris Netscape valid: domain \t flag \t path \t secure \t expiry \t name \t value
const NETSCAPE_LINE = /^\S+\t\S+\t\S+\t\S+\t\d+\t\S+\t\S+/;

function validateCookies(content) {
  const text = String(content || "");
  if (!text.trim()) return { ok: false, reason: "File kosong." };
  const lines = text.split(/\r?\n/);
  let cookieLines = 0;
  let ytLines = 0;
  for (const l of lines) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    if (!NETSCAPE_LINE.test(t)) continue;
    cookieLines++;
    if (/\b(youtube\.com|google\.com|youtu\.be)\b/i.test(t.split("\t")[0])) ytLines++;
  }
  if (cookieLines < 1) {
    return { ok: false, reason: "Gak ada baris cookie format Netscape (7 kolom TAB) — pastikan file hasil export extension 'Get cookies.txt LOCALLY'." };
  }
  if (ytLines < 1) {
    return { ok: false, reason: "File valid tapi gak ada cookie domain youtube.com/google.com — export dari halaman youtube.com yang udah login." };
  }
  return { ok: true, cookieLines, ytLines };
}

function cookiesStatus() {
  try {
    if (!fs.existsSync(COOKIES_PATH)) return null;
    const st = fs.statSync(COOKIES_PATH);
    const res = validateCookies(fs.readFileSync(COOKIES_PATH, "utf-8"));
    return {
      size: st.size,
      modified: st.mtime,
      valid: res.ok,
      cookieLines: res.cookieLines || 0,
      ytLines: res.ytLines || 0,
      reason: res.reason,
    };
  } catch {
    return null;
  }
}

const pluginConfig = {
  name: "ytcookies",
  alias: ["ytcookies", "setytcookies", "loginyt", "ytlogin"],
  category: "owner",
  description: "Login Google/YouTube via WhatsApp — kirim file cookies.txt, .play langsung pulih dari blokir bot-check",
  usage: ".ytcookies — kirim/reply file cookies.txt buat login\n.ytcookies status — cek status cookies terpasang\n.ytcookies clear — hapus cookies (logout)",
  example: ".ytcookies (lalu kirim file cookies.txt)\n.ytcookies status",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const args = m.args || [];
  const sub = (args[0] || "").toLowerCase();

  // ── Sub: status ─────────────────────────────────────────────
  if (sub === "status") {
    const st = cookiesStatus();
    if (!st) {
      return m.reply(
        raraWrap("Yt Cookies", [
          "🔴 *tidak ada cookies terpasang*",
          "",
          "YouTube lagi ngeblokir IP server → .play/.playvideo gagal di konversi.",
          "",
          "📍 cara login:",
          "1. Browser yang login YouTube (akun sekunder!)",
          "2. Install extension 'Get cookies.txt LOCALLY'",
          "3. Buka youtube.com → extension → Export",
          "4. Kirim file cookies.txt ke chat + ketik .ytcookies",
        ].join("\n")),
      );
    }
    const ageDays = ((Date.now() - st.modified.getTime()) / 86400000).toFixed(1);
    return m.reply(
      raraWrap("Yt Cookies", [
        `${st.valid ? "🟢" : "🟡"} *cookies ${st.valid ? "valid" : "bermasalah"}*`,
        `• lokasi : data/yt-cookies.txt`,
        `• ukuran : ${(st.size / 1024).toFixed(1)} KB`,
        `• baris cookie : ${st.cookieLines} (yt: ${st.ytLines})`,
        `• umur : ${ageDays} hari${Number(ageDays) > 21 ? " ⚠️ mending ekspor ulang" : ""}`,
        st.valid ? "" : `• masalah : ${st.reason}`,
      ].filter(Boolean).join("\n")),
    );
  }

  // ── Sub: clear (logout) ─────────────────────────────────────
  if (sub === "clear" || sub === "off" || sub === "logout") {
    if (fs.existsSync(COOKIES_PATH)) {
      fs.unlinkSync(COOKIES_PATH);
      return m.reply(raraWrap("Yt Cookies", ["🟡 *cookies dihapus* — bot balik mode tanpa login YouTube.", "", "Kalau .play masih kebutuh login, kirim file cookies.txt baru."].join("\n")));
    }
    return m.reply(raraWrap("Yt Cookies", ["Tidak ada cookies tersimpan — sudah bersih dari awal."].join("\n")));
  }

  // ── Jalur utama: file cookies.txt dikirim/reply ─────────────
  const media = m.quoted?.isMedia ? m.quoted : m.isMedia ? m : null;
  if (!media) {
    return m.reply(
      raraGuideV2("ytcookies", {
        kaomoji: "(๑˃ᴗ˂)ﻭ",
        sapaan: "login Google/YouTube via chat — kirim file cookies.txt",
        cara: "kirim file cookies.txt di chat (atau reply file-nya) lalu ketik .ytcookies",
        contoh: ".ytcookies (sambil kirim/reply file cookies.txt)\n.ytcookies status\n.ytcookies clear",
        note: "export cookies dari youtube.com yang udah login (pakai akun SEKUNDER) lewat extension 'Get cookies.txt LOCALLY' — sekali kirim, .play pulih dari blokir bot-check",
      }),
    );
  }

  const doc = media.message?.documentMessage || {};
  const fileName = String(doc.fileName || "").toLowerCase();

  // File harus cookies .txt (nama bebas tapi ekstensi .txt)
  if (!fileName.endsWith(".txt")) {
    return m.reply(
      raraError("Yt Cookies", "File harus .txt (hasil export cookies). Kalau kamu kirim media lain, salah sasaran ya."),
    );
  }

  await m.react("🕒");
  let buffer;
  try {
    buffer = await media.download();
  } catch {
    await m.react("❌");
    return m.reply(raraError("Yt Cookies", "Gagal mengunduh file-nya. Coba kirim ulang."));
  }
  if (!buffer || buffer.length < 50) {
    await m.react("❌");
    return m.reply(raraError("Yt Cookies", "File kosong atau rusak."));
  }

  // Validasi SEBELUM nulis — file lama gak boleh ketimpa file salah
  const res = validateCookies(buffer.toString("utf-8"));
  if (!res.ok) {
    await m.react("❌");
    return m.reply(raraError("Yt Cookies", `File DITOLAK: ${res.reason}`));
  }

  // Simpan (backup file lama sekali buat jaga-jaga)
  try {
    const dir = path.dirname(COOKIES_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(COOKIES_PATH)) {
      fs.copyFileSync(COOKIES_PATH, COOKIES_PATH + ".bak");
    }
    fs.writeFileSync(COOKIES_PATH, buffer);
  } catch (e) {
    await m.react("❌");
    return m.reply(raraError("Yt Cookies", `Gagal menyimpan: ${e.message}`));
  }

  await m.react("🐣");
  return m.reply(
    raraWrap("Yt Cookies", [
      "🟢 *login youtube berhasil* 🎉",
      `• baris cookie : ${res.cookieLines} (yt: ${res.ytLines})`,
      "• tersimpan : data/yt-cookies.txt",
      "• yt-dlp : otomatis pakai cookies di download berikutnya",
      "",
      "📌 Tes langsung: ketik *.play lathi* — kalau masih bot-check, cookies-nya kurang segar, ekspor ulang.",
      "📌 Cookies expire beberapa minggu — begitu bot-check balik, kirim file baru lagi.",
    ].join("\n")),
  );
}

export { pluginConfig as config, handler, validateCookies, COOKIES_PATH, cookiesStatus };
