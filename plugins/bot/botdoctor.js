// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .botdoctor — DOKTER BOT PRIBADI (26 Sep 2026)
// Diagnosa kesehatan bot dari sampel denyut 24 jam (RAM/ping/CPU/error/
// restart) dengan format dokter: gejala → dugaan akar → saran tindakan.
// Bisa otomatis ke DM owner tiap malam.
// Engine: src/lib/rara-botdoctor.js (jangan duplikasi logika di sini).
//
// Commands:
//   .botdoctor                 — Diagnosa sekarang (kartu langsung)
//   .botdoctor on [HH:mm]      — Laporan otomatis ke DM tiap malam (default 23:00)
//   .botdoctor off             — Matikan laporan otomatis
//   .botdoctor jam/status      — Lihat jadwal sekarang
//   .botdoctor riwayat         — Ringkasan diagnosa terakhir (maks 14)

import { raraGuide, raraWrap } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { runBotDoctorNow, ensureBotDoctorState } from "../../src/lib/rara-botdoctor.js";

const pluginConfig = {
  name: "botdoctor",
  alias: ["dokterbot", "botdokter", "diagnosabot"],
  category: "bot",
  description: "Dokter bot pribadi — diagnosa 24 jam (RAM, latensi, koneksi WA, error, restart) format gejala → dugaan → saran, bisa otomatis ke DM tiap malam",
  usage: ".botdoctor — Diagnosa sekarang\n.botdoctor on [HH:mm] — Laporan otomatis ke DM (default 23:00)\n.botdoctor off — Matikan otomatis\n.botdoctor status — Jadwal sekarang\n.botdoctor riwayat — Diagnosa terakhir",
  example: ".botdoctor\n.botdoctor on 23:00",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

const JAM_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

function jamStr(s) {
  const d = new Date(s.t);
  const tgl = d.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short" });
  const jm = d.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).replaceAll(":", ".");
  return `${tgl} ${jm}`;
}

async function handler(m, { config: botConfig }) {
  const db = getDatabase();
  const st = ensureBotDoctorState(db);
  const args = (m.text || "").trim().split(/\s+/).slice(1);
  const sub = (args[0] || "").toLowerCase();

  try {
    // ── diagnosa sekarang ──
    if (!sub || sub === "tes" || sub === "now") {
      m.react?.("⚡");
      const { card } = await runBotDoctorNow({ save: true });
      await m.reply(card);
      if (!sub) {
        await m.reply(raraGuide(
          "botdoctor",
          "Kartu di atas hasil analisis sampel 24 jam terakhir (denyut tiap 20 detik).\nMau laporannya otomatis ke DM tiap malam?\n.botdoctor on [HH:mm] — nyalakan (default jam 23:00)\n.botdoctor riwayat — lihat diagnosa sebelumnya\n.botdoctor off — matikan kapan saja",
          ".botdoctor on 23:00\n.botdoctor riwayat",
          "Analisisnya beneran pola, bukan alert mentah: RAM yang naik linear = dugaan leak, latensi yang melonjak di jam tertentu = dugaan scheduler berat, uptime yang turun = restart."
        ));
      }
      return true;
    }

    // ── on [HH:mm] ──
    if (sub === "on") {
      const jam = (args[1] || st.sched.jam || "23:00");
      if (!JAM_RE.test(jam)) return m.reply(raraWrap("botdoctor", "Format jam gak valid. Contoh yang bener: .botdoctor on 23:00", "guide"));
      st.sched.on = true;
      st.sched.jam = jam.padStart(5, "0");
      // REVISI 9 Okt (owner): balasan switch ikut gaya promosi AI khas tele
      return m.reply(raraWrap("Dokter Bot", [
        "✅ *LAPORAN OTOMATIS: AKTIF*",
        `*Dokter bot siap lapor tiap hari jam ${st.sched.jam} WIB ke DM kamu*`,
        `Diagnosa manual kapan aja: *.botdoctor*`,
      ]));
    }

    // ── off ──
    if (sub === "off") {
      st.sched.on = false;
      return m.reply(raraWrap("Dokter Bot", [
        "❌ *LAPORAN OTOMATIS: MATI*",
        "*Diagnosa manual tetep bisa kapan aja* — ketik *.botdoctor*",
      ]));
    }

    // ── status / jam ──
    if (sub === "status" || sub === "jam") {
      const last = st.reports.length ? st.reports[st.reports.length - 1] : null;
      const lines = [
        "📊 *STATUS*",
        "━━━━━━━━━━━━━━",
        `▪ *Jadwal otomatis:* ${st.sched.on ? "✅ AKTIF" : "❌ MATI"}`,
        st.sched.on ? `▪ *Jam laporan:* ${st.sched.jam} WIB tiap hari` : `▪ *Nyalain:* .botdoctor on [HH:mm] (default 23:00)`,
        `▪ *Sampel denyut tersimpan:* ${st.samples.length} (≈${Math.round(st.samples.length / 180)} jam)`,
      ];
      if (last) lines.push(`▪ *Diagnosa terakhir:* skor ${last.score}/100, ${last.temuan} temuan (${jamStr(last)})`);
      return m.reply(raraWrap("Dokter Bot", lines));
    }

    // ── riwayat ──
    if (sub === "riwayat") {
      if (!st.reports.length) return m.reply(raraWrap("Dokter Bot", [
        "📋 *RIWAYAT DIAGNOSA*",
        "Belum ada riwayat diagnosa — jalankan *.botdoctor* dulu",
      ]));
      const rows = st.reports.slice(-10).reverse().map((r) => {
        const bar = r.score >= 80 ? "🟢" : r.score >= 50 ? "🟡" : "🔴";
        return `▪ ${bar} ${jamStr(r)} — skor ${r.score}/100, ${r.temuan} temuan`;
      });
      return m.reply(raraWrap("Dokter Bot", [
        "📋 *RIWAYAT DIAGNOSA* (terbaru dulu)",
        "━━━━━━━━━━━━━━",
        ...rows,
      ]));
    }

    return m.reply(raraWrap("Dokter Bot", [
      "❗ *Sub gak dikenal*",
      "Yang ada: *on [HH:mm]* · *off* · *status* · *riwayat*",
    ]));
  } catch (e) {
    return m.reply(raraWrap("Dokter Bot", [
      "❌ *GAGAL DIAGNOSA*",
      String(e?.message || e),
    ]));
  }
}

export { pluginConfig as config, handler };
export default { pluginConfig, handler };
