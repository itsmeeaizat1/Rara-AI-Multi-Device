// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// 🔬 LABORATORIUM FITUR EKSPERIMEN (10 Okt 2026, request owner:
// "buatkan eksperiment fitur yang mungkin belum ada")
//
// Plugin bertanda config.experimental = "<key>" hanya dieksekusi kalau
// eksperimennya DINYALAKAN (per-chat atau global) lewat .lab (owner only).
// Semua run dicatat: sukses/gagal/error beruntun — 5 error beruntun =
// eksperimen auto-matikan + alasan tersimpan (owner bisa paksa nyala lagi).
// Kontrak: test/lab-e2e/e2e.mjs (22 skenario, ditulis SEBELUM implementasi).

import { raraWrap } from "./rara-menu-style.js";

// Registry eksperimen — eksperimen baru didaftarkan di sini
export const EXPERIMENTS = {
  botmood: {
    name: "Mood Bot",
    desc: "Mood bot dari telemetry nyata: uptime, antrean kirim, error terakhir",
    icon: "🔬",
  },
};

const AUTO_DISABLE_THRESHOLD = 5; // error beruntun sebelum auto-matikan

export function getLabData(db) {
  let data = db.setting("lab");
  if (!data || !data.experiments) {
    data = {
      experiments: {},
      on: { global: {}, chats: {} },
      telemetry: {},
    };
    for (const [key, def] of Object.entries(EXPERIMENTS)) {
      data.experiments[key] = { ...def, key, active: false };
    }
    db.setting("lab", data);
  }
  return data;
}

// Eksperimen nyala kalau: global ON, atau chat ini ON.
// Auto-matikan (telemetry) selalu menang atas keduanya.
export function isLabOn(db, key, chat) {
  const d = getLabData(db);
  if (d.telemetry?.[key]?.autoDisabled) return false;
  if (d.on?.global?.[key]) return true;
  return !!(d.on?.chats?.[chat]?.[key]);
}

// setLab(db, key, true|false, { chat, global })
// Key gak dikenal → return false (gak throw).
// Menyalakan ulang melepas auto-matikan (owner override).
export function setLab(db, key, on, opts = {}) {
  const d = getLabData(db);
  if (!EXPERIMENTS[key]) return false;
  if (opts.global) {
    d.on.global[key] = on ? true : false;
    if (!on) delete d.on.global[key];
  } else if (opts.chat) {
    if (!d.on.chats[opts.chat]) d.on.chats[opts.chat] = {};
    if (on) d.on.chats[opts.chat][key] = true;
    else delete d.on.chats[opts.chat][key];
    if (!Object.keys(d.on.chats[opts.chat]).length) delete d.on.chats[opts.chat];
  } else {
    return false;
  }
  if (on && d.telemetry?.[key]?.autoDisabled) {
    d.telemetry[key].autoDisabled = false;
    d.telemetry[key].autoDisabledReason = null;
    d.telemetry[key].consecErrors = 0;
  }
  db.setting("lab", d);
  return true;
}

// Catat 1 run eksperimen. ok=false menaikkan consecErrors; sukses me-reset-nya.
// consecErrors >= 5 → autoDisabled + alasan.
export function recordLabRun(db, key, ok, errMsg = null) {
  const d = getLabData(db);
  if (!EXPERIMENTS[key]) return null;
  if (!d.telemetry[key]) {
    d.telemetry[key] = {
      runs: 0, errors: 0, consecErrors: 0,
      lastError: null, lastRunAt: null,
      autoDisabled: false, autoDisabledReason: null,
    };
  }
  const tm = d.telemetry[key];
  tm.runs += 1;
  tm.lastRunAt = Date.now();
  if (ok) {
    tm.consecErrors = 0;
  } else {
    tm.errors += 1;
    tm.consecErrors += 1;
    tm.lastError = errMsg || "unknown error";
    if (tm.consecErrors >= AUTO_DISABLE_THRESHOLD) {
      tm.autoDisabled = true;
      tm.autoDisabledReason =
        `Auto-matikan: ${AUTO_DISABLE_THRESHOLD} error beruntun (terakhir: ${tm.lastError})`;
      tm.consecErrors = 0;
    }
  }
  db.setting("lab", d);
  return tm;
}

// Gate handler: plugin experimental MATI → kirim kartu Lab 🔬 + return false
// (handler plugin GAK dieksekusi). NYALA → return true, eksekusi lanjut.
export async function handleLabGate(db, plugin, m, sock) {
  const key = plugin?.config?.experimental;
  if (!key) return true;
  if (isLabOn(db, key, m.chat)) return true;

  const d = getLabData(db);
  const tm = d.telemetry?.[key];
  const def = EXPERIMENTS[key] || { name: key, desc: "" };

  if (!m.isNewsletter) {
    try { await m.react("🔬"); } catch {}
    if (tm?.autoDisabled) {
      await m.reply(raraWrap("Lab Eksperimen", [
        `🔬 Fitur *${def.name}* sedang DIMATIKAN OTOMATIS.`,
        "",
        `Alasan: ${tm.autoDisabledReason || "error berulang"}`,
        "",
        `Owner bisa menyalakan ulang dengan *.lab global ${key}*.`,
      ]));
    } else {
      await m.reply(raraWrap("Lab Eksperimen", [
        `🔬 Fitur *${def.name}* masih dalam uji coba.`,
        "",
        def.desc ? `Perihal: ${def.desc}` : "",
        "",
        `Eksperimen ini belum dinyalakan di chat ini. Minta owner menjalankan *.lab on ${key}* atau *.lab global ${key}*.`,
      ]));
    }
  }
  return false;
}
