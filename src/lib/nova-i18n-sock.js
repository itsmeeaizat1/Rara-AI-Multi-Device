// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 nova-i18n-sock.js — pembungkus sock translate-aware + sanitizer
// 🔹 Fix 18 Sep 2026 #1 (owner: "yg keubah cm caption doang, g semua
//   tampilah seluruh teks bot ini dikonversi jadi bahasa yg dipilih"):
//   hook m.reply cuma nyangkut pesan yang lewat m.reply. Plugin yang
//   kirim teks lewat sock.sendMessage LANGSUNG (menu tombol, caption
//   media, hasil fitur) gak pernah ke-translate.
// 🔹 Fix 18 Sep 2026 #2 (owner: pesan ".bot on" muncul literal "\n"
//   sebagai teks, bukan baris baru — akar salah satu plugin nge-join
//   pakai dua-backslash-n): sanitizer formatGuard() dipasang di titik
//   yang SAMA. Beda dari translate, formatGuard SELALU jalan (murah,
//   sync, idempotent) — gak perlu preferensi bahasa buat dilindungi.
// 🔹 Solusi satu titik: pas dispatch plugin di handler.js, sock diganti
//   makeLangAwareSock(sock, m.sender) — sendMessage dibungkus:
//   1) formatGuard(text/caption) — selalu, siapa pun sender-nya
//   2) translateUI(text/caption) — cuma kalau user punya bahasa aktif
//   Gak ada bahasa DAN teks sudah bersih = overhead minimal (1 regex
//   check formatGuard doang, translateUI di-skip).
// 🔹 Aman: translateUI/formatGuard gak pernah throw (semua try/catch,
//   gagal = teks asli). Media/buffer/options gak disentuh.
// ============================================================
import { translateUI, needsTranslation } from "./nova-i18n.js";
import { formatGuard } from "./styler.js";

export function makeLangAwareSock(sock, sender) {
  try {
    if (!sock || typeof sock.sendMessage !== "function") return sock;

    const wantsLang = needsTranslation(sender);
    const send = sock.sendMessage.bind(sock);

    const wrapped = async (jid, params = {}, options = {}) => {
      try {
        if (params && typeof params === "object") {
          let text = params.text;
          let caption = params.caption;

          // sanitizer SELALU jalan — bukan cuma buat user berbahasa
          if (typeof text === "string" && text) text = formatGuard(text);
          if (typeof caption === "string" && caption) caption = formatGuard(caption);

          // translate CUMA kalau user punya preferensi bahasa aktif
          if (wantsLang) {
            if (typeof text === "string" && text) text = await translateUI(text, sender);
            if (typeof caption === "string" && caption) caption = await translateUI(caption, sender);
          }

          if (text !== params.text || caption !== params.caption) {
            params = { ...params, ...(text !== undefined ? { text } : {}), ...(caption !== undefined ? { caption } : {}) };
          }
        }
      } catch {
        // gagal sanitasi/translate = kirim params asli
      }
      return send(jid, params, options);
    };

    // salin semua method/property lain ke objek pembungkus, sendMessage dioverride
    const out = Object.create(sock);
    out.sendMessage = wrapped;
    return out;
  } catch {
    return sock;
  }
}

export default makeLangAwareSock;
