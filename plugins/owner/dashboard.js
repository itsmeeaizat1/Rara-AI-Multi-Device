// ═══════════════════════════════════════════════════════════════════════════
// .dashboard — MINI DASHBOARD OWNER WEB (25 Sep 2026, fitur "bot masa depan" no.5)
// Panel kontrol dashboard web: stat system/bot/user/aktivitas/kesehatan fitur
// dalam satu halaman live. Engine: src/lib/rara-dashboard.js (jangan duplikasi).
//
// Commands:
//   .dashboard          — status dashboard (jalan/mati, port, token)
//   .dashboard token    — lihat token akses (DM SAJA — di grup ditolak)
//   .dashboard on/off   — nyalain/matikan server web
//   .dashboard regen    — bikin token baru (token lama langsung mati)
//   .dashboard port <n> — ganti port (server restart otomatis)
//
// Owner-only. GOTCHA: semua teks keluar bot di-smallcaps global — token hex
// WAJIB dikirim dalam code fence (```) biar gak ke-convert jadi glyph kecil.
// ═══════════════════════════════════════════════════════════════════════════

import { raraGuide } from "../../src/lib/rara-menu-style.js";
import {
  getDashboardStatus,
  regenDashboardToken,
  setDashboardPort,
  setDashboardEnabled,
} from "../../src/lib/rara-dashboard.js";

const pluginConfig = {
  name: "dashboard",
  alias: ["dashboard", "dashowner", "ownerdash"],
  category: "owner",
  description: "Mini dashboard owner versi web — stat bot, user, aktivitas, kesehatan fitur dalam satu halaman live",
  usage: ".dashboard — status dashboard web owner\n.dashboard token — lihat token akses (DM saja)\n.dashboard on/off — nyalain/matikan server\n.dashboard regen — ganti token baru\n.dashboard port <nomor> — ganti port",
  example: ".dashboard",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function maskToken(tok) {
  return tok.slice(0, 4) + "••••••" + tok.slice(-4);
}

async function handler(m) {
  const args = (m.text || "").trim().split(/\s+/).slice(1);
  const sub = (args[0] || "").toLowerCase();

  try {
    const st = getDashboardStatus();

    // ── token: DM saja — di grup ditolak biar gak bocor ──
    if (sub === "token") {
      if (m.isGroup) {
        return m.reply(raraGuide("dashboard",
          "Token gak bisa dilihat di grup — bahaya kalau kebaca orang lain. Ketik perintah ini di chat pribadi bot ya.",
          ".dashboard token",
          "Token itu kunci akses data owner-mu. Jangan dibagikan ke siapapun."));
      }
      return m.reply(raraGuide("dashboard",
        "Ini token akses dashboard kamu — jangan dibagikan ke siapapun. Buka: http://<ip-vps>:" + st.port + "/?token=<token>",
        ".dashboard regen",
        "Kalau token sampai bocor, ketik regen buat bikin yang baru — token lama langsung mati.")
        + "\n\n```\n" + st.token + "\n```");
    }

    // ── on/off ──
    if (sub === "on" || sub === "off" || sub === "nyalakan" || sub === "matikan") {
      const on = sub === "on" || sub === "nyalakan";
      m.react?.(on ? "🛠️" : "🧠");
      const r = await setDashboardEnabled(on);
      return m.reply(raraGuide("dashboard",
        (r.ok ? "✅ " : "❌ ") + r.msg + (on ? " — cek status: .dashboard" : " — server web udah mati, data bot tetap aman."),
        on ? ".dashboard token" : ".dashboard on",
        r.ok ? "" : "Kalau gagal start, kemungkinan portnya lagi sibuk — coba ganti port."));
    }

    // ── regen token ──
    if (sub === "regen" || sub === "gantitoken") {
      if (m.isGroup) {
        return m.reply(raraGuide("dashboard",
          "Ganti token gak bisa di grup — ketik perintah ini di chat pribadi bot.",
          ".dashboard regen",
          "Sama kayak lihat token, buat keamanan data owner."));
      }
      m.react?.("🛠️");
      const newTok = regenDashboardToken();
      return m.reply(raraGuide("dashboard",
        "✅ Token baru dibuat — token lama langsung gak berlaku. Buka: http://<ip-vps>:" + st.port + "/?token=<token>",
        ".dashboard",
        "Ganti token tiap kamu ngerasa token lama udah bocor."))
        .then(() => m.reply("```\n" + newTok + "\n```"));
    }

    // ── port <n> ──
    if (sub === "port") {
      const p = args[1];
      if (!p) {
        return m.reply(raraGuide("dashboard",
          "Cara ganti port dashboard — port sekarang: " + st.port + " (env NOVA_DASH_PORT).",
          ".dashboard port 9090",
          "Port gak boleh bentrok sama Rara Live (8080). Server restart otomatis pas port diganti."));
      }
      m.react?.("🛠️");
      const r = await setDashboardPort(p);
      return m.reply(raraGuide("dashboard",
        (r.ok ? "✅ " : "❌ ") + r.msg + (r.ok ? " — server sudah restart dengan port baru." : ""),
        ".dashboard status",
        r.ok ? "" : "Port harus angka 1-65535."));
    }

    // ── default: status ──
    m.react?.("⚡");
    const statusLine = st.running
      ? "🟢 AKTIF — server jalan di port " + st.port
      : (st.enabled ? "🟡 nyala tapi belum jalan — cek log / port sibuk" : "🔴 MATI — nyalakan dengan .dashboard on");
    const tokenLine = m.isGroup
      ? "Token: " + maskToken(st.token) + " (ketik .dashboard token di DM buat lihat lengkap)"
      : "Token kamu ada di bawah — buka: http://<ip-vps>:" + st.port + "/?token=<token>";
    const card = raraGuide("dashboard",
      "Dashboard web owner kamu saat ini: " + statusLine + "\n" + tokenLine + "\n\nIsinya: stat system (uptime, RAM, load), bot (versi, koneksi WA), user & grup, aktivitas pesan, kesehatan fitur dari boot doctor. Auto-refresh tiap 5 detik.",
      ".dashboard token\n.dashboard on/off\n.dashboard regen\n.dashboard port 9090",
      "Dashboard cuma bisa dibuka pakai token — jaga baik-baik tokennya.");
    if (m.isGroup) return m.reply(card);
    return m.reply(card + "\n\n```\n" + st.token + "\n```");
  } catch (e) {
    console.error("[dashboard] Error:", e.message);
    return m.reply(raraGuide("dashboard",
      "❌ Gagal olah dashboard: " + (e.message || e),
      ".dashboard",
      "Kalau terus error, cek log bot di VPS."));
  }
}

export { pluginConfig as config, handler };
export default { pluginConfig, handler };
