// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// movienotify.js — Auto Movie Notifier (request owner 9 Sep 2026, ala script
// standalone "movie notifier free" IMDbOT). Rantai: IMDbOT → Cinemeta (no key).
//   • .movienotify on/off    — langganan / berhenti di chat ini
//   • .movienotify status    — status langganan + global
//   • .movienotify info      — menu 3 tipe konten (trending/upcoming/nowplaying)
//   • .movienotify interval  — set jeda cek (menit 5-720, default 60)
//   • .movienotify now       — kirim sample semua tipe aktif ke chat ini
//   • .movienotify cari <judul>  — search manual (ala !movie)
//   • .movienotify trending | upcoming | nowplaying — list manual
// Toggle GLOBAL: .switch auto automovienotifier on/off

import {
  addTarget, removeTarget, isTarget, getStatus, isEnabled, runCheck,
  setSock, syncMonitor, getContentTypes, setContentType,
  MOVIE_TYPES, searchMovies, fetchTrending, fetchUpcoming, fetchNowPlaying,
  setIntervalMenit, sendMovieCardTo, enrichMovie,
} from "../../src/lib/rara-movie-notifier.js";
import { raraError, raraSuccess, raraGuide, raraGuideV2 } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "movienotify",
  alias: ["movienotif", "filmnotify", "filminfo"],
  category: "search",
  description: "Auto notifikasi film (IMDbOT → Cinemeta, gratis no key) — trending/terbaru/rating tinggi + search manual",
  usage: ".movienotify <on/off/info/interval/now/cari/trending/upcoming/nowplaying>",
  example: ".movienotify on\n.movienotify cari avengers",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, args }) {
  setSock(sock);
  const sub = String(args?.[0] || "").toLowerCase();

  // ── langganan auto ──
  if (sub === "on") {
    await m.react("🕒");
    const chatId = m.chat;
    if (isTarget(chatId)) return m.reply(raraSuccess(pluginConfig.name, "chat ini udah langganan movie notifier"));
    addTarget(chatId);
    if (!isEnabled()) {
      return m.reply(raraSuccess(pluginConfig.name, "chat ini terdaftar — tapi fitur auto masih OFF global, owner bisa nyalain via .switch auto automovienotifier on"));
    }
    const stBefore = getStatus();
    const sr = syncMonitor();
    const firstRunFlow = sr?.started && !stBefore.initDone;
    if (!firstRunFlow) {
      const res = await runCheck({ force: true, chatId }).catch((e) => ({ err: e }));
      if (res?.err) return m.reply(raraError(pluginConfig.name, "gagal ambil data: " + res.err.message));
    }
    await m.react("🐣");
    return m.reply(raraSuccess(pluginConfig.name, "aktif di chat ini — film trending/terbaru/rating tinggi otomatis masuk ke sini"));
  }

  if (sub === "off") {
    removeTarget(m.chat);
    return m.reply(raraSuccess(pluginConfig.name, "chat ini berhenti langganan movie notifier"));
  }

  if (sub === "status") {
    const st = getStatus();
    const lines = [
      `Langganan chat ini: ${isTarget(m.chat) ? "AKTIF" : "BELUM"}`,
      `Fitur global: ${st.enabled ? "ON" : "OFF"} (.switch auto automovienotifier)`,
      `Monitor: ${st.running ? "JALAN" : "STOP"}`,
      `Total subscriber: ${st.targets.length} chat`,
      `Interval: tiap ${st.intervalMenit} menit`,
      `Sumber: IMDbOT → Cinemeta (fallback, no key)`,
      `Cek terakhir: ${st.lastCheck ? new Date(st.lastCheck).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "belum pernah"}`,
      `Tipe konten: ${Object.entries(getContentTypes()).filter(([, on]) => on !== false).map(([k]) => k).join(", ") || "semua off"} (.movienotify info)`,
    ];
    return m.reply(`「 ✦ ${pluginConfig.name.toUpperCase()} ✦ 」\n` + lines.join("\n"));
  }

  if (sub === "info" || sub === "tipe" || sub === "opsi") {
    const tipe = String(args?.[1] || "").toLowerCase();
    const onOff = String(args?.[2] || "").toLowerCase();
    const types = getContentTypes();

    if (!tipe || !["on", "off", "aktif", "mati"].includes(onOff)) {
      const lines = Object.entries(MOVIE_TYPES)
        .filter(([key]) => key !== "new")
        .map(([key, t]) => {
          const on = types[key] !== false;
          return `${on ? "🟢" : "🔴"} *${key}* — ${t.emoji} ${t.desc}\n   ${on ? "ON" : "OFF"} · atur: .movienotify info ${key} ${on ? "off" : "on"}`;
        });
      return m.reply(
        `「 ✦ ${pluginConfig.name.toUpperCase()} — TIPE KONTEN ✦ 」\n\n` +
        lines.join("\n\n") +
        `\n\n💡 Aktif/mati semua: .movienotify info semua on|off` +
        `\n💡 Kirim semua tipe aktif sekarang: .movienotify now`
      );
    }

    const action = (onOff === "on" || onOff === "aktif");
    const res = setContentType(tipe, action);
    if (!res) {
      return m.reply(raraError(pluginConfig.name, `tipe gak dikenal: ${tipe} — ketik .movienotify info buat daftar tipe`));
    }
    return m.reply(raraSuccess(pluginConfig.name, `tipe *${tipe}* sekarang ${action ? "AKTIF" : "MATI"} — notifikasi terkait ${action ? "bakal masuk" : "gak bakal dikirim"}`));
  }

  if (sub === "interval" || sub === "jadwal") {
    const val = Number(args?.[1]);
    const st = getStatus();
    if (!val) {
      return m.reply(raraGuideV2(pluginConfig.name, {
        kaomoji: "(ノ◕ヮ◕)ノ",
        sapaan: `interval cek sekarang tiap ${st.intervalMenit} menit — mau diatur?`,
        cara: "ketik .movienotify interval <menit> (5–720)",
        contoh: ".movienotify interval 60",
        note: "film baru dideteksi berkala lalu dikirim ke semua chat yang langganan",
      }));
    }
    const res = setIntervalMenit(val);
    if (!res) {
      return m.reply(raraError(pluginConfig.name, "interval harus 5–720 menit (contoh: .movienotify interval 60)"));
    }
    return m.reply(raraSuccess(pluginConfig.name, `interval cek sekarang *tiap ${res} menit* — monitor di-restart, film baru langsung dikirim begitu terdeteksi`));
  }

  if (sub === "now") {
    await m.react("⏲️");
    const res = await runCheck({ force: true, chatId: m.chat }).catch((e) => ({ err: e }));
    if (res?.err) return m.reply(raraError(pluginConfig.name, "gagal ambil data: " + res.err.message));
    await m.react("🐣");
    return m.reply(raraSuccess(pluginConfig.name, "sample semua tipe aktif lagi dikirim di atas"));
  }

  // ── manual ala script (!movie / !trending / !upcoming / !nowplaying) ──
  if (sub === "cari" || sub === "search" || sub === "s") {
    const query = (args || []).slice(1).join(" ").trim();
    if (query.length < 2) {
      return m.reply(raraGuide(pluginConfig.name, "masukkan judul film minimal 2 huruf\nContoh: .movienotify cari avengers"));
    }
    await m.react("⏲️");
    const { list, source } = await searchMovies(query, 3).catch(() => ({ list: [], source: null }));
    if (!list.length) {
      await m.react("🐣");
      return m.reply(raraError(pluginConfig.name, `film "${query}" gak ditemukan`));
    }
    for (let i = 0; i < list.length; i++) {
      const mv = await enrichMovie(list[i]);
      await sendMovieCardTo(sock, m.chat, mv, { type: "new", index: i + 1, total: list.length });
    }
    await m.react("🐣");
    return null;
  }

  if (["trending", "upcoming", "nowplaying", "populer", "terbaru"].includes(sub)) {
    const type = (sub === "trending" || sub === "populer") ? "trending"
      : (sub === "upcoming" || sub === "terbaru") ? "upcoming" : "nowplaying";
    await m.react("⏲️");
    const fetcher = type === "trending" ? fetchTrending : type === "upcoming" ? fetchUpcoming : fetchNowPlaying;
    const { list } = await fetcher(3).catch(() => ({ list: [] }));
    if (!list.length) {
      await m.react("🐣");
      return m.reply(raraError(pluginConfig.name, "gak ada film ditemukan — sumber lagi down, coba lagi bentar"));
    }
    for (let i = 0; i < list.length; i++) {
      const mv = await enrichMovie(list[i]);
      await sendMovieCardTo(sock, m.chat, mv, { type, index: i + 1, total: list.length });
    }
    await m.react("🐣");
    return null;
  }

  return m.reply(raraGuideV2(pluginConfig.name, {
    kaomoji: "(ノ◕ヮ◕)ノ",
    sapaan: `pengin update film terbaru otomatis? langganan aja! (auto ${isEnabled() ? "ON" : "OFF"} global, gratis tanpa apikey)`,
    cara: "on buat langganan · off berhenti · status cek kondisi · info atur tipe · interval atur jeda · now kirim sekarang · cari <judul> buat manual",
    contoh: ".movienotify on\n.movienotify cari avengers",
    note: "film baru trending/upcoming/nowplaying otomatis masuk ke chat yang langganan",
  }));
}

export { pluginConfig as config, handler }
