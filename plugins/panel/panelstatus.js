// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// plugins/panel/panelstatus.js — .panel (8 Okt 2026)
// Status & info panel Pterodactyl (admin, user, server, node, protect) dibaca
// langsung dari database panel lewat SSH. Pakai login .vps yang sama, KHUSUS DM.
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { getCreds, panelStatus, pteroqFix } from "../../src/lib/rara-vps-manager.js";
import { formatPanelStatus } from "../../src/lib/rara-vps-cards.js";

const pluginConfig = {
  name: "statuspanel",
  alias: ["panelstatus", "infopanel", "panelinfo"],
  category: "panel",
  description: "Info lengkap panel Pterodactyl: admin, user, server, node, protect (via login .vps)",
  usage: ".statuspanel",
  example: ".statuspanel",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const MODE = (isOwner) => (isOwner ? "OWNER" : "USER");

// m.text produksi = isi SETELAH command; toleransi bentuk lengkap
function parseArgs(m) {
  let raw = (m.text || "").trim();
  raw = raw.replace(/^[^\w\s]?\s*(panel|statuspanel|panelstatus|infopanel|panelinfo)\b\s*/i, "");
  return raw.split(/\s+/).filter(Boolean);
}

async function handler(m, { sock } = {}) {
  const p = m.prefix || ".";
  const mode = MODE(m.isOwner);
  if (m.isGroup) {
    return m.reply(raraWrap("panel", `🔒 *Khusus DM*\n\nInfo panel memuat data sensitif — chat bot langsung di pesan pribadi.\nMode: *${mode}*`));
  }
  const args = parseArgs(m);
  const sub = (args[0] || "status").toLowerCase();

  const creds = getCreds(m.sender);
  if (!creds) {
    return m.reply(raraWrap("panel", `🔒 *BELUM LOGIN VPS* (Mode ${mode})
${m.isOwner ? "Owner belum login VPS — login dulu dengan akun root VPS-mu." : "Fitur ini butuh login akun root VPS-mu sendiri — akun owner gak bisa dipakai."}

• ${p}vps login <ip>|<password>
• ${p}vps login <ip>|<port>|<user>|<password>`));
  }

  try {
    if (sub === "status" || sub === "info") {
      try { await m.reply(raraWrap("panel", "⏳ Baca database panel di VPS-mu…")); } catch {}
      const ps = await panelStatus(creds);
      return m.reply(raraWrap("panel", formatPanelStatus(ps, creds, mode, p)));
    }
    if (sub === "fixqueue" || sub === "pteroq") {
      const r = await pteroqFix(creds);
      return m.reply(raraWrap("panel", r.active
        ? `✅ *pteroq JALAN*${r.created ? " (unit systemd dibuat baru + enable saat boot)" : " (di-restart)"}\nServer baru sekarang bisa selesai install.`
        : `❌ pteroq masih belum aktif. Cek log: ${p}vps exec journalctl -u pteroq -n 20 --no-pager`));
    }
    return m.reply(raraWrap("panel", `🦖 *PANEL*
• ${p}statuspanel — info lengkap panel (admin, user, server, node, protect, antrian)
• ${p}statuspanel fixqueue — hidupkan worker antrian (pteroq) kalau mati

Butuh login VPS: ${p}vps login <ip>|<password>`));
  } catch (e) {
    return m.reply(raraWrap("panel", `❌ *GAGAL*\n\n${e.message}\n\nCek ${p}vps test — kalau SSH gak nyambung, login ulang: ${p}vps login`));
  }
}

export { pluginConfig as config, handler };
