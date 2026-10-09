// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .bootdoctor — Cek kesehatan fitur (apikey expired / endpoint down / error)
// Laporan OTOMATIS ke DM owner tiap bot nyala/restart (rara-boot-doctor.js).
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
} from "../../src/lib/rara-boot-doctor.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "bootdoctor",
  alias: ["bootdoctor", "doctor", "healthcheck", "dokterfitur"],
  category: "bot",
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
      // REVISI 9 Okt (owner): kartu handler ikut gaya promosi AI — label bold,
      // bullet ▪, seksi berjudul + divider (nyambung sama laporan buildBootReport)
      const fmtTgl = (ts) => new Date(ts).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB";
      const lines = [];
      lines.push("🩺 *STATUS*");
      lines.push("━━━━━━━━━━━━━━");
      lines.push("▪ *Auto-cek pas boot:* " + (st.enabled ? "✅ AKTIF" : "❌ MATI"));
      lines.push("▪ *Mode:* sekali saat pairing pertama, sisanya manual " + prefix + "bootdoctor");
      if (st.autoBootDone) {
        lines.push("▪ *Cek pertama:* ✔ udah jalan — boot berikutnya dilewati (limit fitur aman)");
      }
      lines.push("");
      lines.push("📊 *RIWAYAT*");
      lines.push("━━━━━━━━━━━━━━");
      if (st.lastRun) {
        lines.push("▪ *Cek terakhir:* 🕒 " + fmtTgl(st.lastRun));
        lines.push("▪ *Hasil:* " + (st.lastSummary || "belum ada data"));
      } else {
        lines.push("Belum ada riwayat — cek pertama belum jalan");
      }
      if (st.lastSent) {
        lines.push("▪ *DM terakhir:* 📤 " + fmtTgl(st.lastSent));
      }
      lines.push("");
      lines.push("💡 Ketik *" + prefix + "bootdoctor* buat cek ulang sekarang");
      return m.reply(raraWrap("Boot Doctor", lines));
    }

    // ── toggle ──
    if (sub === "on" || sub === "off" || sub === "aktif" || sub === "matikan") {
      const on = sub === "on" || sub === "aktif";
      const now = setBootDoctorEnabled(on);
      return m.reply(raraWrap("Boot Doctor", [
        (on ? "✅" : "❌") + " *AUTO-CEK PAS BOOT: " + (now ? "AKTIF" : "MATI") + "*",
        "",
        on
          ? "*Jalan sekali saat pairing pertama* — hasil cek ke DM kamu, boot/restart berikutnya dilewati biar limit fitur gak keburu"
          : "*Probe kesehatan gak jalan sama sekali pas boot* — limit fitur aman. Cek manual kapan aja: *" + prefix + "bootdoctor*",
      ]));
    }

    // ── default: run sekarang ──
    await m.react("🕒");
    const { report, results } = await runAndReport({ send: false });
    await m.reply(report);
    await m.react("✅");
    const bad = results.filter(r => r.status !== "ok" && r.status !== "nokey").length;
    if (!bad) return;
    return m.reply(raraWrap("Boot Doctor", [
      "❗ *" + bad + " FITUR BERMASALAH*",
      "Ganti key di src/lib/apikey/apikeys.json lalu ketik *" + prefix + "reloadkey*",
    ]));
  } catch (e) {
    console.error("[bootdoctor] Error:", e.message);
    return m.reply(raraWrap("Boot Doctor", [
      "❌ *GAGAL CEK FITUR*",
      String(e.message || e),
    ]));
  }
}

export { pluginConfig as config, handler };
export default { pluginConfig, handler };
