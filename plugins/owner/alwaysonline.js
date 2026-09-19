// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .alwaysonline — bot kelihatan ONLINE 24 JAM (presence keepalive).
// Sistem langka bot MD luar sana (Jawad MD, AA MD) yang belum ada di NOVA.
// Heartbeat presence "available" berulang tiap N menit + auto start pas boot.
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import {
  getAlwaysOnlineStatus,
  startAlwaysOnline,
  stopAlwaysOnline,
} from "../../src/lib/nova-always-online.js";

const pluginConfig = {
  name: "alwaysonline",
  alias: ["alwaysonline", "online24"],
  category: "owner",
  description: "Bot kelihatan online 24 jam (presence keepalive)",
  usage: ".alwaysonline <on/off/status/interval menit>",
  example: ".alwaysonline on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const args = m.text?.trim().split(/\s+/).slice(1) || [];
  const action = (args[0] || "status").toLowerCase();
  const cur = db.setting("alwaysOnline") || { enabled: false, intervalMin: 10 };

  if (action === "on" || action === "aktif" || action === "aktifkan") {
    db.setting("alwaysOnline", { ...cur, enabled: true });
    const ok = startAlwaysOnline(sock);
    return m.reply(
      claraWrap("Always Online", [
        "Bot sekarang kelihatan ONLINE 24 jam",
        "",
        `Heartbeat tiap ${cur.intervalMin || 10} menit: ${ok ? "AKTIF" : "GAGAL (cek koneksi)"}`,
        "Status WA kamu bakal nunjukin online terus walau bot nganggur.",
      ]),
      { commandName: "alwaysonline" }
    );
  }

  if (action === "off" || action === "mati" || action === "matikan") {
    db.setting("alwaysOnline", { ...cur, enabled: false });
    stopAlwaysOnline();
    return m.reply(
      claraWrap("Always Online", [
        "Presence keepalive DIMATIKAN",
        "Status online kamu balik normal (muncul cuma pas aktif).",
      ]),
      { commandName: "alwaysonline" }
    );
  }

  if (action === "interval" || action === "menit") {
    const menit = parseInt(args[1], 10);
    if (!(menit >= 1 && menit <= 60)) {
      return m.reply(
        claraWrap("Always Online", [
          "Format: .alwaysonline interval <menit 1-60>",
          "Default 10 menit — makin pendek makin stabil tampilan online.",
        ])
      );
    }
    db.setting("alwaysOnline", { ...cur, intervalMin: menit });
    if (cur.enabled) startAlwaysOnline(sock); // re-arm interval baru
    return m.reply(
      claraWrap("Always Online", [
        `Interval heartbeat diganti jadi ${menit} menit.`,
        cur.enabled ? "Timer langsung dipasang ulang." : "Aktifin dengan .alwaysonline on",
      ])
    );
  }

  // status / default
  const st = getAlwaysOnlineStatus();
  return m.reply(
    claraWrap("Always Online", [
      `Mode: ${st.enabled ? "AKTIF" : "MATI"}`,
      `Heartbeat: tiap ${st.intervalMin} menit ${st.running ? "(timer jalan)" : "(timer mati)"}`,
      `Total heartbeat sesi ini: ${st.beatCount}`,
      "",
      "Perintah: .alwaysonline on/off/interval <menit>",
    ])
  );
}

export { pluginConfig as config, handler };
export default { pluginConfig, handler };
