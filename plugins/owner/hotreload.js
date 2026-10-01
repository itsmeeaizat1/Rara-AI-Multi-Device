// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Plugin .hotreload — auto reload plugin pas file berubah TANPA restart bot. OWNER-ONLY.
import { raraGuide, raraError, raraWrap } from "../../src/lib/rara-menu-style.js";
import {
  enableHotreload, disableHotreload, hotreloadStatus, manualReload,
  startHotreload, setHotreloadNotifier
} from "../../src/lib/rara-hotreload.js";

const pluginConfig = {
  name: "hotreload",
  alias: ["autoreload"],
  category: "owner",
  description: "Auto hot-reload plugin saat file berubah — update tanpa restart bot",
  usage: ".hotreload on | .hotreload off | .hotreload status | .hotreload log | .hotreload reload <file.js>",
  example: ".hotreload on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 3,
  energi: 0,
  limit: 0,
  isEnabled: true,
};

async function handler(m, params = {}) {
  const sock = params.sock;
  const rest = String(m.text || "").replace(/^\S+\s*/, "").trim();
  try {
    const first = rest.split(/\s+/)[0].toLowerCase();
    if (first === "on") {
      const r = enableHotreload(m.sender);
      if (sock) setHotreloadNotifier(async (to, text) => { try { await sock.sendMessage(to, { text }); } catch {} });
      await m.react(r.ok ? "⚡" : "❌");
      await m.reply(raraWrap("HotReload", r.ok
        ? "AUTO RELOAD AKTIF\n\nWatcher jalan di folder plugins/ — tiap file .js yang berubah/ditambah otomatis dimuat ulang tanpa restart. Notifikasi hasil reload dikirim ke chat kamu."
        : "Gagal: " + (r.error || "?")));
    } else if (first === "off") {
      disableHotreload();
      await m.react("⚡");
      await m.reply(raraWrap("HotReload", "AUTO RELOAD MATI"));
    } else if (first === "status") {
      const s = hotreloadStatus();
      await m.react("⚡");
      await m.reply(raraWrap("HotReload", (s.active ? "NYALA" : "MATI") + "\nTotal file reload: " + s.count + "\nTerakhir: " + (s.lastReload ? s.lastReload.slice(0, 19).replace("T", " ") + " WIB" : "belum ada")));
    } else if (first === "log") {
      const s = hotreloadStatus();
      const lines = (s.log || []).map((e) => "⏱ " + String(e.when || "").slice(0, 19).replace("T", " ") + "\n" + (e.results || []).map((r) => (r.ok ? "✅ " : "❌ ") + r.file).join("\n")).join("\n\n");
      await m.react("🔍");
      await m.reply(raraWrap("HotReload Log", lines || "belum ada aktivitas reload"));
    } else if (first === "reload") {
      const target = rest.replace(/^reload\s*/i, "").trim();
      if (!target) {
        await m.reply(raraWrap("HotReload", "Format: .hotreload reload plugins/main/menu.js"));
      } else {
        const r = await manualReload(target);
        await m.react(r.ok ? "⚡" : "❌");
        await m.reply(raraWrap("HotReload", r.ok ? "✅ " + target + " dimuat ulang → " + r.name : "❌ " + r.error));
      }
    } else {
      await m.react("🐣");
      await m.reply(raraGuide(
        "hotreload",
        "Auto hot-reload: watcher memantau folder plugins/, file yang berubah otomatis dimuat ulang tanpa restart bot — pas banget habis git pull di VPS.",
        ".hotreload on",
        "Cuma plugin yang di-reload; perubahan engine (src/lib) tetap butuh restart. Log aktivitas: .hotreload log. Owner-only."
      ));
    }
  } catch (error) {
    console.error("[hotreload]:", error.message);
    await m.react("❌");
    await m.reply(raraError("HotReload", "Gagal: " + String(error.message).slice(0, 120)));
  }
  return { handled: true };
}

export { pluginConfig as config, handler };
