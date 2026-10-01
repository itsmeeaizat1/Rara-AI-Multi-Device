// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// server.js — Set PTLA (application apikey) & PTLC (client capikey) per slot server panel
// Format : .server plta <apikey> <serverN>   → set PTLA (PLTC otomatis dihapus)
//          .server pltc <apikey> <serverN>   → set PTLC (PLTA otomatis dihapus)
//          .server status                    → cek key per server
// ATURAN  : PLTA & PTLC EKSKLUSIF — satu server cuma boleh satu jenis key.
//          Kalau user set PLTA lalu set PTLC → PLTA dihapus sistem (begitu juga sebaliknya).
//          Mayoritas panel VPS dedicated pakai PTLA, tapi PTLA/PTLC opsional — user bebas milih.
// Izin    : Owner bot / role Owner & CEO panel di server tsb (reseller TIDAK bisa).

import config from "../../config.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import {
  setPanelField,
  clearPanelField,
  getPanel,
  listPanels,
  MAX_PANELS,
} from "../../src/lib/panel/index.js";
import { hasFullAccess, getUserRole } from "../../src/lib/nova-roles-cpanel.js";

const pluginConfig = {
  name: "server",
  alias: ["setserver", "serverkey"],
  category: "panel",
  description: "Set PTLA/PTLC API key panel per server (eksklusif — satu server satu jenis key)",
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
    txt += "Set API key panel per server langsung dari sini.\n";
    txt += "PLTA (application) & PTLC (client) — pilih salah satu.\n\n";
    txt += "Cara pakai:\n";
    txt += "  " + prefix + "server plta <apikey> 1\n";
    txt += "  (set PTLA server v1 — PTLC dihapus otomatis)\n\n";
    txt += "  " + prefix + "server pltc <apikey> 1\n";
    txt += "  (set PTLC server v1 — PLTA dihapus otomatis)\n\n";
    txt += "  " + prefix + "server status\n";
    txt += "  (cek key semua server)\n\n";
    txt += "Catatan:\n";
    txt += "- Angka terakhir = nomor server (1 = v1, sampai 100 = v100)\n";
    txt += "- PLTA & PTLC tidak bisa bersamaan di 1 server\n";
    txt += "- Mayoritas panel VPS dedicated pakai PTLA, tapi keduanya opsional";
    return m.reply(claraWrap("server", txt));
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
      txt += "  PLTA: " + (p.apikey ? maskKey(p.apikey) : "-") + "\n";
      txt += "  PTLC: " + (p.capikey ? maskKey(p.capikey) : "-") + "\n\n";
    }
    if (shown === 0) txt += "(belum ada key ter-set — pakai " + prefix + "server plta <apikey> 1)\n";
    const configured = listPanels().length;
    txt += "Server terkonfigurasi domain+key: " + configured + "/" + MAX_PANELS + " slot";
    return m.reply(claraWrap("server", txt));
  }

  if (sub !== "plta" && sub !== "pltc") {
    return m.reply(
      claraWrap("server", "Subcommand tidak dikenal: *" + (args[0] || "-") + "*\n\nGunakan:\n" +
        "  " + prefix + "server plta <apikey> <server>\n" +
        "  " + prefix + "server pltc <apikey> <server>\n" +
        "  " + prefix + "server status")
    );
  }

  // ── .server plta/pltc <apikey> <serverN> ──
  const key = args[1];
  if (!key) {
    return m.reply(
      claraWrap("server", "API key tidak boleh kosong.\n\n💡 *Contoh:* " + prefix + "server " + sub + " ptla_xxxx 1")
    );
  }

  const serverNum = parseServerNum(args[2]);
  if (!serverNum) {
    return m.reply(
      claraWrap("server", "Nomor server wajib diisi (1-100).\n\n💡 *Contoh:* " + prefix + "server " + sub + " " + key.substring(0, 6) + "**** 1\n(1 = server pertama v1)")
    );
  }

  const serverKey = "server" + serverNum;
  const serverLabel = "V" + serverNum;

  // Izin: owner bot ATAU role Owner/CEO panel di server tsb (reseller ditolak)
  if (!m.isOwner && !hasFullAccess(m.sender, "v" + serverNum, false)) {
    const userRole = getUserRole(m.sender, "v" + serverNum);
    return m.reply(
      claraWrap("server", "❌ *akses ditolak*\n\n" +
        "Set key server hanya untuk *Owner bot* & *Owner/CEO panel* server " + serverLabel + "\n" +
        "Role kamu: *" + (userRole ? userRole.toUpperCase() : "Tidak ada") + "*\n\n" +
        "Hirarki: Owner > CEO > Reseller")
    );
  }

  const field = sub === "plta" ? "apikey" : "capikey";
  const otherField = sub === "plta" ? "capikey" : "apikey";
  const label = sub.toUpperCase();
  const otherLabel = sub === "plta" ? "PTLC" : "PLTA";

  const result = setPanelField(serverNum, field, key);
  if (!result.success) {
    return m.reply(claraWrap("server", "❌ Gagal set " + label + ": " + result.error));
  }

  // ATURAN EKSKLUSIF: set PLTA → PTLC dihapus sistem, begitu juga sebaliknya
  clearPanelField(serverNum, otherField);

  // Update config aktif di memory (langsung aktif tanpa restart)
  if (config.pterodactyl?.[serverKey]) {
    config.pterodactyl[serverKey][field] = key;
    config.pterodactyl[serverKey][otherField] = "";
  }

  let txt = "✅ " + label + " SERVER " + serverLabel + " DI-SET\n\n";
  txt += "Key: `" + maskKey(key) + "`\n";
  txt += "Jenis: *" + label + "* (" + (sub === "plta" ? "application" : "client") + ")\n";
  txt += "Server: *" + serverLabel + "*\n\n";
  txt += "⚠️ " + otherLabel + " dihapus otomatis — satu server hanya boleh satu jenis key.\n";
  txt += "Perubahan langsung aktif, tidak perlu restart.";
  return m.reply(claraWrap("server", txt));
}

export { pluginConfig as config, handler };
