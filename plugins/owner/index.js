// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .index — panel kontrol bot saat run (request owner 26 Sep 2026: "di
// kategori owner ada plugin index.js, kalau ketik .index muncul usage
// dan list fitur yang tersedia untuk kontrol bot — mengontrol bagian
// di index dan connection").
// Sub: optimizer (RAM auto-turun > 500MB, default off) · pinglog · jam
// · ram · status.
import { novaGuideV2, novaSalahV2, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getConnectionState } from "../../src/connection.js";
import { formatBytes, formatDuration, formatClockLine } from "../../src/lib/nova-pinglog.js";
import {
  getOptimizerState, setOptimizer, optimizeNow,
} from "../../src/lib/nova-optimizer.js";
import { gracefulRestart, isRestarting } from "../../src/lib/nova-process-control.js";

const pluginConfig = {
  name: "index",
  alias: ["index", "panelindex", "botcontrol"],
  category: "owner",
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
  "optimize — optimasi RAM SEKARANG (manual)",
  "status — ringkasan semua kontrol",
  "restart — restart bot dari chat (konfirmasi: restart ya)",
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
