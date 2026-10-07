// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// cpanelprotect.js — Proteksi cpanel (owner 7 Okt 2026):
// ".cpanelprotect on aktif, .cpanelprotect settings buat cek mau apa aja
// fitur protect yg diaktifin" — owner only, master + toggle per aksi.
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import {
  PROTECT_FEATURES,
  FEATURE_LABEL,
  isFeatureName,
  setMaster,
  setFeature,
  setAllFeatures,
  protectStatus,
} from "../../src/lib/rara-cpanel-protect.js";

const pluginConfig = {
  name: "cpanelprotect",
  alias: ["panelprotect", "protectcpanel"],
  category: "panel",
  description: "Proteksi cpanel: blokir create/delete/power/upload (owner only)",
  usage: ".cpanelprotect on/off | settings | <fitur> on/off",
  example: ".cpanelprotect on | .cpanelprotect settings | .cpanelprotect create off",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function buildSettings(m) {
  const st = protectStatus();
  const p = m.prefix || ".";
  let txt = `🛡️ CPANEL PROTECT\n\n`;
  txt += `Status: ${st.master ? "🟢 AKTIF" : "🔴 MATI"} (master)\n\n`;
  txt += `Fitur protect:\n`;
  for (const f of PROTECT_FEATURES) {
    const nyala = st.master && st.features[f];
    txt += `${nyala ? "✅" : "⛔"} ${FEATURE_LABEL[f]}\n`;
  }
  txt += `\nTotal aktif: ${st.activeFeatures.length}/${PROTECT_FEATURES.length}\n\n`;
  txt += `Cara pakai:\n`;
  txt += `${p}cpanelprotect on/off — nyalakan/matikan semua proteksi\n`;
  txt += `${p}cpanelprotect <fitur> on/off — toggle per aksi\n`;
  txt += `  (fitur: ${PROTECT_FEATURES.join(", ")})\n`;
  txt += `${p}cpanelprotect all on/off — set semua fitur sekaligus\n`;
  txt += `${p}cpanelprotect settings — lihat status (command ini)\n\n`;
  txt += `Owner bot selalu bypass semua proteksi.`;
  return raraWrap("cpanelprotect", txt);
}

async function handler(m) {
  if (!m.isOwner) {
    return m.reply(raraWrap("cpanelprotect", `Fitur ini hanya untuk owner bot.`));
  }
  const args = m.args || (m.text || "").trim().split(/\s+/).filter(Boolean);
  const sub = String(args[0] || "").toLowerCase();
  const p = m.prefix || ".";

  // tanpa arg / settings → status
  if (!sub || sub === "settings" || sub === "status" || sub === "cek") {
    return m.reply(buildSettings(m));
  }

  // master on/off
  if (sub === "on" || sub === "off") {
    setMaster(sub === "on");
    const st = protectStatus();
    return m.reply(
      sub === "on"
        ? `Proteksi cpanel diaktifkan 🟢\n\n${st.activeFeatures.length} fitur aktif — cek detail: ${p}cpanelprotect settings`
        : `Proteksi cpanel dimatikan 🔴\n\nSemua aksi panel kembali normal.`
    );
  }

  // <fitur> on/off | all on/off
  const target = sub;
  const action = String(args[1] || "").toLowerCase();
  if (action !== "on" && action !== "off") {
    return m.reply(raraWrap("cpanelprotect", `Format salah.\n\n${p}cpanelprotect <fitur> on/off\nFitur: ${PROTECT_FEATURES.join(", ")}\n\nContoh: ${p}cpanelprotect create off\n\nCek status: ${p}cpanelprotect settings`));
  }
  if (target === "all") {
    setAllFeatures(action === "on");
    return m.reply(`Semua fitur proteksi ${action === "on" ? "diaktifkan ✅" : "dimatikan ⛔"}.\n\nCek detail: ${p}cpanelprotect settings`);
  }
  if (!isFeatureName(target)) {
    return m.reply(raraWrap("cpanelprotect", `Fitur "${target}" gak dikenal.\n\nFitur yang tersedia: ${PROTECT_FEATURES.join(", ")}\n\nCek status: ${p}cpanelprotect settings`));
  }
  setFeature(target, action === "on");
  return m.reply(`Proteksi ${target} ${action === "on" ? "diaktifkan ✅" : "dimatikan ⛔"}.\n\nCek semua: ${p}cpanelprotect settings`);
}

export { handler, pluginConfig, buildSettings };

export default handler;
