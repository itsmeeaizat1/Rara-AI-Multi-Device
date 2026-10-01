// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// linkedinnotify.js — Auto LinkedIn Job Notifier (request owner 10 Sep 2026).
// Sumber: Apify valig/linkedin-jobs-scraper ($0.0004/job). Card per-lowongan
// ala anime notifier: metadata lengkap + deskripsi ℅readmore + banner.
//   • .linkedinnotify on/off/status/now
//   • .linkedinnotify keyword add/del/list <posisi>
//   • .linkedinnotify lokasi <kota/negara> | periode <hari|minggu|bulan>
//   • .linkedinnotify easyapply on/off | interval <menit>
// Toggle GLOBAL: .switch auto autolinkedin on/off | .switch auto autolinkedin set

import {
  addTarget, removeTarget, isTarget, getStatus, runCheck,
  addKeyword, delKeyword, setLocation, setEasyApply, setDatePosted,
  setIntervalMenit, isLinkedInNotifierOn, setLinkedInNotifierOn,
} from "../../src/lib/rara-linkedin-notify.js";
import { raraError, raraSuccess, raraGuide } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "linkedinnotify",
  alias: ["linkedin", "lnjobs", "linkedinjobs", "lokerlinkedin", "autolinkedin", "lnnotify"],
  category: "loker",
  description: "Auto notifikasi lowongan LinkedIn baru (via Apify) — card metadata lengkap per job",
  usage: ".linkedinnotify <on/off/status/now/keyword/lokasi/periode/easyapply/interval>",
  example: ".linkedinnotify on\n.linkedinnotify keyword add frontend\n.linkedinnotify lokasi Jakarta",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const PERIODE_LABEL = { r86400: "24 jam terakhir", r604800: "minggu terakhir", r2592000: "bulan terakhir" };

async function handler(m, { sock, args }) {
  const sub = String(args?.[0] || "").toLowerCase();
  const val = String(args?.[1] || "").trim();

  // ── langganan auto (per-chat) ──
  if (sub === "on") {
    await m.react("🕒");
    const chatId = m.chat;
    if (isTarget(chatId)) return m.reply(raraSuccess(pluginConfig.name, "chat ini udah langganan lowongan LinkedIn"));
    addTarget(chatId);
    if (!isLinkedInNotifierOn()) setLinkedInNotifierOn(true);
    await m.react("🐣");
    return m.reply(raraSuccess(pluginConfig.name, "chat ini langganan lowongan LinkedIn — job baru bakal masuk otomatis (cek tiap 2 jam, jam 07:00–22:00 WIB)"));
  }
  if (sub === "off") {
    await m.react("🕒");
    removeTarget(m.chat);
    await m.react("🐣");
    return m.reply(raraSuccess(pluginConfig.name, "chat ini berhenti langganan lowongan LinkedIn"));
  }

  if (sub === "status") {
    const st = getStatus();
    const subs = st.targets.length ? st.targets.join(", ") : "belum ada";
    return m.reply(
      `「 ✦ LINKEDIN NOTIFIER ✦ 」\n\n` +
      `Status global: ${st.enabled ? "🟢 ON" : "🔴 OFF"} (.switch auto autolinkedin)\n` +
      `Token Apify: ${st.apifyToken ? "✅ ADA" : "❌ BELUM (env APIFY_TOKEN / apikeys.json apifyToken)"}\n` +
      `Keyword: ${st.keywords.join(", ") || "-"} (maks 3)\n` +
      `Lokasi: ${st.location}\n` +
      `Periode: ${PERIODE_LABEL[st.datePosted] || st.datePosted}\n` +
      `Easy Apply: ${st.easyApply ? "ON" : "OFF"}\n` +
      `Interval: tiap ${st.intervalMenit} menit (window 07:00–22:00 WIB)\n` +
      `Langganan: ${subs}\n` +
      `Cek terakhir: ${st.lastCheck ? new Date(st.lastCheck).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "belum pernah"}\n\n` +
      `Biaya Apify: $0.0004/job — default aman buat credit free $5/bln.`
    );
  }

  if (sub === "keyword" || sub === "keywords" || sub === "kw") {
    const act = String(args?.[1] || "").toLowerCase();
    const kw = args?.slice(2).join(" ").trim();
    if (act === "add" && kw) {
      await m.react("🕒");
      const r = addKeyword(kw);
      await m.react("🐣");
      if (!r.ok) return m.reply(raraError(pluginConfig.name, r.error));
      return m.reply(raraSuccess(pluginConfig.name, `keyword ditambah: *${kw}* — sekarang: ${r.keywords.join(", ")}`));
    }
    if ((act === "del" || act === "hapus") && kw) {
      const r = delKeyword(kw);
      return m.reply(raraSuccess(pluginConfig.name, `keyword dihapus — sekarang: ${r.keywords.join(", ") || "kosong"}`));
    }
    const st = getStatus();
    return m.reply(
      `「 ✦ KEYWORD LINKEDIN ✦ 」\n\n` +
      `Aktif: ${st.keywords.join(", ") || "-"} (maks 3 — tiap keyword = 1 run Apify/biaya)\n\n` +
      `.linkedinnotify keyword add <posisi>\n.linkedinnotify keyword del <posisi>\n\nContoh: developer, frontend, data analyst`
    );
  }

  if (sub === "lokasi" || sub === "location") {
    if (!val) return m.reply(raraError(pluginConfig.name, "tentukan lokasi — contoh: .linkedinnotify lokasi Jakarta"));
    const loc = setLocation(val);
    return m.reply(raraSuccess(pluginConfig.name, `lokasi lowongan sekarang: *${loc}*`));
  }

  if (sub === "periode") {
    if (!val) return m.reply(raraError(pluginConfig.name, "pilih: hari | minggu | bulan — contoh: .linkedinnotify periode hari"));
    const dp = setDatePosted(val);
    return m.reply(raraSuccess(pluginConfig.name, `periode lowongan: *${PERIODE_LABEL[dp] || dp}*`));
  }

  if (sub === "easyapply" || sub === "ea") {
    if (!val) return m.reply(raraError(pluginConfig.name, "pilih on/off — .linkedinnotify easyapply on"));
    const v = setEasyApply(val === "on" || val === "true");
    return m.reply(raraSuccess(pluginConfig.name, `filter Easy Apply: *${v ? "ON" : "OFF"}*`));
  }

  if (sub === "interval") {
    if (!val) return m.reply(raraError(pluginConfig.name, "set jeda cek 30–720 menit (jaga credit Apify) — .linkedinnotify interval 60"));
    const r = setIntervalMenit(val);
    if (!r) return m.reply(raraError(pluginConfig.name, "interval harus 30–720 menit"));
    return m.reply(raraSuccess(pluginConfig.name, `interval cek sekarang *tiap ${r} menit*`));
  }

  if (sub === "now") {
    await m.react("🕒");
    const r = await runCheck({ force: true, chatId: m.chat });
    await m.react("🐣");
    if (r.error) return m.reply(raraError(pluginConfig.name, `gagal ambil lowongan: ${r.error}`));
    if (!r.jobs) return m.reply(raraSuccess(pluginConfig.name, "belum ada lowongan baru buat keyword saat ini"));
    return m.reply(raraSuccess(pluginConfig.name, `${r.capped || r.jobs} lowongan dikirim (total baru terdeteksi: ${r.jobs})`));
  }

  return m.reply(raraGuide(
    pluginConfig.name,
    "notifikasi lowongan LinkedIn baru — card per-job metadata lengkap (perusahaan, lokasi, gaji, pelamar, deskripsi) via Apify",
    pluginConfig.example,
    "biaya Apify $0.0004/job — kredit free $5/bln; keyword maks 3"
  ));
}

export default { pluginConfig, handler };
