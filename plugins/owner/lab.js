// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// 🔬 .LAB — Pusat kendali Laboratorium Fitur Eksperimen (owner only)
// Fitur bertanda config.experimental hanya jalan kalau eksperimennya
// dinyalakan dari sini. Kontrak: test/lab-e2e/e2e.mjs.

import { getDatabase } from '../../src/lib/rara-database.js'
import {
  EXPERIMENTS, getLabData, isLabOn, setLab,
} from '../../src/lib/rara-lab.js'
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  command: "lab",
  alias: ["lab", "laboratorium", "eksperimen"],
  category: "owner",
  description: "Kendali fitur eksperimen: on/off per-chat atau global + telemetry",
  usage: '.lab — panduan lab\n.lab list — daftar eksperimen + status\n.lab on <key> — nyalakan di chat ini\n.lab off <key> — matikan di chat ini\n.lab global <key> — nyalakan untuk semua chat\n.lab status <key> — telemetry detail',
  example: '.lab list\n.lab global botmood\n.lab status botmood',
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
}

const fmtDate = (ts) => ts ? new Date(ts).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "—";

function usageCard() {
  return raraWrap("Lab", [
    "🔬 *LABORATORIUM FITUR EKSPERIMEN*",
    "",
    "Tempat uji fitur baru sebelum dianggap stabil. Fitur eksperimen hanya jalan kalau dinyalakan dari sini.",
    "",
    "ᯓ .lab list — daftar eksperimen + status",
    "ᯓ .lab on <key> — nyalakan di chat ini",
    "ᯓ .lab off <key> — matikan di chat ini",
    "ᯓ .lab global <key> — nyalakan semua chat",
    "ᯓ .lab status <key> — telemetry detail",
  ]);
}

function listCard(db, chat) {
  const d = getLabData(db);
  const lines = ["🔬 Eksperimen terdaftar:", ""];
  for (const [key, e] of Object.entries(d.experiments || {})) {
    const on = isLabOn(db, key, chat);
    const tm = d.telemetry?.[key];
    const stats = tm ? ` (run ${tm.runs}×, error ${tm.errors})` : "";
    const state = tm?.autoDisabled ? "⛔ AUTO-MATIK" : (d.on?.global?.[key] ? "🌍 GLOBAL" : (on ? "✅ NYALA" : "❌ MATI"));
    lines.push(`ᯓ ${e.icon || "🔬"} *${key}* — ${e.name}`);
    lines.push(`${e.desc}`);
    lines.push(`Status: ${state}${stats}`);
    lines.push("");
  }
  lines.push(`Aktifkan dengan *.lab on <key>* (chat ini) atau *.lab global <key>*.`);
  return raraWrap("Lab Eksperimen", lines);
}

function statusCard(db, chat, key) {
  const d = getLabData(db);
  const e = d.experiments?.[key] || EXPERIMENTS[key];
  if (!e) return null;
  const tm = d.telemetry?.[key] || { runs: 0, errors: 0, consecErrors: 0 };
  const successRate = tm.runs ? Math.round(((tm.runs - tm.errors) / tm.runs) * 100) : 100;
  const state = tm.autoDisabled ? "⛔ AUTO-MATIK (error beruntun)"
    : (d.on?.global?.[key] ? "🌍 Global nyala" : (isLabOn(db, key, chat) ? "✅ Nyala di chat ini" : "❌ Mati"));
  return raraWrap("Lab Eksperimen", [
    `🔬 *${key}* — ${e.name}`,
    "",
    `Status: ${state}`,
    `Total run: ${tm.runs}`,
    `Error: ${tm.errors} (sukses ${successRate}%)`,
    `Error beruntun terakhir: ${tm.consecErrors || 0}`,
    `Error terakhir: ${tm.lastError || "—"}`,
    `Run terakhir: ${fmtDate(tm.lastRunAt)}`,
    tm.autoDisabledReason ? `Alasan auto-matik: ${tm.autoDisabledReason}` : "",
  ]);
}

async function handler(m, extra) {
  const db = (extra && extra.db) || getDatabase();
  if (!(m.isOwner || (extra && extra.isOwner))) {
    return m.reply(raraWrap("Lab", [
      "🚫 *.lab* khusus owner.",
      "",
      "Fitur eksperimen hanya bisa dikendalikan oleh owner bot.",
    ], "error"));
  }

  const rawArgs = (extra && Array.isArray(extra.args) && extra.args.length)
    ? extra.args
    : (m.args || String(m.text || "").trim().split(/\s+/).slice(1));
  const args = (rawArgs || []).filter(Boolean);
  const cmd = (args[0] || "").toLowerCase();

  // tanpa arg → panduan
  if (!cmd) return m.reply(usageCard());

  if (cmd === "list" || cmd === "daftar") return m.reply(listCard(db, m.chat));

  if (["on", "off", "global", "unglobal", "status"].includes(cmd)) {
    const key = (args[1] || "").toLowerCase();
    if (!key) {
      return m.reply(raraWrap("Lab", [
        "❗ Key eksperimen gak boleh kosong.",
        "",
        `Format: *.lab ${cmd} <key>* — daftar key di *.lab list*.`,
      ], "error"));
    }
    if (!EXPERIMENTS[key]) {
      return m.reply(raraWrap("Lab", [
        `❗ Eksperimen *${key}* gak dikenal.`,
        "",
        "Cek nama yang benar di *.lab list*.",
      ], "error"));
    }
    const def = EXPERIMENTS[key];

    if (cmd === "on") {
      setLab(db, key, true, { chat: m.chat });
      return m.reply(raraWrap("Lab", [
        `✅ Eksperimen *${def.name}* DINYALAKAN di chat ini.`,
        "",
        `Key: ${key} — coba jalankan fiturnya sekarang.`,
      ], "success"));
    }
    if (cmd === "off") {
      setLab(db, key, false, { chat: m.chat });
      return m.reply(raraWrap("Lab", [
        `✅ Eksperimen *${def.name}* DIMATIKAN di chat ini.`,
        "",
        `Key: ${key} — nyala lagi dengan *.lab on ${key}*.`,
      ], "success"));
    }
    if (cmd === "global") {
      setLab(db, key, true, { global: true });
      return m.reply(raraWrap("Lab", [
        `🌍 Eksperimen *${def.name}* DINYALAKAN GLOBAL (semua chat).`,
        "",
        `Key: ${key} — matikan dengan *.lab unglobal ${key}*.`,
      ], "success"));
    }
    if (cmd === "unglobal") {
      setLab(db, key, false, { global: true });
      return m.reply(raraWrap("Lab", [
        `✅ Eksperimen *${def.name}* dimatikan global.`,
        "",
        `Key: ${key} — chat yang nyala per-chat tetap nyala.`,
      ], "success"));
    }
    if (cmd === "status") {
      const card = statusCard(db, m.chat, key);
      if (card) return m.reply(card);
    }
  }

  // argumen nyasar → panduan (gak throw)
  return m.reply(usageCard());
}

export default { config: pluginConfig, handler };
