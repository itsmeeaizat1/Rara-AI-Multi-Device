// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// server.js — Set PTLA (application apikey) & PTLC (client capikey) per slot server panel
// Format : .server plta <apikey> <serverN>   → set PTLA
//          .server pltc <apikey> <serverN>   → set PTLC
//          .server status                    → cek key per server
// ATURAN  : PTLA & PTLC adalah DUA KEY BERBEDA yang BOLEH BARENGAN di satu slot:
//          PTLA (awalan ptla_) = application/admin — WAJIB buat create akun/server & kontrol semua.
//          PTLC (awalan ptlc_) = client — opsional, buat operasi client tanpa login.
//          Tidak ada lagi aturan saling-hapus (set satu TIDAK menghapus satunya, sama kayak .setpanel).
// Izin    : Owner bot / role Owner & CEO panel di server tsb (reseller TIDAK bisa).

import config from "../../config.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import {
  setPanelField,
  getPanel,
  listPanels,
  MAX_PANELS,
} from "../../src/lib/panel/index.js";
import { hasFullAccess, getUserRole } from "../../src/lib/rara-roles-cpanel.js";

const pluginConfig = {
  name: "server",
  alias: ["setserver", "serverkey"],
  category: "panel",
  description: "Set PTLA/PTLC API key panel per server (bisa barengan, gak saling hapus)",
  usage: ".server plta <apikey> 1 atau .server pltc <apikey> 1 (angka = server, 1 = v1) | .server status",
  example: ".server plta ptla_xxxx 1",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function parseServerNum(arg) {
  const match = String(arg || "").trim().match(/^v?(\d{1,3})$/i);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  return num >= 1 && num <= MAX_PANELS ? num : null;
}

function maskKey(key) {
  const s = String(key || "");
  if (!s) return "-";
  if (s.length <= 10) return s.substring(0, 4) + "****";
  return s.substring(0, 6) + "****" + s.slice(-4);
}

async function handler(m, { sock }) {
  const prefix = m.prefix || ".";
  const args = (m.args || []).map((a) => String(a).trim()).filter(Boolean);
  const sub = (args[0] || "").toLowerCase();

  // ── menu / cara pakai ──
  if (!sub) {
    let txt = "SET KEY SERVER (PTLA / PTLC)\n\n";
    txt += "Dua jenis key panel — BOLEH BARENGAN, gak saling hapus:\n";
    txt += "• PTLA (awalan ptla_) = key application (admin)\n";
    txt += "  WAJIB — buat create akun/server & kontrol semua server.\n";
    txt += "• PTLC (awalan ptlc_) = key client\n";
    txt += "  Opsional — buat operasi client tanpa login.\n\n";
    txt += "Cara pakai:\n";
    txt += "  " + prefix + "server plta ptla_xxxx 1\n";
    txt += "  (set PTLA server v1)\n\n";
    txt += "  " + prefix + "server pltc ptlc_xxxx 1\n";
    txt += "  (set PTLC server v1)\n\n";
    txt += "  " + prefix + "server status\n";
    txt += "  (cek key semua server)\n\n";
    txt += "Sama aja kayak:\n";
    txt += "  " + prefix + "setpanel v1 apikey ptla_xxxx   (PTLA)\n";
    txt += "  " + prefix + "setpanel v1 capikey ptlc_xxxx   (PTLC)\n\n";
    txt += "Set domain: " + prefix + "setpanel v1 http://domain-panel.com\n";
    txt += "Ambil PTLA: panel → halaman Admin → API\n";
    txt += "Ambil PTLC: panel → Account → API Credentials";
    return m.reply(raraWrap("server", txt));
  }

  // ── status semua server ──
  if (sub === "status") {
    let txt = "STATUS KEY SERVER\n\n";
    let shown = 0;
    for (let i = 1; i <= MAX_PANELS; i++) {
      const p = getPanel(i);
      if (!p?.apikey && !p?.capikey) continue;
      shown++;
      txt += "v" + i + ":\n";
      txt += "  PTLA: " + (p.apikey ? maskKey(p.apikey) : "-") + "\n";
      txt += "  PTLC: " + (p.capikey ? maskKey(p.capikey) : "-") + "\n\n";
    }
    if (shown === 0) txt += "(belum ada key ter-set — pakai " + prefix + "server plta ptla_xxxx 1)\n";
    const configured = listPanels().length;
    txt += "Server terkonfigurasi domain+key: " + configured + "/" + MAX_PANELS + " slot";
    return m.reply(raraWrap("server", txt));
  }

  if (sub !== "plta" && sub !== "pltc") {
    return m.reply(
      raraWrap("server", "Subcommand tidak dikenal: *" + (args[0] || "-") + "*\n\nGunakan:\n" +
        "  " + prefix + "server plta <apikey> <server>\n" +
        "  " + prefix + "server pltc <apikey> <server>\n" +
        "  " + prefix + "server status")
    );
  }

  // ── .server plta/pltc <apikey> <serverN> ──
  const key = args[1];
  if (!key) {
    return m.reply(
      raraWrap("server", "API key tidak boleh kosong.\n\n💡 *Contoh:* " + prefix + "server " + sub + " " + (sub === "plta" ? "ptla" : "ptlc") + "_xxxx 1")
    );
  }

  const serverNum = parseServerNum(args[2]);
  if (!serverNum) {
    return m.reply(
      raraWrap("server", "Nomor server wajib diisi (1-100).\n\n💡 *Contoh:* " + prefix + "server " + sub + " " + key.substring(0, 6) + "**** 1\n(1 = server pertama v1)")
    );
  }

  const serverKey = "server" + serverNum;
  const serverLabel = "V" + serverNum;

  // Izin: owner bot ATAU role Owner/CEO panel di server tsb (reseller ditolak)
  if (!m.isOwner && !hasFullAccess(m.sender, "v" + serverNum, false)) {
    const userRole = getUserRole(m.sender, "v" + serverNum);
    return m.reply(
      raraWrap("server", "❌ *akses ditolak*\n\n" +
        "Set key server hanya untuk *Owner bot* & *Owner/CEO panel* server " + serverLabel + "\n" +
        "Role kamu: *" + (userRole ? userRole.toUpperCase() : "Tidak ada") + "*\n\n" +
        "Hirarki: Owner > CEO > Reseller")
    );
  }

  const field = sub === "plta" ? "apikey" : "capikey";
  const label = sub === "plta" ? "PTLA" : "PTLC";

  const result = setPanelField(serverNum, field, key);
  if (!result.success) {
    return m.reply(raraWrap("server", "❌ Gagal set " + label + ": " + result.error));
  }

  // Update config aktif di memory (langsung aktif tanpa restart)
  // CATATAN: key satunya TIDAK dihapus — PTLA & PTLC memang beda peran & boleh barengan.
  if (config.pterodactyl?.[serverKey]) {
    config.pterodactyl[serverKey][field] = key;
  }

  let txt = "✅ " + label + " SERVER " + serverLabel + " DI-SET\n\n";
  txt += "Key: `" + maskKey(key) + "`\n";
  txt += "Jenis: *" + label + "* (" + (sub === "plta" ? "application/admin — buat create & kontrol semua" : "client — buat operasi client") + ")\n";
  txt += "Server: *" + serverLabel + "*\n\n";
  txt += "PTLA & PTLC aman berdampingan — key lain TIDAK dihapus.\n";
  txt += "Perubahan langsung aktif, tidak perlu restart.";
  return m.reply(raraWrap("server", txt));
}

export { pluginConfig as config, handler };
