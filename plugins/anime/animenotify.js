// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// animenotify.js — Auto Anime Notifier (request owner 8 Sep 2026, ala script
// standalone "anime notifier bot" owner). Sumber: AniList GraphQL (utama)
// → Kitsu (fallback). Per-chat opt-in:
//   • .animenotify on/off   — langganan / berhenti di chat ini
//   • .animenotify status    — status langganan + global
//   • .animenotify now       — paksa kirim daftar releasing terkini
//   • .animenotify season    — preview seasonal dari MAL/Jikan (manual)
// Toggle GLOBAL (pause/resume semua polling): .switch auto autoanimenotifier on/off

import {
  addTarget, removeTarget, isTarget, getStatus, isEnabled, runCheck,
  getSeasonPreview, formatSeasonMessage, setSock, syncMonitor,
} from "../../src/lib/nova-auto-anime-notifier.js";
import { novaError, novaGuide, novaSuccess } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "animenotify",
  alias: ["animenotif", "aninotify"],
  category: "anime",
  description: "Auto notifikasi anime terbaru (AniList → Kitsu) — langganan per-chat",
  usage: ".animenotify <on/off/status/now/season>",
  example: ".animenotify on\n.animenotify season",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, args }) {
  const sub = String(args?.[0] || "").toLowerCase();

  if (sub === "on") {
    await m.react("🕒");
    const chatId = m.chat;
    if (isTarget(chatId)) return m.reply(novaSuccess(pluginConfig.name, "chat ini udah langganan anime notifier"));
    addTarget(chatId);
    if (!isEnabled()) {
      return m.reply(
        novaSuccess(pluginConfig.name, "chat ini terdaftar — tapi fitur auto masih OFF global, owner bisa nyalain via .switch auto autoanimenotifier on"),
      );
    }
    // kirim contoh daftar terkini langsung ke chat ini sebagai bukti pipeline jalan
    const res = await runCheck({ force: true, chatId }).catch((e) => ({ err: e }));
    if (res?.err) return m.reply(novaError(pluginConfig.name, "gagal ambil data: " + res.err.message));
    await m.react("🐣");
    return m.reply(novaSuccess(pluginConfig.name, "aktif di chat ini — anime baru otomatis masuk tiap jam (cek daftar di atas)"));
  }

  if (sub === "off") {
    removeTarget(m.chat);
    return m.reply(novaSuccess(pluginConfig.name, "chat ini berhenti langganan anime notifier"));
  }

  if (sub === "status") {
    const st = getStatus();
    const lines = [
      `Langganan chat ini: ${isTarget(m.chat) ? "AKTIF" : "BELUM"}`,
      `Fitur global: ${st.enabled ? "ON" : "OFF"} (.switch auto autoanimenotifier)`,
      `Monitor: ${st.running ? "JALAN" : "STOP"}`,
      `Total subscriber: ${st.targets.length} chat`,
      `Interval: tiap ${st.intervalMenit} menit`,
      `Sumber: AniList → Kitsu (fallback)`,
      `Cek terakhir: ${st.lastCheck ? new Date(st.lastCheck).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "belum pernah"} (${st.lastSource || "-"})`,
    ];
    return m.reply(`「 ✦ ${pluginConfig.name.toUpperCase()} ✦ 」\n` + lines.join("\n"));
  }

  if (sub === "now") {
    await m.react("🕒");
    if (!isTarget(m.chat)) {
      return m.reply(novaGuide(pluginConfig.name, "chat ini belum langganan — ketik .animenotify on dulu", ".animenotify now"));
    }
    const res = await runCheck({ force: true, chatId: m.chat }).catch((e) => ({ err: e }));
    if (res?.err) return m.reply(novaError(pluginConfig.name, "gagal ambil data: " + res.err.message));
    await m.react("🐣");
    return m.reply(novaSuccess(pluginConfig.name, "daftar anime releasing terkini dikirim di atas"));
  }

  if (sub === "season") {
    await m.react("🕒");
    try {
      const season = await getSeasonPreview(10);
      if (!season.list.length) return m.reply(novaError(pluginConfig.name, "data seasonal kosong"));
      await m.react("🐣");
      return m.reply(formatSeasonMessage(season));
    } catch (e) {
      return m.reply(novaError(pluginConfig.name, "Jikan/MAL lagi sibuk — coba lagi sebentar lagi"));
    }
  }

  return m.reply(
    novaGuide(
      pluginConfig.name,
      "auto notifikasi anime terbaru (AniList → Kitsu) — anime RELEASING baru dikirim tiap jam ke chat langganan",
      ".animenotify on — langganan chat ini\n.animenotify off — berhenti\n.animenotify status — lihat status\n.animenotify now — paksa kirim daftar terkini\n.animenotify season — preview seasonal MAL",
      "pause/resume global: .switch auto autoanimenotifier on/off (owner)",
    ),
  );
}

// ── KONVENSI SIGNATURE (dispatcher manggil handler(m, {sock, ...})) ──
export { pluginConfig as config, handler };
export default { config: pluginConfig, handler };
