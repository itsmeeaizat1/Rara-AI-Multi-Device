// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .bootdoctor — Cek kesehatan fitur (apikey expired / endpoint down / error)
// Laporan OTOMATIS ke DM owner tiap bot nyala/restart (nova-boot-doctor.js).
// Beda dari .autoapicheck (monitor berkala ping endpoint biasa):
// bootdoctor ngetes KEY ASLI ke endpoint yang beneran dipakai fitur.
//
// Commands:
//   .bootdoctor          — Cek semua fitur sekarang (22 apikey + 10 endpoint)
//   .bootdoctor status   — Lihat hasil cek terakhir + toggle auto-DM
//   .bootdoctor on/off   — Aktifkan/matikan laporan otomatis pas boot
import {
  runAndReport,
  getBootDoctorStatus,
  setBootDoctorEnabled,
} from "../../src/lib/nova-boot-doctor.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "bootdoctor",
  alias: ["bootdoctor", "doctor", "healthcheck", "dokterfitur"],
  category: "owner",
  description: "Cek apikey expired + endpoint down semua fitur (auto ke DM owner saat bot nyala)",
  usage: ".bootdoctor — Cek semua fitur sekarang\n.bootdoctor status — Hasil cek terakhir\n.bootdoctor on/off — Laporan otomatis pas boot",
  example: ".bootdoctor",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/).slice(1);
  const sub = (args[0] || "").toLowerCase();

  try {
    // ── status ──
    if (sub === "status") {
      const st = getBootDoctorStatus();
      const lines = [];
      lines.push("Laporan otomatis pas bot nyala/restart: " + (st.enabled ? "AKTIF" : "MATI"));
      if (st.lastRun) {
        lines.push("");
        lines.push("🕒 Cek terakhir: " + new Date(st.lastRun).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB");
        lines.push("📋 Hasil: " + (st.lastSummary || "belum ada data"));
      } else {
        lines.push("");
        lines.push("Belum pernah jalan pas sesi ini");
      }
      if (st.lastSent) {
        lines.push("");
        lines.push("📤 DM terakhir terkirim: " + new Date(st.lastSent).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB");
      }
      lines.push("");
      lines.push("💡 Ketik " + prefix + "bootdoctor buat cek ulang sekarang");
      return m.reply(claraWrap("Boot Doctor", lines));
    }

    // ── toggle ──
    if (sub === "on" || sub === "off" || sub === "aktif" || sub === "matikan") {
      const on = sub === "on" || sub === "aktif";
      const now = setBootDoctorEnabled(on);
      return m.reply(claraWrap("Boot Doctor", [
        (on ? "✅" : "❌") + " Laporan otomatis pas boot: " + (now ? "AKTIF" : "MATI"),
        "",
        on ? "Tiap bot nyala/restart, hasil cek kesehatan fitur otomatis ke DM kamu" : "Cek tetap jalan pas boot, cuma DM-nya dimatiin",
      ]));
    }

    // ── default: run sekarang ──
    await m.react("🕒");
    const { report, results } = await runAndReport({ send: false });
    await m.reply(report);
    await m.react("✅");
    const bad = results.filter(r => r.status !== "ok" && r.status !== "nokey").length;
    if (!bad) return;
    return m.reply(claraWrap("Boot Doctor", [
      "Ada " + bad + " fitur bermasalah — ganti key di src/lib/apikey/apikeys.json lalu ketik " + prefix + "reloadkey",
    ]));
  } catch (e) {
    console.error("[bootdoctor] Error:", e.message);
    return m.reply(claraWrap("Boot Doctor", ["❌ Gagal cek fitur: " + (e.message || e)]));
  }
}

export { pluginConfig as config, handler };
export default { pluginConfig, handler };
