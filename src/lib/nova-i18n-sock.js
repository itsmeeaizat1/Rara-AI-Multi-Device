// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 nova-i18n-sock.js — pembungkus sock translate-aware
// 🔹 Fix 18 Sep 2026 (owner: "yg keubah cm caption doang, g semua
//   tampilah seluruh teks bot ini dikonversi jadi bahasa yg dipilih"):
//   hook m.reply cuma nyangkut pesan yang lewat m.reply. Plugin yang
//   kirim teks lewat sock.sendMessage LANGSUNG (menu tombol, caption
//   media, hasil fitur) gak pernah ke-translate.
// 🔹 Solusi satu titik: pas dispatch plugin di handler.js, sock
//   diganti makeLangAwareSock(sock, m.sender) — sendMessage dibungkus,
//   field `text` + `caption` (string) di-translate dulu kalau user
//   punya bahasa aktif. Gak ada bahasa = SOCK ASLI (zero overhead).
// 🔹 Aman: translateUI gak pernah throw (semua try/catch, gagal =
//   teks asli). Media/buffer/options gak disentuh.
// ============================================================
import { translateUI, needsTranslation } from "./nova-i18n.js";

export function makeLangAwareSock(sock, sender) {
  try {
    if (!sock || typeof sock.sendMessage !== "function") return sock;
    // Passthrough murah: gak ada preferensi bahasa → sock ASLI, gak ada
    // pembungkus sama sekali (perf sama seperti sebelum fitur ini).
    if (!needsTranslation(sender)) return sock;

    const send = sock.sendMessage.bind(sock);
    const wrapped = async (jid, params = {}, options = {}) => {
      try {
        if (params && typeof params === "object") {
          // translate body text + caption media (string doang)
          if (typeof params.text === "string" && params.text) {
            params = { ...params, text: await translateUI(params.text, sender) };
          }
          if (typeof params.caption === "string" && params.caption) {
            params = { ...params, caption: await translateUI(params.caption, sender) };
          }
        }
      } catch {
        // gagal translate = kirim params asli
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
