// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// bencanawatch.js — Langganan auto-alert bencana (opt-in, default OFF)
//   • Gempa Indonesia baru M >= 5.0 (BMKG)   — poll 60 dtk
//   • Gempa global baru M >= 6.0 (USGS)      — poll 5 mnt
//   • Bencana GDACS baru level SIAGA/AWAS    — poll 5 mnt
// Monitor lazy: timer cuma jalan kalau ada >= 1 subscriber.
//
// Scope langganan (request owner 2026-09-06):
//   • .disastersystemwatch on di DM → pilihan: chat ini / per grup target / GLOBAL (DM + semua grup)
//   • .disastersystemwatch on di dalam grup → aktif di grup itu (perilaku lama)
//   • Filter jenis/sumber/mode/lokasi/radius/jadwal yang di-set dari DM
//     otomatis diterapkan juga ke langganan global owner.

import {
  addWatcher, removeWatcher, getWatchersSafe, syncBencanaMonitor, watcherCount,
  setWatcherLocation, clearWatcherLocation, setWatcherRadius, haversineKm,
  setWatcherMode, addWatcherSchedule, removeWatcherSchedule, clearWatcherSchedules,
  setWatcherJenis, BENCANA_JENIS, setWatcherSumber, BENCANA_SUMBER,
  setWatcherKirim,
  addGlobalWatcher, removeGlobalWatcher, hasGlobalWatcher, globalWatcherKey,
  getMonitorHealth, sendActivationSample, getEwsProviderHealth, EWS_LEVELS,
  setWatcherEws, setWatcherProvider, getEwsHistory, EWS_MIN_MAG, setWatcherMinMag, DEFAULT_MIN_MAG, MIN_MAG_FLOOR, MIN_MAG_CEIL,
  setWatcherParam, ALERT_PARAM_JENIS, LEVEL_ORDER,
  getMagmaVolcanoes, MAGMA_LEVELS, sendRegionalAlert,
} from "../../src/lib/nova-bencana.js";
// ── GUARD FORMAT (request owner 2026-09-07): SEMUA pesan berkotak plugin
// ini WAJIB lewat boxLeft() dari src/lib/styler.js — kalimat input tetap
// ditulis utuh panjang di kode (gak usah dipendekkan manual), output
// dijamin ≤30 char/baris & tiap baris diawali "│ ", dikirim dalam code
// block supaya border rata. DILARANG nulis "│ " manual di file ini.
// Adapter di bawah nyanding API lama (novaBox/novaError/novaGuide) ke
// guard baru, jadi SEMUA call site otomatis lewat boxLeft.
import { boxMessage } from "../../src/lib/styler.js";

function toGuardedBox(header, lines = []) {
  const body = [];
  for (const l of lines) {
    if (l === "---" || l === "─") { body.push("────────────────"); continue; } // separator pendek ≤ width
    if (typeof l === "object" && l.sub) { body.push(`◆ ${String(l.sub).toUpperCase()} ◆`); continue; }
    if (!l || !String(l).trim()) continue; // baris kosong dibuang — guard gak butuh
    body.push(String(l));
  }
  // Judul dinormalkan pendek biar header gak kepanjangan
  const title = `◆ ${String(header).split("—")[0].trim().toUpperCase()} ◆`;
  return boxMessage(title, body.join("\n"));
}

const novaBox = (header, lines = []) => toGuardedBox(header, lines);
const novaError = (header, msg) => toGuardedBox(header, ["❌ " + (msg || "Terjadi error, coba lagi.")]);
const novaSuccess = (header, msg) => toGuardedBox(header, ["✅ " + (msg || "Berhasil.")]);
const novaGuide = (header, intro, example) =>
  toGuardedBox(header, [
    ...(intro ? [String(intro)] : []),
    ...(example ? [`Contoh: ${example}`] : []),
  ]);

const pluginConfig = {
  name: "disastersystemwatch",
  alias: ["disastersystemwatch"], // rename owner 15 Sep 2026 — alias lama dihapus (request "hapus aja nama lamanya")
  category: "bencana",
  description: "Langganan auto-alert bencana realtime — per chat, per grup target, atau global DM + semua grup",
  usage: ".disastersystemwatch <on/onchat/onglobal/offglobal/off/status/mode/jadwal/jenis/sumber/lokasi/radius/pilihgrup/gunung/test>",
  example: ".disastersystemwatch on",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const args = (m.args || []).map((a) => String(a).toLowerCase());
    // ── FIX OWNER 2026-09-07: toleransi salah ketik command umum ──
    // Report owner ngetik ".disastersystemwatch global" (maksudnya onglobal) dan
    // malah kena guide gak jelas. Alias ini bikin varian natural tetap
    // kena action yang benar tanpa perlu hafal nama exact.
    const ACTION_ALIAS = {
      global: "onglobal", matikanglobal: "offglobal", stopglobal: "offglobal",
      dm: "onchat", chat: "onchat", pribadi: "onchat",
      matikan: "off", stop: "off", nonaktif: "off", batal: "off",
      aktif: "on", aktifkan: "on", nyalakan: "on", cek: "status", check: "status",
      info: "status", help: "guide", bantuan: "guide",
      atur: "atur", pengaturan: "atur", setting: "atur", settings: "atur",
      param: "param", parameter: "param", minlevel: "minlevel", levelmin: "minlevel",
      history: "riwayat",
      gunung: "gunung", gunungapi: "gunung", volcano: "gunung", ga: "gunung",
      tes: "test", test: "test", uji: "test", ujicoba: "test",
    };
    const action = ACTION_ALIAS[args[0]] || args[0] || "";
    const chatId = m.chat;
    const isDm = !String(m.chat || "").endsWith("@g.us");

    // ── FIX BUG owner 2026-09-07: setter (mode/jenis/sumber/radius/jadwal/
    // kirim/lokasi) selalu nyari subs[chatId] duluan. Tapi ".disastersystemwatch
    // onglobal" nyimpen langganan di key BEDA ("global:<ownerJid>"), BUKAN
    // di chatId — walau di DM chatId kebetulan == ownerJid. Akibatnya user
    // yang CUMA punya langganan GLOBAL (belum pernah onchat) selalu kena
    // "Aktifkan dulu .disastersystemwatch on." walau onglobal-nya udah aktif.
    // Fix: kalau di DM dan belum ada langganan per-chat TAPI global-nya
    // aktif, semua setter di bawah diarahin langsung ke key global itu.
    // FIX 2026-09-08: langganan global dicek dari DM DAN GRUP — dulu cuma
    // dari DM, jadi owner global yang atur opsi dari grup selalu kena
    // "Aktifkan dulu" padahal udah aktif.
    const subsSnapshotForKey = await getWatchersSafe();
    const hasChatSub = !!subsSnapshotForKey[chatId];
    const globalRecForSender = hasGlobalWatcher(m.sender);
    const targetKey = (!hasChatSub && globalRecForSender) ? globalWatcherKey(m.sender) : chatId;

    // Terapkan setter yang sama ke langganan global owner (kalau ada & command dari DM,
    // dan targetKey BUKAN udah global itu sendiri — biar gak nulis dobel ke key yang sama).
    const mirrorGlobal = async (fn) => {
      if (!isDm || !globalRecForSender) return false;
      if (targetKey === globalWatcherKey(m.sender)) return false;
      try { await fn(globalWatcherKey(m.sender)); } catch (e) { console.error("[bencana] ❌ mirror pengaturan ke langganan global gagal:", e?.message || e); }
      return true;
    };

    // ── SEMUA PENGATURAN: teks kompak satu layar (request owner
    // 2026-09-08: jangan serba tombol, bikin bingung) ──
    if (action === "atur" || action === "pengaturan" || action === "setting") {
      const subs0 = await getWatchersSafe();
      const me0 = subs0[targetKey];
      const onLabel = !me0
        ? "BELUM AKTIF"
        : String(targetKey).startsWith("global:")
        ? "AKTIF (global: DM + semua grup)"
        : "AKTIF (chat ini)";
      const fJenis = Array.isArray(me0?.jenis) && me0.jenis.length ? me0.jenis.join(", ") : "semua";
      const fSumber = Array.isArray(me0?.sumber) && me0.sumber.length ? me0.sumber.join(", ").toUpperCase() : "semua";
      const fJadwal = Array.isArray(me0?.schedules) && me0.schedules.length ? me0.schedules.join(", ") : "belum ada";
      const text = novaBox("Bencana Watch — Atur", [
        `Status : ${onLabel}`,
        `Mode : ${(me0?.mode || "otomatis").toUpperCase()}`,
        `→ .disastersystemwatch mode darurat`,
        `Kirim : ${(me0?.kirim || "utama").toUpperCase()}`,
        `→ .disastersystemwatch kirim semua`,
        `Sumber : ${fSumber}`,
        `→ .disastersystemwatch sumber bmkg`,
        `Jenis : ${fJenis}`,
        `→ .disastersystemwatch jenis gempa`,
        `Lokasi : ${me0?.city || "belum di-set"}`,
        `→ .disastersystemwatch lokasi jakarta`,
        `Radius : ${me0?.radius || 300} km`,
        `→ .disastersystemwatch radius 500`,
        `MinMag : M ${me0?.minMag ?? DEFAULT_MIN_MAG}+`,
        `→ .disastersystemwatch minmag 3.5`,
        `Jadwal : ${fJadwal}`,
        `→ .disastersystemwatch jadwal add 07:00`,
        "---",
        "Lihat detail opsi: ketik tanpa nilai,",
        "contoh .disastersystemwatch kirim",
        "Status lengkap: .disastersystemwatch status",
      ]);
      return m.reply(text);
    }

    // ── set lokasi (buat peringatan wilayah) ──
    if (action === "lokasi" || action === "setlokasi" || action === "loc") {
      const place = (m.args || []).slice(1).join(" ").trim();
      if (!place) {
        return m.reply(novaBox("Bencana Watch", [
          "Set lokasi buat peringatan khusus wilayah.",
          "Bot kasih tahu kalau ada bencana baru DEKAT lokasi kamu.",
          "---",
          `Contoh : .disastersystemwatch lokasi Palu`,
          `Contoh : .disastersystemwatch lokasi Kota Malang, Jawa Timur`,
          `Hapus   : .disastersystemwatch lokasi hapus`,
        ]));
      }
      if (place.toLowerCase() === "hapus" || place.toLowerCase() === "delete") {
        clearWatcherLocation(targetKey);
        const alsoG = await mirrorGlobal((k) => clearWatcherLocation(k));
        await m.react("🐣");
        return m.reply(novaBox("Bencana Watch", [
          "Lokasi dihapus. Peringatan wilayah mati, alert umum tetap jalan.",
          ...(alsoG ? ["Lokasi langganan global ikut dihapus."] : []),
        ]));
      }
      try {
        const rec = await setWatcherLocation(targetKey, place);
        const alsoG = await mirrorGlobal((k) => setWatcherLocation(k, place));
        await m.react("🐣");
        return m.reply(novaBox("Bencana Watch", [
          `Lokasi tersimpan.`,
          `Kota    : ${rec.city}`,
          `Detail  : ${rec.detail || "-"}`,
          `Koordinat : ${rec.lat.toFixed(3)}, ${rec.lon.toFixed(3)}`,
          "---",
          "ALERT GEMPA DEKAT LOKASI aktif:",
          "gempa terdeteksi BMKG dalam radius kamu",
          "langsung muncul sebagai peringatan",
          "wilayah — termasuk gempa kecil di bawah",
          "M 5.0 (yang gak masuk alert umum).",
          "---",
          `Radius sekarang ${rec.radius || 300} km — makin gede radius,`,
          "makin luas wilayah yang dianggap dekat.",
          `Atur: .disastersystemwatch radius 500`,
          ...(alsoG ? ["Lokasi diterapkan juga ke langganan global."] : []),
        ]));
      } catch (e) {
        await m.react("❌");
        return m.reply(novaError("Bencana Watch", e.message));
      }
    }

    // ── set radius monitoring ──
    if (action === "radius" || action === "jarak") {
      const rawKm0 = (m.args || [])[1];
      if (!rawKm0) {
        const subs0 = await getWatchersSafe();
        const me0 = subs0[targetKey];
        return m.reply(novaBox("Bencana Watch — Radius", [
          me0?.city
            ? `Radius aktif : ${me0.radius || 300} km dari ${me0.city}`
            : "Lokasi belum di-set.",
          "---",
          "Radius = jarak maksimum gempa/bencana",
          "dari lokasi kamu yang dihitung 'dekat' —",
          "gempa dekat langsung muncul sebagai",
          "peringatan wilayah. Radius gede =",
          "kejadian di lokasi lain yang masuk",
          "radius juga kehitung dekat.",
          "---",
          me0?.city ? "Contoh : .disastersystemwatch radius 500" : "Set lokasi dulu: .disastersystemwatch lokasi Palu",
          "Rentang : 50 - 20000 km (default 300)",
          "Radius dunia : .disastersystemwatch radius dunia",
        ]));
      }
      try {
        const rawKm = (m.args || [])[1];
        const rec = setWatcherRadius(targetKey, rawKm);
        const alsoG = await mirrorGlobal((k) => setWatcherRadius(k, rawKm));
        await m.react("🐣");
        const radiusLabel = rec.radius >= 20000 ? "SELURUH DUNIA (radius maksimum)" : `${rec.radius} km`;
        return m.reply(novaBox("Bencana Watch", [
          `Radius monitoring: ${radiusLabel} dari ${rec.city || "lokasi kamu"}.`,
          "Gempa dekat lokasi (termasuk < M 5.0) dalam",
          `radius ini langsung dinotifkin. ${rec.radius} km =`,
          "kejadian sejauh itu dari kota kamu tetap kehitung dekat.",
          "Bencana baru dalam radius ini → peringatan wilayah.",
          ...(alsoG ? ["Radius langganan global ikut diubah."] : []),
        ]));
      } catch (e) {
        await m.react("❌");
        return m.reply(novaError("Bencana Watch", e.message || "Radius harus 50-20000 km. Contoh: .disastersystemwatch radius 500 / radius dunia"));
      }

    // ── set ambang magnitudo minimum alert gempa (owner 15 Sep 2026:
    // "default minimal alertnya di sekitar minimal 3.5mg klo 5.0mg
    // jarang soalnya digempa") — default 3.5 SR ──
    if (action === "minmag" || action === "minmagtitude" || action === "ambang") {
      const rawM = (m.args || [])[1];
      if (!rawM) {
        const subsM = await getWatchersSafe();
        const meM = subsM[targetKey];
        return m.reply(novaBox("Bencana Watch — Min Mag", [
          `Ambang aktif : M ${meM?.minMag ?? DEFAULT_MIN_MAG}+`,
          meM?.minMag != null ? "(custom — reset: .disastersystemwatch minmag reset)" : "(default bawaan)",
          "---",
          "Gempa DI BAWAH ambang ini gak",
          "dikirim (near-quake & EWS).",
          "Gempa besar global M6.5+ tetap",
          "dikirim — pengaman darurat.",
          "---",
          `Default : M ${DEFAULT_MIN_MAG}+`,
          `Rentang : M ${MIN_MAG_FLOOR} - M ${MIN_MAG_CEIL}`,
          "Contoh : .disastersystemwatch minmag 3.0",
          "Reset  : .disastersystemwatch minmag reset",
        ]));
      }
      try {
        const rec = setWatcherMinMag(targetKey, rawM);
        const alsoG = await mirrorGlobal((k) => setWatcherMinMag(k, rawM));
        await m.react("🐣");
        const isReset = /^(reset|default|bawaan)$/i.test(String(rawM));
        return m.reply(novaBox("Bencana Watch", [
          isReset
            ? `Ambang dikembalikan ke default M ${DEFAULT_MIN_MAG}+.`
            : `Ambang minimum alert gempa: M ${rec.minMag ?? DEFAULT_MIN_MAG}+.`,
          `Gempa M ${rec.minMag ?? DEFAULT_MIN_MAG} ke bawah gak dikirim.`,
          "Gempa dekat & EWS dua-duanya ikut aturan ini.",
          "Gempa besar global M6.5+ tetap dikirim.",
          ...(alsoG ? ["Ambang langganan global ikut diubah."] : []),
        ]));
      } catch (e) {
        await m.react("❌");
        return m.reply(novaError("Bencana Watch", e.message || `Magnitudo minimum M ${MIN_MAG_FLOOR}-${MIN_MAG_CEIL}. Contoh: .disastersystemwatch minmag 3.5`));
      }

    // ── PARAMETER ALERT PER JENIS BENCANA (owner 15 Sep 2026: "dibencana
    // lain jg bsa ada opsi set manual parameter alert cntoh bencana banjir,
    // atau yg lain trgantung kesediaan dibencana masing") ──
    if (action === "param" || action === "parameter") {
      const [, jenisRaw, keyRaw, ...valRest] = m.args || [];
      const valRaw = valRest.join(" ") || undefined;
      const subsP = await getWatchersSafe();
      const meP = subsP[targetKey];
      const curParams = meP?.params || {};

      const fmtJenis = (j) => {
        const pr = curParams[j.key] || {};
        const bits = [];
        if (j.key === "gempa") bits.push(`minmag M ${(meP?.minMag ?? DEFAULT_MIN_MAG)}+`);
        if (pr.minlevel) bits.push(`minlevel ${pr.minlevel}`); else bits.push("minlevel HIJAU");
        if (pr.radiusKm) bits.push(`jarak ${pr.radiusKm} km`);
        return `${j.label}: ${bits.join(" | ")}`;
      };

      if (!jenisRaw) {
        return m.reply(novaBox("Bencana Watch — Param", [
          "Set parameter alert per jenis bencana.",
          "---",
          ...ALERT_PARAM_JENIS.map(fmtJenis),
          "---",
          "Set : .disastersystemwatch param <jenis> <param> <nilai>",
          "Contoh: .disastersystemwatch param banjir minlevel kuning",
          "       .disastersystemwatch param topan jarak 800",
          "       .disastersystemwatch param gempa minmag 3.0",
          "Detail per jenis: .disastersystemwatch param banjir",
          "Reset: .disastersystemwatch param banjir reset",
        ]));
      }
      if (jenisRaw && !keyRaw) {
        const j = ALERT_PARAM_JENIS.find((x) => x.key === String(jenisRaw).toLowerCase().replace(/\s+/g, "").replace("-", "") || x.label.toLowerCase().startsWith(String(jenisRaw).toLowerCase()));
        if (!j) return m.reply(novaError("Bencana Watch", `Jenis gak dikenal. Pilihan: ${ALERT_PARAM_JENIS.map((x) => x.label).join(", ")}`));
        const pr = curParams[j.key] || {};
        return m.reply(novaBox(`Bencana Watch — ${j.label}`, [
          "Parameter yang tersedia untuk jenis ini:",
          ...(j.params.includes("minmag") ? [
            `minmag : M ${(j.key === "gempa" ? (meP?.minMag ?? DEFAULT_MIN_MAG) : "-")}+ (default ${DEFAULT_MIN_MAG})`,
            "  set: .disastersystemwatch param gempa minmag 3.0",
          ] : []),
          ...(j.params.includes("minlevel") ? [
            `minlevel : ${pr.minlevel || "HIJAU (semua alert)"}`,
            `  set: .disastersystemwatch param ${j.key} minlevel kuning`,
            "  pilihan: HIJAU (semua) / KUNING (skip info) / MERAH (darurat saja)",
          ] : []),
          ...(j.params.includes("jarak") ? [
            `jarak : ${pr.radiusKm ? pr.radiusKm + " km" : "ikut radius utama (" + (meP?.radius || 300) + " km)"}`,
            `  set: .disastersystemwatch param ${j.key} jarak 500`,
            "  rentang 50-20000 km, dunia = semua",
          ] : []),
          "---",
          "Gempa besar global M6.5+ & alert darurat tetap",
          "dikirim apa pun pengaturannya.",
          "Reset: .disastersystemwatch param " + j.key + " reset",
        ]));
      }
      try {
        const rec = setWatcherParam(targetKey, jenisRaw, keyRaw, valRaw);
        const alsoG = await mirrorGlobal((k) => setWatcherParam(k, jenisRaw, keyRaw, valRaw));
        await m.react("🐣");
        const prNow = (rec?.params || {})[String(jenisRaw).toLowerCase()] || {};
        const shown = Object.keys(prNow).length ? Object.entries(prNow).map(([k2, v2]) => `${k2}=${v2}`).join(" | ") : "default";
        return m.reply(novaBox("Bencana Watch", [
          `Parameter ${jenisRaw} diperbarui: ${shown}.`,
          ...(alsoG ? ["Pengaturan langganan global ikut diubah."] : []),
          "---",
          "Detail: .disastersystemwatch param " + jenisRaw,
        ]));
      } catch (e) {
        await m.react("❌");
        return m.reply(novaError("Bencana Watch", e.message));
      }
    }

    // ── shortcut minlevel ──
    if (action === "minlevel") {
      const [, jenisRaw, lvlRaw] = m.args || [];
      if (!jenisRaw || !lvlRaw) {
        return m.reply(novaBox("Bencana Watch — Min Level", [
          "Atur level minimum alert per jenis bencana.",
          "---",
          "HIJAU  : semua alert (default)",
          "KUNING : skip info hijau",
          "MERAH  : darurat saja",
          "---",
          "Contoh: .disastersystemwatch minlevel banjir kuning",
          "       .disastersystemwatch minlevel topan merah",
          "Reset : .disastersystemwatch minlevel banjir reset",
          "Semua jenis: .disastersystemwatch param",
        ]));
      }
      try {
        const rec = setWatcherParam(targetKey, jenisRaw, "minlevel", lvlRaw);
        const alsoG = await mirrorGlobal((k) => setWatcherParam(k, jenisRaw, "minlevel", lvlRaw));
        await m.react("🐣");
        const isReset = /^(reset|default|bawaan)$/i.test(String(lvlRaw ?? ""));
        return m.reply(novaBox("Bencana Watch", [
          isReset ? `Level minimum ${jenisRaw} kembali default (HIJAU).` : `Level minimum alert ${jenisRaw}: ${rec?.params?.[String(jenisRaw).toLowerCase()]?.minlevel || lvlRaw.toUpperCase()}.`,
          "Alert di bawah level itu gak dikirim.",
          ...(alsoG ? ["Langganan global ikut diubah."] : []),
        ]));
      } catch (e) {
        await m.react("❌");
        return m.reply(novaError("Bencana Watch", e.message));
      }
    }

    }

    }

    // ── kepadatan alert: utama (1 info per pembaruan) / semua (cooldown) ──
    if (action === "kirim" || action === "kepadatan") {
      const v = (m.args || [])[1]?.toLowerCase();
      if (!v) {
        const subs0 = await getWatchersSafe();
        const cur = subs0[targetKey]?.kirim || "utama";
        const text = novaBox("Bencana Watch — Kirim", [
          `Kirim aktif : ${cur.toUpperCase()}`,
          "---",
          "• UTAMA — tiap pembaruan cuma 1 info",
          "  TERPENTING. Anti-spam (default).",
          "• SEMUA — semua info dikirim, tapi",
          "  ada jeda 10 menit biar gak banjir.",
          "---",
          "Ketik manual: .disastersystemwatch kirim utama",
        ]);
        return m.reply(text);
      }
      try {
        const rec = setWatcherKirim(targetKey, v);
        const alsoG = await mirrorGlobal((k) => setWatcherKirim(k, v));
        await m.react("🐣");
        return m.reply(novaBox("Bencana Watch", [
          `Mode kirim: ${rec.kirim.toUpperCase()}`,
          ...(alsoG ? ["Mode kirim langganan global ikut diubah."] : []),
          "---",
          rec.kirim === "utama"
            ? "Tiap pembaruan pusat cukup 1 info terpenting saja — tanpa spam."
            : "Semua info dikirim dengan jeda 10 menit per chat — tetap rapi.",
        ]));
      } catch (e) {
        await m.react("❌");
        return m.reply(novaError("Bencana Watch", e.message));
      }
    }

    // ── filter jenis bencana ──
    if (action === "jenis" || action === "filter") {
      const rest = (m.args || []).slice(1).join(" ").trim().toLowerCase();
      if (!rest) {
        const subs0 = await getWatchersSafe();
        const cur = subs0[targetKey]?.jenis;
        const text = novaBox("Bencana Watch — Jenis", [
          `Jenis aktif : ${Array.isArray(cur) && cur.length ? cur.join(", ") : "semua jenis"}`,
          "---",
          "Pilihan : " + BENCANA_JENIS.join(", "),
          "---",
          "Ketik manual: .disastersystemwatch jenis gempa",
        ]);
        return m.reply(text);
      }
      try {
        if (rest === "semua" || rest === "all" || rest === "reset") {
          setWatcherJenis(targetKey, []);
          const alsoG = await mirrorGlobal((k) => setWatcherJenis(k, []));
          await m.react("🐣");
          return m.reply(novaBox("Bencana Watch", [
            "Filter jenis direset — semua jenis bencana dikirim lagi.",
            ...(alsoG ? ["Filter langganan global ikut direset."] : []),
          ]));
        }
        const alias = {
          gempa: "gempa", earthquake: "gempa", eq: "gempa",
          banjir: "banjir", flood: "banjir",
          topan: "topan", badai: "topan", cyclone: "topan",
          gunungapi: "gunungapi", gunung: "gunungapi", volcano: "gunungapi",
          kebakaran: "kebakaran", karhutla: "kebakaran", fire: "kebakaran",
          kering: "kering", kekeringan: "kering", drought: "kering",
          tsunami: "tsunami",
        };
        const kinds = rest.split(/[\s,]+/).map((k) => alias[k]).filter(Boolean);
        const invalid = rest.split(/[\s,]+/).filter((k) => !alias[k]);
        if (invalid.length) throw new Error(`Jenis tidak dikenal: ${invalid.join(", ")}. Pilihan: ${BENCANA_JENIS.join(", ")}`);
        setWatcherJenis(targetKey, kinds);
        const alsoG = await mirrorGlobal((k) => setWatcherJenis(k, kinds));
        await m.react("🐣");
        return m.reply(novaBox("Bencana Watch", [
          `Filter jenis aktif: ${kinds.join(", ")}`,
          "---",
          "Hanya jenis di atas yang dikirim (semua mode).",
          "Reset: .disastersystemwatch jenis semua",
          ...(alsoG ? ["Filter diterapkan juga ke langganan global."] : []),
        ]));
      } catch (e) {
        await m.react("❌");
        return m.reply(novaError("Bencana Watch", e.message));
      }
    }

    // ── filter sumber (bmkg / usgs / gdacs) ──
    if (action === "sumber" || action === "source") {
      const rest = (m.args || []).slice(1).join(" ").trim().toLowerCase();
      if (!rest) {
        const subs0 = await getWatchersSafe();
        const cur = subs0[targetKey]?.sumber;
        const text = novaBox("Bencana Watch — Sumber", [
          `Sumber aktif : ${Array.isArray(cur) && cur.length ? cur.join(", ").toUpperCase() : "semua"}`,
          "---",
          "• BMKG — gempa Indonesia M 5.0+",
          "• USGS — gempa global signifikan (M 5.0+ alert / M 6.0+)",
          "• GDACS — bencana dunia SIAGA/AWAS",
          "• PVMBG — status gunung api Indonesia (level naik/turun)",
          "---",
          "Ketik manual: .disastersystemwatch sumber bmkg",
        ]);
        return m.reply(text);
      }
      try {
        if (rest === "semua" || rest === "all" || rest === "reset") {
          setWatcherSumber(targetKey, []);
          const alsoG = await mirrorGlobal((k) => setWatcherSumber(k, []));
          await m.react("🐣");
          return m.reply(novaBox("Bencana Watch", [
            "Filter sumber direset — semua sumber dikirim lagi.",
            ...(alsoG ? ["Filter langganan global ikut direset."] : []),
          ]));
        }
        const sources = [...new Set(rest.split(/[\s,]+/).filter(Boolean))];
        const bad = sources.filter((k) => !BENCANA_SUMBER.includes(k));
        if (bad.length) throw new Error(`Sumber tidak dikenal: ${bad.join(", ")}. Pilihan: ${BENCANA_SUMBER.join(", ")} (atau 'semua')`);
        setWatcherSumber(targetKey, sources);
        const alsoG = await mirrorGlobal((k) => setWatcherSumber(k, sources));
        await m.react("🐣");
        return m.reply(novaBox("Bencana Watch", [
          `Filter sumber aktif: ${sources.join(", ").toUpperCase()}`,
          "---",
          "Hanya alert dari sumber di atas yang dikirim",
          "(semua mode, realtime & rangkuman).",
          "Reset: .disastersystemwatch sumber semua",
          ...(alsoG ? ["Filter diterapkan juga ke langganan global."] : []),
        ]));
      } catch (e) {
        await m.react("❌");
        return m.reply(novaError("Bencana Watch", e.message));
      }
    }

    // ── status gunung api PVMBG (request owner 10 Sep 2026) ──
    if (action === "gunung") {
      const q = (m.args || []).slice(1).join(" ").trim();
      try {
        const page = await getMagmaVolcanoes();
        if (!q) {
          const awas = page.list.filter((v) => v.levelNum === 4);
          const siaga = page.list.filter((v) => v.levelNum === 3);
          const waspada = page.list.filter((v) => v.levelNum === 2);
          const normalCount = page.ringkas["Level I (Normal)"] ?? page.list.filter((v) => v.levelNum === 1).length;
          const lines = [];
          if (awas.length) {
            lines.push(MAGMA_LEVELS[4].icon + " " + MAGMA_LEVELS[4].romawi + " — AWAS (" + awas.length + "):");
            for (const v of awas) lines.push("  • " + v.nama + " — " + v.prov);
            lines.push("---");
          }
          if (siaga.length) {
            lines.push(MAGMA_LEVELS[3].icon + " " + MAGMA_LEVELS[3].romawi + " — SIAGA (" + siaga.length + "):");
            for (const v of siaga) lines.push("  • " + v.nama + " — " + v.prov);
            lines.push("---");
          }
          lines.push(MAGMA_LEVELS[2].icon + " " + MAGMA_LEVELS[2].romawi + " — Waspada : " + waspada.length + " gunung api");
          lines.push(MAGMA_LEVELS[1].icon + " " + MAGMA_LEVELS[1].romawi + " — Normal : " + normalCount + " gunung api");
          lines.push("---");
          lines.push("Detail per gunung: .disastersystemwatch gunung merapi");
          lines.push("Notif otomatis perubahan status: aktifin jenis gunungapi (.disastersystemwatch jenis gunungapi)");
          lines.push("Sumber: magma.esdm.go.id (PVMBG)");
          await m.react("\u{1F42A}");
          return m.reply(novaBox("Status Gunung Api — PVMBG", lines));
        }
        const needle = q.toLowerCase();
        const v = page.list.find((x) => x.nama.toLowerCase() === needle)
          || page.list.find((x) => x.nama.toLowerCase().includes(needle));
        if (!v) {
          await m.react("\u274C");
          return m.reply(novaError("Bencana Watch", 'Gunung api "' + q + '" gak ketemu di daftar PVMBG. Ketik .disastersystemwatch gunung buat lihat daftar.'));
        }
        const lv = MAGMA_LEVELS[v.levelNum] || MAGMA_LEVELS[1];
        await m.react("\u{1F42A}");
        return m.reply(novaBox("Gunung Api — " + v.nama, [
          "Status : " + lv.icon + " " + lv.romawi + " (" + lv.label + ")",
          "Wilayah : " + v.prov,
          "---",
          "Laporan resmi PVMBG:",
          v.laporanUrl,
          "---",
          "Notif otomatis kenaikan/penurunan status",
          "dikirim ke langganan yang aktifin jenis gunungapi.",
        ]));
      } catch (e) {
        await m.react("\u274C");
        return m.reply(novaError("Bencana Watch", e.message));
      }
    }

    // ── TOMBOL TES (syarat owner 15 Sep 2026 #5): paksa kirim 1 notifikasi
    // tes ke chat ini — TANPA syarat langganan/lokasi/scheduler. Ini bukti
    // jalur pengiriman WhatsApp hidup, terlepas dari monitor jalan/gak.
    if (action === "test") {
      const subs = await getWatchersSafe();
      let sub = subs[chatId];
      let pakaiLokasiTes = false;
      if (!sub || sub.lat == null) {
        // belum langganan / belum set lokasi → pakai lokasi tes Jakarta
        sub = { city: "Jakarta (lokasi tes)", lat: -6.2088, lon: 106.8456, mode: "otomatis", radius: 300 };
        pakaiLokasiTes = true;
      }
      const ev = {
        kind: "gempa", jenis: "Gempa Bumi", mag: "4.2", depth: "10 km",
        level: "WASPADA", waktu: "SEKARANG (SIMULASI)",
        lat: +(sub.lat + 0.35).toFixed(4), lon: +(sub.lon + 0.35).toFixed(4),
        desc: "UJI COBA JALUR KIRIM — gempa simulasi (bukan kejadian nyata)",
        potensi: "SIMULASI", dirasakan: "SIMULASI", sumber: "TES INTERNAL — bukan BMKG",
      };
      try {
        await sendRegionalAlert(sock, chatId, ev, sub, { test: true });
        await m.react("\u{1F42A}");
        return m.reply(novaBox("Bencana Watch", [
          "Alert SIMULASI dikirim ke chat ini —",
          "cek pesan PERINGATAN di atas.",
          "---",
          "Ini bukti jalur pengiriman hidup,",
          "terlepas dari scheduler. Alert bencana",
          "asli otomatis masuk kalau langganan",
          "aktif (.disastersystemwatch on).",
          ...(pakaiLokasiTes
            ? ["---", "Tes ini pakai lokasi tes Jakarta —", "set lokasi asli: .disastersystemwatch lokasi <kota>"]
            : []),
        ]));
      } catch (e) {
        await m.react("\u274C");
        console.error("[bencana] ❌ .disastersystemwatch test gagal kirim:", e?.message || e);
        return m.reply(novaError("Bencana Watch", "Gagal kirim alert simulasi: " + e.message));
      }
    }

    // ── mode pengiriman: otomatis / jadwal / darurat ──
    if (action === "mode") {
      const mode = (m.args || [])[1]?.toLowerCase();
      if (!mode) {
        const subs0 = await getWatchersSafe();
        const cur = (subs0[targetKey]?.mode || "otomatis").toUpperCase();
        const text = novaBox("Bencana Watch — Mode", [
          `Mode aktif : ${cur}`,
          "---",
          "• OTOMATIS — semua bencana baru langsung",
          "  dikirim (paling gampang, default)",
          "• JADWAL — dikumpulkan, dikirim rangkuman",
          "  di jam yang kamu pilih",
          "• DARURAT — cuma bencana dekat lokasi",
          "  kamu atau bencana besar",
          "---",
          "Ketik manual: .disastersystemwatch mode jadwal",
        ]);
        return m.reply(text);
      }
      try {
        const rec = setWatcherMode(targetKey, mode);
        const alsoG = await mirrorGlobal((k) => setWatcherMode(k, mode));
        await m.react("🐣");
        const expl = {
          otomatis: "Semua bencana baru dikirim langsung. Dekat lokasi → peringatan wilayah, jauh → alert umum.",
          jadwal: "Bencana baru dikumpulkan & dikirim sebagai rangkuman di jam yang di-set. Set jam: .disastersystemwatch jadwal add 07:00. Bencana DARURAT besar tetap langsung dikirim realtime, gak nunggu rangkuman.",
          darurat: "Hanya bencana paling penting yang dikirim: dekat lokasi kamu (radius) atau bencana besar. Set lokasi dulu biar maksimal: .disastersystemwatch lokasi <kota>",
        };
        return m.reply(novaBox("Bencana Watch", [
          `Mode: ${rec.mode}`,
          ...(alsoG ? ["Mode langganan global ikut diubah."] : []),
          "---",
          expl[rec.mode],
        ]));
      } catch (e) {
        await m.react("❌");
        return m.reply(novaError("Bencana Watch", e.message));
      }
    }

    // ── jadwal rangkuman (mode jadwal) ──
    if (action === "jadwal" || action === "schedule") {
      const sub = (m.args || [])[1]?.toLowerCase() || "list";
      try {
        if (sub === "add" || sub === "tambah") {
          const hhmm = (m.args || [])[2];
          const rec = addWatcherSchedule(targetKey, hhmm);
          const alsoG = await mirrorGlobal((k) => addWatcherSchedule(k, hhmm));
          await m.react("🐣");
          return m.reply(novaBox("Bencana Watch", [
            `Jadwal ${rec.schedules.at(-1)} ditambah (mode jadwal aktif).`,
            `Total ${rec.schedules.length} jadwal: ${rec.schedules.join(", ")}`,
            "---",
            "Rangkuman bencana dikirim di jam-jam tersebut.",
            "Bisa tambah bebas: .disastersystemwatch jadwal add 13:00",
            ...(alsoG ? ["Jadwal langganan global ikut ditambah."] : []),
          ]));
        }
        if (sub === "remove" || sub === "hapus" || sub === "del") {
          const hhmm = (m.args || [])[2];
          const rec = removeWatcherSchedule(targetKey, hhmm);
          const alsoG = await mirrorGlobal((k) => removeWatcherSchedule(k, hhmm));
          await m.react("🐣");
          return m.reply(novaBox("Bencana Watch", [
            `Jadwal dihapus. Sisa: ${rec.schedules.length ? rec.schedules.join(", ") : "kosong"}`,
            ...(alsoG ? ["Jadwal langganan global ikut dihapus."] : []),
          ]));
        }
        if (sub === "clear" || sub === "reset") {
          clearWatcherSchedules(targetKey);
          const alsoG = await mirrorGlobal((k) => clearWatcherSchedules(k));
          await m.react("🐣");
          return m.reply(novaBox("Bencana Watch", [
            "Semua jadwal rangkuman dihapus.",
            ...(alsoG ? ["Jadwal langganan global ikut dihapus."] : []),
          ]));
        }
        // list / default
        const subs = await getWatchersSafe();
        const me = subs[targetKey];
        const scheds = Array.isArray(me?.schedules) ? me.schedules : [];
        const text = novaBox("Bencana Watch — Jadwal", [
          `Jadwal : ${scheds.length ? scheds.join(", ") : "belum ada"}`,
          `Mode   : ${me?.mode || "otomatis"}`,
          "---",
          "Rangkuman bencana dikirim di jam-jam ini",
          "(khusus mode JADWAL). Bencana besar tetap",
          "langsung dikirim realtime.",
          "---",
          "Manual : .disastersystemwatch jadwal add 07:00",
        ]);
        return m.reply(text);
      } catch (e) {
        await m.react("❌");
        return m.reply(novaError("Bencana Watch", e.message));
      }
    }

    // ── aktifkan di chat ini saja (perilaku lama, bebas DM/grup) ──
    if (action === "onchat") {
      await addWatcher(chatId);
      syncBencanaMonitor(sock);
      await m.react("🐣");
      await m.reply(novaBox("Bencana Watch", [
        "Auto-alert bencana aktif di chat ini.",
        "---",
        "• Gempa Indonesia baru M 5.0+ (BMKG)",
        "• Gempa global baru signifikan (USGS)",
        "• Bencana GDACS level SIAGA / AWAS",
        "---",
        "Sebentar lagi menyusul 1 contoh info",
        "TERKINI sebagai tanda fitur aktif.",
        "---",
        "MAU INDONESIA SAJA? Pilih sumbernya:",
        "• .disastersystemwatch sumber bmkg",
        "---",
        "Matikan dengan .disastersystemwatch off",
      ]));
      await sendActivationSample(sock, chatId); // bukti + preview format alert
      return { handled: true };
    }

    // ── scope global: DM owner + semua grup ──
    if (action === "onglobal") {
      await addGlobalWatcher(m.sender);
      syncBencanaMonitor(sock);
      await m.react("🐣");
      await m.reply(novaBox("Bencana Watch", [
        "Mode GLOBAL aktif — DM + semua grup.",
        "---",
        "Alert bencana realtime dikirim ke:",
        "• chat pribadi kamu (DM)",
        "• semua grup yang bot masuk",
        "---",
        "Sebentar lagi menyusul 1 contoh info",
        "TERKINI sebagai tanda fitur aktif.",
        "---",
        "Filter jenis / sumber / mode / lokasi / jadwal yang",
        "di-set dari DM berlaku juga ke langganan global.",
        "Matikan: .disastersystemwatch offglobal",
      ]));
      await sendActivationSample(sock, m.chat); // bukti + preview format alert
      return { handled: true };
    }

    if (action === "offglobal") {
      removeGlobalWatcher(m.sender);
      syncBencanaMonitor(sock);
      await m.react("🐣");
      return m.reply(novaBox("Bencana Watch", [
        "Langganan global dimatikan.",
        "Langganan per chat/grup yang lain tetap jalan.",
      ]));
    }

    // ── popup pilih grup target (dari DM) ──
    if (action === "pilihgrup" || action === "pilihgroup") {
      let groups = {};
      try { groups = (await sock.groupFetchAllParticipating()) || {}; } catch (e) { console.error("[bencana] ❌ Gagal ambil daftar grup (pilihgrup):", e?.message || e); }
      const list = Object.values(groups)
        .map((g) => ({ jid: g.id, subject: (g.subject || g.id || "").trim(), count: (g.participants || []).length }))
        .sort((a, b) => a.subject.localeCompare(b.subject));
      if (!list.length) {
        return m.reply(novaBox("Bencana Watch", [
          "Bot belum berada di grup mana pun,",
          "jadi belum ada target yang bisa dipilih.",
        ]));
      }
      const rowsOn = list.slice(0, 50).map((g) => ({
        title: g.subject.slice(0, 25),
        description: `${g.count} member — ON alert bencana di grup ini`,
        id: `.disastersystemwatch grup ${g.jid} on`,
      }));
      const rowsOff = list.slice(0, 50).map((g) => ({
        title: g.subject.slice(0, 25),
        description: `${g.count} member — OFF alert bencana di grup ini`,
        id: `.disastersystemwatch grup ${g.jid} off`,
      }));
      const text = novaBox("Bencana Watch", [
        `Fitur  : auto-alert bencana`,
        `Mode   : per grup target`,
        "---",
        `Total grup terdeteksi : ${list.length}`,
        "",
        "Pilih grup dari daftar popup untuk",
        "mengaktifkan atau menonaktifkan alert.",
      ]);
      try {
        await sock.sendButton(m.chat, null, text, m, {
          buttons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "Pilih Grup",
                sections: [
                  { title: "Aktifkan (On)", rows: rowsOn },
                  { title: "Matikan (Off)", rows: rowsOff },
                ],
              }),
            },
          ],
        });
      } catch {
        await m.reply(text + `\n\nKetik .disastersystemwatch grup <id grup> on`);
      }
      return { handled: true };
    }

    // ── set on/off per grup target (dari popup / manual) ──
    if (action === "grup" || action === "group") {
      const target = String(args[1] || "");
      if (!target.endsWith("@g.us")) {
        return m.reply(novaError("Bencana Watch", `ID grup tidak valid. Gunakan .disastersystemwatch pilihgrup`));
      }
      const onoff = args[2] === "off" ? "off" : "on";
      if (onoff === "on") await addWatcher(target);
      else await removeWatcher(target);
      syncBencanaMonitor(sock);
      let subject = target;
      try { subject = (await sock.groupMetadata(target))?.subject || target; } catch {}
      await m.react("🐣");
      await m.reply(novaBox("Bencana Watch", [
        `Auto-alert bencana: ${onoff.toUpperCase()} di grup target.`,
        `Grup : ${subject}`,
        onoff === "on"
          ? "Alert bencana otomatis muncul di grup tersebut."
          : "Alert dihentikan di grup tersebut.",
      ]));
      if (onoff === "on") await sendActivationSample(sock, target); // bukti ke grup target
      return { handled: true };
    }

    if (action === "on") {
      // di dalam grup: langsung aktif di grup ini (perilaku lama)
      if (!isDm) {
        await addWatcher(chatId);
        syncBencanaMonitor(sock);
        await m.react("🐣");
        await m.reply(novaBox("Bencana Watch", [
          "Auto-alert bencana aktif di grup ini.",
          "---",
          "• Gempa Indonesia baru M 5.0+ (BMKG)",
          "• Gempa global baru signifikan (USGS)",
          "• Bencana GDACS level SIAGA / AWAS",
          "---",
          "Sebentar lagi menyusul 1 contoh info",
          "TERKINI sebagai tanda fitur aktif.",
          "---",
          "MAU INDONESIA SAJA? Pilih sumbernya:",
          "• .disastersystemwatch sumber bmkg",
          "• .disastersystemwatch sumber bmkg, gdacs",
          "---",
          "Tips: set lokasi biar dapat peringatan khusus",
          "wilayah: .disastersystemwatch lokasi <nama kota>",
          "Matikan dengan .disastersystemwatch off",
        ]));
        await sendActivationSample(sock, chatId); // bukti + preview format alert
        return { handled: true };
      }
      // di DM: pilih scope — teks kompak (tanpa tombol)
      const g = hasGlobalWatcher(m.sender);
      const subs = await getWatchersSafe();
      const dmActive = !!subs[chatId];
      const text = novaBox("Bencana Watch", [
        `Fitur : auto-alert bencana realtime`,
        `Lokasi : chat pribadi`,
        `DM ini : ${dmActive ? "AKTIF" : "OFF"}`,
        `Global : ${g ? "AKTIF (DM + semua grup)" : "OFF"}`,
        "---",
        "Pilih target pengiriman alert:",
        "1. chat ini → .disastersystemwatch onchat",
        "2. grup pilihan → .disastersystemwatch pilihgrup",
        "3. DM + semua grup → .disastersystemwatch onglobal",
        "---",
        "Filter yang di-set dari DM berlaku juga",
        "ke langganan global.",
      ]);
      await m.reply(text);
      return { handled: true };
    }

    if (action === "off") {
      await removeWatcher(chatId);
      syncBencanaMonitor(sock);
      await m.react("🐣");
      const lines = ["Auto-alert bencana dimatikan di chat ini."];
      if (isDm && hasGlobalWatcher(m.sender)) {
        lines.push("---", "Langganan GLOBAL masih aktif (DM + semua grup).", "Matikan dengan .disastersystemwatch offglobal");
      }
      return m.reply(novaBox("Bencana Watch", lines));
    }

    // ── EWS: PERINGATAN DINI GEMPA (pengaman darurat — request owner 8 Sep 2026) ──
    if (action === "ews") {
      const on = ["on", "aktif", "nyalakan", "true"].includes((m.args || [])[1]?.toLowerCase());
      const off = ["off", "matikan", "stop", "false"].includes((m.args || [])[1]?.toLowerCase());
      if (!on && !off) {
        const subs = await getWatchersSafe();
        const me = subs[targetKey];
        const health = getMonitorHealth();
        const ph = health.ewsProviderHealth || {};
        const provLine = ["BMKG", "USGS", "JMA", "EMSC"].map((k) => `${k} ${ph[k]?.down ? "X" : "OK"}`).join(" | ");
        return m.reply(novaBox("Ews Peringatan Dini v2", [
          `Status  : ${me ? (me.ews === false ? "OFF (gak ikut peringatan dini)" : "ON (pengaman darurat aktif)") : "TIDAK LANGGANAN"}`,
          `Monitor : ${health.ewsRunning ? "HIDUP" : "MATI (nyalakan .disastersystemwatch on)"}`,
          `Riwayat : ${health.ewsHistoryCount ?? 0} event tercatat`,
          "---",
          { sub: "Sistem gempa (4 provider, 10 dtk)" },
          `Poll    : tiap ${health.ewsPollSec ?? 10} detik (BMKG+USGS+JMA+EMSC)`,
          `Provider: ${provLine}`,
          "BMKG down → otomatis fallback USGS/JMA/EMSC",
          `MERAH   : M${EWS_LEVELS.MERAH.minMag}+ di bawah ${EWS_LEVELS.MERAH.radiusKm} km — DARURAT`,
          `KUNING  : M${EWS_LEVELS.KUNING.minMag}+ di bawah ${EWS_LEVELS.KUNING.radiusKm} km — siaga`,
          `HIJAU   : M${EWS_LEVELS.HIJAU.minMag}+ di bawah ${EWS_LEVELS.HIJAU.radiusKm} km — info`,
          "ETA guncangan: gelombang S 3,6 km/detik",
          `Ambang  : M ${(me?.minMag) ?? DEFAULT_MIN_MAG}+ (atur: minmag <M>)`,
          "---",
          { sub: "Sistem multi-bencana (GDACS, 60 dtk)" },
          `Status  : ${health.mdEwsRunning ? "HIDUP" : "MATI"} — cek tiap ${health.mdEwsPollSec ?? 60} dtk`,
          "Jenis   : tsunami, topan, banjir, gunung api,",
          "          kekeringan, kebakaran",
          "Level MERAH/KUNING/HIJAU + instruksi",
          "penyelamatan khusus per jenis bencana",
          "---",
          "EWS bypass mode (pengaman darurat):",
          "walau mode jadwal, gempa dekat tetap realtime.",
          "Jarak & ETA dari .disastersystemwatch lokasi <kota>",
          "---",
          "Perintah: .disastersystemwatch ews on/off",
          "Tes paksa: .disastersystemwatch test",
        ]));
      }
      try {
        const sub = setWatcherEws(targetKey, on);
        return m.reply(novaSuccess("Bencana Watch", `peringatan dini gempa (EWS) ${on ? "AKTIF — kamu bakal diberi tau dalam hitungan detik pas gempa M${EWS_MIN_MAG}+ dekat lokasimu" : "NONAKTIF — gempa dekat gak bakal EWS-nya (alert bencana normal tetap jalan)"}`));
      } catch (e) {
        return m.reply(novaError("Bencana Watch", e.message));
      }
    }

    // ── Provider EWS per subscriber ──
    if (action === "provider") {
      const wanted = (m.args || []).slice(1);
      if (!wanted.length) {
        const subs = await getWatchersSafe();
        const me = subs[targetKey];
        return m.reply(novaBox("Provider Ews", [
          `Filter  : ${Array.isArray(me?.provider) && me.provider.length ? me.provider.join(", ").toUpperCase() : "SEMUA (bmkg, usgs, jepang, global)"}`,
          "---",
          "Pilihan provider:",
          "bmkg — Indonesia (autogempa BMKG)",
          "usgs — global (USGS 4.5+ day)",
          "jepang — JMA (gempa Jepang)",
          "global — EMSC (agregasi semua agensi,",
          "termasuk gempa China)",
          "---",
          "Contoh: .disastersystemwatch provider bmkg jepang",
          "Reset semua: .disastersystemwatch provider all",
        ]));
      }
      try {
        const sub = setWatcherProvider(targetKey, wanted);
        return m.reply(novaSuccess("Bencana Watch", `filter provider EWS: ${Array.isArray(sub.provider) && sub.provider.length ? sub.provider.join(", ").toUpperCase() : "SEMUA"}`));
      } catch (e) {
        return m.reply(novaError("Bencana Watch", e.message));
      }
    }

    // ── Riwayat event EWS (ala script !history) ──
    if (action === "riwayat") {
      const hist = getEwsHistory(10);
      if (!hist.length) {
        return m.reply(novaBox("Riwayat Ews", [
          "Belum ada event EWS tercatat.",
          "Riwayat keisi begitu ada gempa M" + EWS_MIN_MAG + "+ baru",
          "yang lolos filter subscriber.",
        ]));
      }
      const lines = ["Event peringatan dini terakhir:", ""];
      hist.forEach((h, i) => {
        lines.push(`${i + 1}. [${h.provider}] M${h.mag} — ${h.wilayah}`);
        lines.push(`   🕐 ${h.waktu}${h.terkirim ? ` → ${h.terkirim} chat` : ""}`);
      });
      return m.reply(novaBox("Riwayat Ews", lines));
    }

    if (action === "status" || action === "") {
      const subs = await getWatchersSafe();
      const me = subs[targetKey];
      const active = me
        ? `AKTIF sejak ${me.since.slice(0, 10)}`
        : "TIDAK AKTIF di chat ini";
      const lines = [
        `Status  : ${active}`,
        `Total   : ${Object.keys(subs).length} langganan`,
        `Sumber  : ${Array.isArray(me?.sumber) && me.sumber.length ? me.sumber.join(", ").toUpperCase() + " (filter)" : "BMKG, USGS, GDACS"}`,
        `Mode    : ${me?.mode || "otomatis"}`,
        `Kirim   : ${me?.kirim || "utama"}${(me?.kirim || "utama") === "utama" ? " — 1 info terpenting per pembaruan" : " — semua info, cooldown 10 mnt"}`,
      ];
      if ((me?.mode || "otomatis") === "jadwal") {
        lines.push(`Jadwal  : ${(Array.isArray(me.schedules) && me.schedules.length) ? me.schedules.join(", ") : "belum ada — .disastersystemwatch jadwal add 07:00"}`);
      }
      if (Array.isArray(me?.jenis) && me.jenis.length) {
        lines.push(`Jenis   : ${me.jenis.join(", ")} (filter aktif)`);
      }
      if (isDm && hasGlobalWatcher(m.sender)) {
        lines.push(`Global  : AKTIF — DM + semua grup (off: .disastersystemwatch offglobal)`);
      }
      if (me?.city) {
        lines.push("---");
        lines.push(`Lokasi  : ${me.city}${me.detail ? ` (${me.detail})` : ""}`);
        lines.push(`Radius  : ${me.radius || 300} km — peringatan wilayah aktif`);
        lines.push(`MinMag  : M ${me.minMag ?? DEFAULT_MIN_MAG}+ — gempa di bawah ini dilewati`);
        const prEntries = Object.entries(me.params || {}).filter(([, v]) => Object.keys(v || {}).length);
        if (prEntries.length) {
          lines.push(`Param   : ${prEntries.map(([k2, v2]) => `${k2} (${Object.entries(v2).map(([a, b]) => `${a}=${b}`).join(", ")})`).join(" · ")}`);
        }
      } else if (me) {
        lines.push("---");
        lines.push("Lokasi  : belum di-set (alert umum saja)");
        lines.push("Set     : .disastersystemwatch lokasi <nama kota>");
      }
      if (!me && !(isDm && hasGlobalWatcher(m.sender))) lines.push("---", "Aktifkan dengan .disastersystemwatch on");

      // ── FIX OWNER 2026-09-07: kesehatan monitor — biar kelihatan jelas
      // kalau bot beneran mantau (bukan mati), report owner "aktifin tapi
      // gak masuk info bencananya" — cek monitor jalan/gak + kapan terakhir
      // cek tiap sumber, plus penegasan ini FITUR REALTIME (bencana BARU
      // sejak aktif), bukan daftar bencana yang lagi terjadi sekarang.
      const health = getMonitorHealth();
      lines.push(`Ews     : ${me ? (me.ews === false ? "OFF" : "ON (pengaman darurat)") : "-"}${Array.isArray(me?.provider) && me.provider.length ? " — provider: " + me.provider.join(", ").toUpperCase() : ""}`);
      lines.push("---");
      lines.push(`Monitor : ${health.running ? "HIDUP — sedang mantau" : "MATI (belum ada subscriber)"}`);
      lines.push(`Cek EWS  : tiap ${health.ewsPollSec ?? 10}s (4 provider: BMKG, USGS, JMA, EMSC)`);
      lines.push(`Cek BMKG  : tiap ${health.pollBmkgSec}s${health.bmkgLastCheck ? `, terakhir ${new Date(health.bmkgLastCheck).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}` : ", belum pernah"}`);
      lines.push(`Cek Global: tiap ${health.pollGlobalSec}s (USGS + GDACS)`);
      lines.push("---");
      lines.push("PENTING: ini alert REALTIME — cuma kirim bencana BARU");
      lines.push("sejak diaktifkan, bukan daftar bencana yang lagi");
      lines.push("terjadi sekarang. Kalau belum ada kejadian baru yang");
      lines.push("cocok kriteria (gempa M5+ alert/M6+, GDACS Siaga/Awas), ya");
      lines.push("emang belum ada pesan masuk — itu normal, bukan error.");
      lines.push(`Mau lihat kondisi TERKINI sekarang? Pakai: .disaster`);
      lines.push("---");
      lines.push("Semua pengaturan bisa diubah gampang");
      lines.push("lewat popup tombol: .disastersystemwatch atur");
      return m.reply(novaBox("Bencana Watch", lines));
    }

    // ── FIX OWNER 2026-09-07: guide jelas & terstruktur (bukan 1 paragraf
    // panjang smallcaps yang susah dibaca) — report owner "settingan ribet,
    // tolong guide-nya yang jelas cara aktifin opsi tertentu". ──
    if (action === "guide") {
      // Semua baris dijaga pendek biar gak kena wrap aneh.
      return m.reply(novaBox("Bencana Watch — Guide", [
        "Semua command diawali .disastersystemwatch",
        "---",
        { sub: "Cara paling gampang" },
        "• atur → popup SEMUA pengaturan",
        "  (mode, sumber, jenis, lokasi, dll)",
        "---",
        { sub: "1. Aktifkan" },
        "• on → grup: aktif langsung",
        "        DM: muncul tombol pilihan",
        "• onglobal → DM + semua grup",
        "• off / offglobal → matikan",
        "---",
        { sub: "2. Peringatan dini (EWS)" },
        "• ews → status pengaman darurat",
        "• ews on/off → gempa M4.5+ dikirim",
        "  DETIK itu juga (bypass mode),",
        "  lengkap jarak + estimasi guncangan",
        "• provider bmkg/usgs/jepang/global/all",
        "• riwayat → event EWS terakhir",
        "---",
        { sub: "3. Atur selera (opsional)" },
        "• mode otomatis / jadwal / darurat",
        "• sumber bmkg (Indonesia saja)",
        "• jenis gempa (jenis tertentu)",
        "• lokasi Palu (peringatan wilayah +",
        "  gempa dekat langsung muncul)",
        "• radius 500 (jarak dari lokasi — gede =",
        "  lokasi lain juga kehitung dekat)",
        "• kirim utama (anti-spam)",
        "---",
        { sub: "3. Cek" },
        "• status → langganan + monitor",
        "---",
        "Catatan: alert REALTIME — cuma bencana",
        "BARU sejak aktif, bukan daftar bencana",
        "yang lagi terjadi (itu: .disaster).",
      ]));
    }

    return m.reply(novaBox("Bencana Watch", [
      "Command gak dikenali.",
      "---",
      "• atur   → popup semua pengaturan",
      "• status → cek langganan kamu",
      "• guide  → cara pakai lengkap",
    ]));
  } catch (err) {
    console.error("[bencanawatch]", err);
    await m.react("❌");
    return m.reply(novaError("Bencana Watch"));
  }
}

export { pluginConfig as config, handler };
