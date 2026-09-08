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
  getGenres, addGenre, removeGenre, previewWatchlist,
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

  if (sub === "anime") {
    await m.react("🕒");
    try {
      const res = await previewWatchlist(m.chat);
      await m.react("🐣");
      return m.reply(novaSuccess(pluginConfig.name, `daftar ${res.count} anime terbaru dikirim di atas — sumber ${res.source}`));
    } catch (e) {
      return m.reply(novaError(pluginConfig.name, "sumber anime lagi sibuk — coba lagi sebentar lagi"));
    }
  }

  if (sub === "genre") {
    const action = String(args?.[1] || "").toLowerCase();
    if (action === "add") {
      const g = (args?.slice(2).join(" ") || "").trim();
      if (!g) return m.reply(novaGuide(pluginConfig.name, "nama genre wajib — contoh genre populer: Action, Adventure, Comedy, Drama, Fantasy, Horror, Mystery, Romance, Sci-Fi, Sports, Supernatural, Isekai", ".animenotify genre add Sports"));
      const r = addGenre(g);
      if (!r.ok) return m.reply(novaError(pluginConfig.name, r.dup ? `genre "${g}" udah ada di daftar` : "nama genre kosong"));
      return m.reply(novaSuccess(pluginConfig.name, `genre "${g}" ditambah — sekarang ${r.genres.length} genre dipantau: ${r.genres.join(", ")}`));
    }
    if (action === "del" || action === "remove") {
      const g = (args?.slice(2).join(" ") || "").trim();
      const r = removeGenre(g);
      if (!r.ok) return m.reply(novaError(pluginConfig.name, `genre "${g}" gak ada di daftar`));
      return m.reply(novaSuccess(pluginConfig.name, `genre "${g}" dihapus — sisa ${r.genres.length} genre: ${r.genres.join(", ")}`));
    }
    const genres = getGenres();
    return m.reply(
      `「 ✦ GENRE DIPANTAU ✦ 」\n` +
      `🎭 ${genres.length} genre favorit yang dipantau notifier V2:\n\n` +
      genres.map((g, i) => `${i + 1}. ${g}`).join("\n") +
      `\n\nUbah: .animenotify genre add <genre> / genre del <genre>\n` +
      `Genre baru berlaku di cek AniList berikutnya (Kitsu gak filter genre)`
    );
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
      "auto notifikasi ANIME BARU + EPISODE BARU (AniList → Kitsu) — dikirim tiap 30 menit ke chat langganan",
      ".animenotify on — langganan chat ini\n.animenotify off — berhenti\n.animenotify status — lihat status\n.animenotify now — paksa kirim watchlist terkini\n.animenotify anime — daftar anime terbaru\n.animenotify genre — genre dipantau (add/del)\n.animenotify season — preview seasonal MAL\n.carianime <judul> — cari anime manual",
      "pause/resume global: .switch auto autoanimenotifier on/off (owner)",
    ),
  );
}

// ── KONVENSI SIGNATURE (dispatcher manggil handler(m, {sock, ...})) ──
export { pluginConfig as config, handler };
export default { config: pluginConfig, handler };
