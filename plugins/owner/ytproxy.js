// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// plugins/owner/ytproxy.js — PROXY YOUTUBE VIA WHATSAPP (1 Okt 2026)
//
// FALLBACK KEDUA buat fix bot-check YouTube (request owner: "fallback kedua
// klo yt dlp ke limit"). Kalau cookies (fix pertama, .ytcookies) belum ada /
// expire, yt-dlp bisa lewat PROXY — IP proxy gak kena blokir datacenter.
// Owner gak perlu SSH ke VPS: cukup ketik URL proxy di chat, bot simpan ke
// data/yt-proxy.txt dan yt-dlp otomatis pakai flag --proxy (lihat
// src/scraper/nova-ytdlp.js getYtProxyArgs). ENV NOVA_YTDLP_PROXY tetap
// menang kalau diset.
//
// Cara pakai:
//   .ytproxy http://user:pass@host:port   → simpan proxy (http/https/socks5)
//   .ytproxy status                       → proxy aktif (dimasker) + sumber
//   .ytproxy clear                        → hapus (balik koneksi langsung)
//
// Validasi: URL WAJIB schema http:// atau https:// atau socks5:// —
// URL aneh ditolak JELAS, file lama gak ketimpa.
import fs from "fs";
import path from "path";
import { novaError, novaGuideV2, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getYtProxyArgs } from "../../src/scraper/nova-ytdlp.js";

const PROXY_PATH = path.join(process.cwd(), "data", "yt-proxy.txt");
const PROXY_RE = /^(https?|socks5):\/\/\S+$/i;

// sembunyiin password proxy di semua tampilan (kecuali simpan file)
function maskProxy(url) {
  return String(url || "").replace(/(:\/\/[^:@/]+:)[^@]+@/, "$1***@");
}

function validateProxy(url) {
  const t = String(url || "").trim();
  if (!t) return { ok: false, reason: "URL proxy kosong." };
  if (/\s/.test(t)) return { ok: false, reason: "URL proxy gak boleh ada spasi — kirim URL-nya doang, tanpa tambahan teks." };
  if (!PROXY_RE.test(t)) {
    return { ok: false, reason: "URL harus mulai http:// atau https:// atau socks5:// (contoh: http://user:pass@host:8080)." };
  }
  return { ok: true, url: t };
}

function proxyStatus() {
  // sumber aktif = yang bakal kepake getYtProxyArgs (env menang)
  if (process.env.NOVA_YTDLP_PROXY && PROXY_RE.test(process.env.NOVA_YTDLP_PROXY)) {
    return { source: "env NOVA_YTDLP_PROXY", url: process.env.NOVA_YTDLP_PROXY, file: false };
  }
  try {
    if (fs.existsSync(PROXY_PATH)) {
      const raw = fs.readFileSync(PROXY_PATH, "utf-8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean)[0];
      if (raw) return { source: "data/yt-proxy.txt", url: raw, file: true };
    }
  } catch {}
  return null;
}

const pluginConfig = {
  name: "ytproxy",
  alias: ["proxyyt", "setproxyyt", "ytdlproxy"],
  category: "owner",
  description: "Proxy YouTube via WhatsApp — setel proxy yt-dlp dari chat, fallback kedua .play pas bot-check (selain cookies)",
  usage: ".ytproxy <url> — simpan proxy yt-dlp (http/https/socks5)\n.ytproxy status — cek proxy aktif\n.ytproxy clear — hapus proxy",
  example: ".ytproxy http://user:pass@host:8080\n.ytproxy socks5://host:1080\n.ytproxy status\n.ytproxy clear",
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
    const st = proxyStatus();
    if (!st) {
      return m.reply(
        claraWrap("Yt Proxy", [
          "🔴 *ᴛɪᴅᴀᴋ ᴀᴅᴀ ᴘʀᴏxʏ ᴛᴇʀᴘᴀꜱᴀɴɢ*",
          "",
          "yt-dlp nyambung langsung dari IP server.",
          "",
          "📍 ᴄᴀʀᴀ ꜱᴇᴛᴇʟ:",
          "ketik .ytproxy <url-proxy>",
          "contoh: .ytproxy http://user:pass@host:8080",
        ].join("\n")),
      );
    }
    return m.reply(
      claraWrap("Yt Proxy", [
        "🟢 *ᴘʀᴏxʏ ᴀᴋᴛɪꜰ*",
        `• ᴀᴅʀᴇꜱ : ${maskProxy(st.url)}`,
        `• ꜱᴜᴍʙᴇʀ : ${st.source}`,
        "• ʏᴛ-ᴅʟᴘ : otomatis pakai --proxy di download berikutnya",
        "",
        "📌 Ganti: ketik .ytproxy <url-baru>. Hapus: .ytproxy clear.",
      ].join("\n")),
    );
  }

  // ── Sub: clear ──────────────────────────────────────────────
  if (sub === "clear" || sub === "off") {
    if (process.env.NOVA_YTDLP_PROXY) {
      return m.reply(
        claraWrap("Yt Proxy", [
          "🟡 ᴀᴅᴀ ᴘʀᴏxʏ ᴅᴀʀɪ ᴇɴᴠ *NOVA_YTDLP_PROXY* — env ini gak bisa dihapus dari chat.",
          "Hapus lewat file .env / konfigurasi VPS lalu restart bot.",
        ].join("\n")),
      );
    }
    if (fs.existsSync(PROXY_PATH)) {
      fs.unlinkSync(PROXY_PATH);
      return m.reply(claraWrap("Yt Proxy", ["🟡 *ᴘʀᴏxʏ ᴅɪʜᴀᴘᴜꜱ* — yt-dlp balik nyambung langsung dari IP server."].join("\n")));
    }
    return m.reply(claraWrap("Yt Proxy", ["Tidak ada proxy tersimpan — sudah bersih dari awal."].join("\n")));
  }

  // ── Jalur utama: URL proxy ──────────────────────────────────
  const raw = (args[0] || "").trim();
  if (!raw) {
    return m.reply(
      novaGuideV2("ytproxy", {
        kaomoji: "(๑˃ᴗ˂)ﻭ",
        sapaan: "setel proxy yt-dlp via chat — fallback kedua .play pas bot-check",
        cara: "ketik .ytproxy diikuti URL proxy (http/https/socks5)",
        contoh: ".ytproxy http://user:pass@host:8080\n.ytproxy socks5://host:1080\n.ytproxy status\n.ytproxy clear",
        note: "proxy dipakai otomatis sama yt-dlp (flag --proxy) di semua jalur play/video; pasang cookies (.ytcookies) tetap jadi pilihan pertama — dua-duanya bisa jalan bareng",
      }),
    );
  }

  const res = validateProxy(raw);
  if (!res.ok) {
    await m.react("❌");
    return m.reply(novaError("Yt Proxy", `URL DITOLAK: ${res.reason}`));
  }

  // Simpan (backup file lama sekali buat jaga-jaga)
  try {
    const dir = path.dirname(PROXY_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(PROXY_PATH)) fs.copyFileSync(PROXY_PATH, PROXY_PATH + ".bak");
    fs.writeFileSync(PROXY_PATH, res.url + "\n");
  } catch (e) {
    await m.react("❌");
    return m.reply(novaError("Yt Proxy", `Gagal menyimpan: ${e.message}`));
  }

  // bukti nyata: flag yang bakal kepake yt-dlp
  const flag = getYtProxyArgs().trim();

  await m.react("🐣");
  return m.reply(
    claraWrap("Yt Proxy", [
      "🟢 *ᴘʀᴏxʏ ʏᴏᴜᴛᴜʙᴇ ᴛᴇʀᴘᴀꜱᴀɴɢ* 🎉",
      `• ᴀᴅʀᴇꜱ : ${maskProxy(res.url)}`,
      "• ᴛᴇʀꜱɪᴍᴘᴀɴ : data/yt-proxy.txt",
      `• ғʟᴀɢ ʏᴛ-ᴅʟᴘ : ${flag ? "aktif (—proxy)" : "belum terbaca ⚠️"}`,
      "",
      "📌 Tes langsung: ketik *.play lathi* — kalau proxy-nya hidup, download lewat IP proxy.",
      "📌 Ganti proxy: ketik .ytproxy <url-baru>. Hapus: .ytproxy clear.",
    ].join("\n")),
  );
}

export { pluginConfig as config, handler, validateProxy, maskProxy, PROXY_PATH, proxyStatus };
