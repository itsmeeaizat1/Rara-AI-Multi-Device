// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .index — panel kontrol bot saat run (request owner 26 Sep 2026: "di
// kategori owner ada plugin index.js, kalau ketik .index muncul usage
// dan list fitur yang tersedia untuk kontrol bot — mengontrol bagian
// di index dan connection").
// Sub: optimizer (RAM auto-turun > 500MB, default off) · pinglog · jam
// · ram · ramalert (DM owner pas RAM sistem lewat ambang, default off) ·
// status.
import { novaGuideV2, novaSalahV2, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getConnectionState, forceReconnect } from "../../src/connection.js";
import {
  startWatchdog, stopWatchdog, getWatchdogStatus, setWatchdogInterval,
} from "../../src/connection.js";
import { formatBytes, formatDuration, formatClockLine, getCpuLoadInfo } from "../../src/lib/nova-pinglog.js";
import {
  getOptimizerState, setOptimizer, optimizeNow,
} from "../../src/lib/nova-optimizer.js";
import { gracefulRestart, isRestarting } from "../../src/lib/nova-process-control.js";

const pluginConfig = {
  name: "index",
  alias: ["index", "panelindex", "botcontrol"],
  category: "bot",
  description: "Panel kontrol bot saat run: optimizer RAM, ping log, jam, status",
  usage: ".index",
  example: ".index optimizer on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const SUB_LIST = [
  "optimizer on [mb] — nyalain optimizer RAM (threshold default 500 MB)",
  "optimizer off — matiin optimizer",
  "optimizer status — lihat status optimizer",
  "ping on|off — nyalain/matikan log ping tiap 20 dtk (alias pinglog)",
  "jam on|off — nyalain/matikan log jam tiap 10 dtk",
  "ram — cek pemakaian RAM sekarang",
  "ramalert on [persen] — alert DM owner pas RAM SISTEM lewat ambang (default 80%, fitur ini default OFF)",
  "ramalert off — matiin alert RAM",
  "ramalert status — lihat kondisi alert RAM sekarang",
  "optimize — optimasi RAM SEKARANG (manual)",
  "status — ringkasan semua kontrol",
  "restart — restart bot dari chat (konfirmasi: restart ya)",
  "dbsave — simpan database sekarang (anti rugi data)",
  "reconnect — putus & nyambung lagi WA tanpa restart proses",
  "watchdog status|on|off|interval <mnt> — kontrol detektor koneksi beku",
];

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🛠️");
    const sub = (m.args[0] || "").toLowerCase();
    const arg1 = m.args[1];
    // wrapper: tiap reply sukses otomatis react 🐣 + tag reply "index"
    const mm = { ...m, reply: (text) => { m.react("🐣"); return m.reply(text, "index"); } };

    if (!sub) {
      return mm.reply(
        novaGuideV2("index", {
          sapaan: "Panel kontrol bot saat run — bagian index.js & connection.js",
          cara: SUB_LIST.map((s) => "• " + prefix + s).join("\n"),
          contoh: `${prefix}index optimizer on · ${prefix}index optimizer on 600 · ${prefix}index pinglog off`,
          note: "Optimizer default OFF · ping log & jam nyala otomatis saat boot",
        }));
    }

    // ─── optimizer ───
    if (sub === "optimizer") {
      const act = (arg1 || "").toLowerCase();
      if (act === "on") {
        const mb = Number(m.args[2]) >= 100 ? Number(m.args[2]) : undefined;
        const st = setOptimizer(true, mb);
        return mm.reply(claraWrap("index", [
          `✅ Optimizer AKTIF`,
          "",
          `Ambang: ${st.thresholdMB} MB`,
          `Kalau RAM bot lewat ambang, otomatis diturunkan tiap 15 dtk (cooldown 60 dtk).`,
        ]));
      }
      if (act === "off") {
        setOptimizer(false);
        return mm.reply(claraWrap("index", "❌ Optimizer dimatikan — RAM gak dipantau otomatis lagi."));
      }
      if (act === "status") {
        const st = getOptimizerState();
        return mm.reply(claraWrap("index", [
          `⚙️ Status Optimizer`,
          "",
          `Kondisi: ${st.on ? "🟢 ON" : "🔴 OFF"}`,
          `Ambang: ${st.thresholdMB} MB`,
          `Total optimasi: ${st.totalRuns || 0}x`,
          `Bebas terakhir: ${st.lastFreedMB || 0} MB`,
        ]));
      }
      return mm.reply(novaSalahV2("index", { pesan: "subcommand gak dikenal — ketik .index buat lihat daftar kontrol", contoh: prefix + "index optimizer on" }));
    }

    // ─── optimize manual ───
    if (sub === "optimize") {
      const res = await optimizeNow("manual (.index optimize)");
      const lines = [
        `🧹 Optimasi dijalankan`,
        "",
        `RAM sebelum: ${formatBytes(res.before)}`,
        `RAM sesudah: ${formatBytes(res.after)}`,
        `Dibebaskan: ${res.freedMB} MB`,
      ];
      if (res.methods.length) lines.push(`Metode: ${res.methods.join(", ")}`);
      if (res.hint) lines.push(`⚠ ${res.hint}`);
      return mm.reply(claraWrap("index", lines));
    }

    // ─── pinglog (alias .index ping — rev owner: "log ping bisa di off lewat .index ping off") ───
    if (sub === "pinglog" || sub === "ping") {
      const act = (arg1 || "").toLowerCase();
      const { startPingLog, stopPingLog, _pingLogInternalsForTest } = await import("../../src/lib/nova-pinglog.js");
      if (act === "on") {
        startPingLog(sock);
        return mm.reply(claraWrap("index", "✅ Ping log dinyalakan — baris ping tiap 20 dtk + jam tiap 10 dtk di panel."));
      }
      if (act === "off") {
        stopPingLog();
        return mm.reply(claraWrap("index", "❌ Ping log dimatikan (baris ping + jam berhenti)."));
      }
      if (act === "status") {
        const itl = _pingLogInternalsForTest();
        return mm.reply(claraWrap("index", [
          `📡 Ping Log: ${itl.isRunning() ? "🟢 jalan" : "🔴 mati"}`,
          `🕒 Jam: ${itl.isClockRunning() ? "🟢 jalan" : "🔴 mati"}`,
        ]));
      }
      return mm.reply(novaSalahV2("index", { pesan: "subcommand gak dikenal — ketik .index buat lihat daftar kontrol", contoh: prefix + "index optimizer on" }));
    }

    // ─── jam ───
    if (sub === "jam") {
      const act = (arg1 || "").toLowerCase();
      const { startPingClock, stopPingClock, _pingLogInternalsForTest } = await import("../../src/lib/nova-pinglog.js");
      if (act === "on") {
        startPingClock();
        return mm.reply(claraWrap("index", `✅ Log jam dinyalakan — ${formatClockLine()}`));
      }
      if (act === "off") {
        stopPingClock();
        return mm.reply(claraWrap("index", "❌ Log jam dimatikan."));
      }
      return mm.reply(novaSalahV2("index", { pesan: "subcommand gak dikenal — ketik .index buat lihat daftar kontrol", contoh: prefix + "index optimizer on" }));
    }

    // ─── ram ───
    if (sub === "ram") {
      const rss = process.memoryUsage().rss;
      const heap = process.memoryUsage().heapUsed;
      const cs = getConnectionState();
      return mm.reply(claraWrap("index", [
        `🧠 RAM: ${formatBytes(rss)}`,
        `🧠 Heap: ${formatBytes(heap)}`,
        `⏱ Uptime: ${formatDuration(process.uptime())}`,
        `📡 WA: ${cs?.isConnected ? "✅ nyambung" : "❌ terputus"}`,
      ]));
    }

    // ─── ramalert (owner 26 Sep: "ya mau defaultnya off") ───
    if (sub === "ramalert") {
      const { setRamAlert, getRamAlertStatus } = await import("../../src/lib/nova-pinglog.js");
      const act = (arg1 || "status").toLowerCase();
      if (act === "on") {
        const persen = Number(m.args[2]);
        if (Number.isFinite(persen) && (persen < 50 || persen > 99)) {
          return mm.reply(novaSalahV2("index", { pesan: "ambang persen harus 50-99 (persen pemakaian RAM sistem)", contoh: prefix + "index ramalert on 85" }));
        }
        const st = setRamAlert(true, Number.isFinite(persen) ? persen : undefined);
        // alert numpang tick pinglog — kalau pinglog mati, nyalain sekalian
        let nyalain = "";
        const { _pingLogInternalsForTest } = await import("../../src/lib/nova-pinglog.js");
        const itl = _pingLogInternalsForTest();
        if (!itl.isRunning()) {
          const { startPingLog } = await import("../../src/lib/nova-pinglog.js");
          startPingLog(sock);
          nyalain = "\nPing log tadi mati — saya nyalain sekalian biar alert bisa jalan.";
        }
        return mm.reply(claraWrap("index", [
          `✅ RAM Alert AKTIF`,
          "",
          `Ambang: ${st.thresholdPct}% RAM sistem`,
          `Kalau pemakaian RAM server lewat ambang, saya DM kamu (maks 1x per 30 menit).` + nyalain,
        ]));
      }
      if (act === "off") {
        setRamAlert(false);
        return mm.reply(claraWrap("index", "❌ RAM Alert dimatikan — gak ada DM lagi pas RAM tinggi."));
      }
      if (act === "status") {
        const st = getRamAlertStatus();
        const last = st.lastAlertAt ? new Date(st.lastAlertAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "belum pernah";
        return mm.reply(claraWrap("index", [
          `🧠 Status RAM Alert`,
          "",
          `Kondisi: ${st.on ? "🟢 ON" : "🔴 OFF (default)"}`,
          `Ambang: ${st.thresholdPct}%`,
          `RAM sistem: ${st.sysPct}% (${formatBytes(st.sysUsed)} dari ${formatBytes(st.sysTotal)})`,
          `RAM bot: ${formatBytes(st.rss)}`,
          `CPU: load ${st.cpu.load} (${st.cpu.cores} core) ≈ ${st.cpu.pct}%`,
          `Alert terakhir: ${last}`,
        ]));
      }
      return mm.reply(novaSalahV2("index", { pesan: "aksi gak dikenal — on [persen] / off / status", contoh: prefix + "index ramalert on 85" }));
    }

    // ─── status ───
    if (sub === "status") {
      const st = getOptimizerState();
      const { _pingLogInternalsForTest } = await import("../../src/lib/nova-pinglog.js");
      const itl = _pingLogInternalsForTest();
      const cs = getConnectionState();
      return mm.reply(claraWrap("index", [
        `📊 Ringkasan Kontrol Bot`,
        "",
        `Optimizer: ${st.on ? "🟢 ON (ambang ${st.thresholdMB} MB)" : "🔴 OFF"}`,
        `Ping log: ${itl.isRunning() ? "🟢 jalan" : "🔴 mati"}`,
        `Log jam: ${itl.isClockRunning() ? "🟢 jalan" : "🔴 mati"}`,
        `RAM: ${formatBytes(process.memoryUsage().rss)}`,
        `WA: ${cs?.isConnected ? "✅ nyambung" : "❌ terputus"}`,
        `Uptime: ${formatDuration(process.uptime())}`,
        `RAM Alert: ${(await import("../../src/lib/nova-pinglog.js")).getRamAlertStatus().on ? "🟢 ON" : "🔴 OFF (default)"}`,
      ]));
    }

    // ─── dbsave (no.3 — paksa simpan DB sebelum restart/backup) ───
    if (sub === "dbsave" || sub === "db" || sub === "dbsimpan") {
      const db = getDatabase();
      if (!db?.save) return mm.reply(claraWrap("index", "❌ Database belum siap."));
      await db.save();
      return mm.reply(claraWrap("index", [
        "💾 Database tersimpan sekarang.",
        "",
        "Semua perubahan (user, sesi, config) udah ditulis ke disk.",
      ]));
    }

    // ─── watchdog (no.5 — detektor koneksi beku, kini bisa diatur runtime) ───
    if (sub === "watchdog") {
      const act = (arg1 || "").toLowerCase();
      if (act === "status") {
        const wd = getWatchdogStatus();
        return mm.reply(claraWrap("index", [
          "🐕 Status Watchdog",
          "",
          `Kondisi: ${wd.active ? "🟢 aktif" : "🔴 mati"}`,
          `Batas hening: ${wd.intervalMin} menit`,
          `Senyap sekarang: ${wd.silentMin} menit`,
          `Kalau senyap lewat batas, koneksi di-restart otomatis.`,
        ]));
      }
      if (act === "on") {
        startWatchdog(() => forceReconnect("watchdog aktif"));
        return mm.reply(claraWrap("index", "✅ Watchdog dinyalakan — bot beku akan di-restart otomatis saat hening lewat batas."));
      }
      if (act === "off") {
        stopWatchdog();
        return mm.reply(claraWrap("index", "❌ Watchdog dimatikan — koneksi beku gak dideteksi otomatis lagi."));
      }
      if (act === "interval") {
        const res = setWatchdogInterval(m.args[2]);
        if (!res.ok) {
          return mm.reply(claraWrap("index", [
            "❌ Interval gak valid.",
            "",
            `Harus 1-1440 menit. Contoh: ${prefix}index watchdog interval 10`,
          ]));
        }
        return mm.reply(claraWrap("index", `✅ Batas watchdog diubah ke ${res.intervalMin} menit — langsung aktif tanpa restart.`));
      }
      return mm.reply(novaSalahV2("index", { pesan: "sub watchdog gak dikenal — status / on / off / interval", contoh: prefix + "index watchdog interval 10" }));
    }

    // ─── reconnect (no.4 — bot beku? putus & nyambung lagi TANPA restart proses) ───
    if (sub === "reconnect") {
      const db = getDatabase();
      try { await db?.save?.(); } catch {}
      const res = forceReconnect("panel .index reconnect (owner)");
      if (!res.ok) {
        return mm.reply(claraWrap("index", [
          "❌ Reconnect gagal dijalankan.",
          "",
          res.reason || "Koneksi belum aktif.",
          "Kalau bot emang beku parah, pakai " + prefix + "index restart ya.",
        ]));
      }
      return mm.reply(claraWrap("index", [
        "🔄 Reconnect dijalankan...",
        "",
        "Koneksi sengaja diputus (DB udah disimpan), bot nyambung lagi otomatis.",
        "Tunggu ± 15 dtk — tanpa restart proses, log panel tetap jalan.",
      ]));
    }

    // ─── restart (no.2 — restart bot dari chat, DB disimpan dulu) ───
    if (sub === "restart") {
      const act = (arg1 || "").toLowerCase();
      if (act === "ya") {
        const res = await gracefulRestart();
        if (!res.ok) {
          return mm.reply(claraWrap("index", "⚠ Proses restart udah jalan — bot bakal bangun sendiri."));
        }
        return mm.reply(claraWrap("index", [
          "🔄 Restart dijalankan...",
          "",
          "Database disimpan dulu, bot keluar, lalu pm2 bangunin lagi.",
          "Tunggu ± 10 dtk, panel log bakal nampilin boot berikutnya.",
        ]));
      }
      return mm.reply(claraWrap("index", [
        "⚠ Restart bot akan memutus koneksi WA sejenak (± 10 dtk).",
        "",
        `Yakin? Ketik: ${prefix}index restart ya`,
      ]));
    }

    return mm.reply(novaSalahV2("index", { pesan: "subcommand gak dikenal — ketik .index buat lihat daftar kontrol", contoh: prefix + "index optimizer on" }));
  } catch (e) {
    await m.react("❌");
    return m.reply(claraWrap("index", `❌ Gagal: ${e?.message || e}`), "index");
  }
}

export { pluginConfig as config, handler };
